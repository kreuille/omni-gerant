// BUSINESS RULE [CDC-2.1]: E-Reporting — B2C et international au PPF
// BUSINESS RULE [R02]: Montants en centimes
// BUSINESS RULE [R03]: Multi-tenant

import type { Result, PaginatedResult } from '@omni-gerant/shared';
import { ok, err, notFound, validationError } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';

// --- Types ---

export type EReportingType = 'b2c' | 'international_sale' | 'international_purchase';

export interface EReportingEntry {
  id: string;
  tenantId: string;
  type: EReportingType;
  sourceInvoiceId?: string;
  date: Date;
  amountHtCents: number;
  tvaCents: number;
  tvaRate: number;
  customerCountry: string;
  reportedToPPF: boolean;
  ppfReportId?: string;
  reportedAt?: Date;
  reportingPeriod: string;      // 'YYYY-MM'
}

export interface EReportingListQuery {
  cursor?: string;
  limit: number;
  type?: EReportingType;
  period?: string;
  reported?: boolean;
}

// --- PPF Directory ---

export interface PPFDirectoryEntry {
  siret: string;
  companyName: string;
  registeredOnPPF: boolean;
  pdpProvider?: string;
  acceptedFormats: ('facturx' | 'ubl' | 'cii')[];
  lastUpdated: Date;
}

// --- Compliance Dashboard ---

export interface ComplianceDashboard {
  overallStatus: 'compliant' | 'action_required' | 'not_ready';
  checks: {
    facturxEmission: boolean;
    facturxReception: boolean;
    ppfConnected: boolean;
    nf525Active: boolean;
    eReportingConfigured: boolean;
  };
  deadlines: ComplianceDeadline[];
  stats: {
    invoicesSentViaPPF: number;
    invoicesReceivedViaPPF: number;
    eReportingEntriesPending: number;
    chainIntegrityLastCheck?: Date;
    chainIntegrityStatus?: 'ok' | 'error';
  };
}

export interface ComplianceDeadline {
  date: Date;
  obligation: string;
  applicable: boolean;
  status: 'done' | 'in_progress' | 'not_started';
}

// --- Repositories ---

export interface EReportingRepository {
  create(entry: Omit<EReportingEntry, 'id'>): Promise<EReportingEntry>;
  findByPeriodAndType(tenantId: string, period: string, type?: EReportingType): Promise<EReportingEntry[]>;
  findByInvoiceId(tenantId: string, invoiceId: string): Promise<EReportingEntry | null>;
  markReported(id: string, tenantId: string, ppfReportId: string): Promise<EReportingEntry | null>;
  list(tenantId: string, query: EReportingListQuery): Promise<{ items: EReportingEntry[]; next_cursor: string | null; has_more: boolean }>;
  countPending(tenantId: string): Promise<number>;
}

export interface PPFDirectoryRepository {
  lookup(siret: string): Promise<PPFDirectoryEntry | null>;
  save(entry: PPFDirectoryEntry): Promise<void>;
}

// --- Invoice data for e-reporting detection ---

export interface InvoiceForEReporting {
  id: string;
  tenantId: string;
  issueDate: Date;
  totalHtCents: number;
  totalTvaCents: number;
  tvaRate: number;
  clientSiret?: string;
  clientCountry: string;
  type: string; // 'standard' | 'credit_note' etc.
}

// --- Helpers ---

function getReportingPeriod(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// BUSINESS RULE [CDC-2.1]: Detection automatique du type d'e-reporting
function detectEReportingType(invoice: InvoiceForEReporting): EReportingType | null {
  // B2C: no SIRET on client and France
  if ((!invoice.clientSiret || invoice.clientSiret === '') && invoice.clientCountry === 'FR') {
    return 'b2c';
  }

  // International sale: client country != FR
  if (invoice.clientCountry !== 'FR' && invoice.type !== 'credit_note') {
    return 'international_sale';
  }

  // Not e-reporting (B2B domestic — handled by standard e-invoicing)
  return null;
}

// --- Service ---

export function createEReportingService(repo: EReportingRepository) {
  // BUSINESS RULE [CDC-2.1]: Generer les entrees e-reporting pour une facture
  async function generateForInvoice(
    invoice: InvoiceForEReporting,
  ): Promise<Result<EReportingEntry | null, AppError>> {
    const type = detectEReportingType(invoice);
    if (!type) return ok(null); // Not e-reporting

    // Check if already generated
    const existing = await repo.findByInvoiceId(invoice.tenantId, invoice.id);
    if (existing) return ok(existing);

    const entry = await repo.create({
      tenantId: invoice.tenantId,
      type,
      sourceInvoiceId: invoice.id,
      date: invoice.issueDate,
      amountHtCents: invoice.totalHtCents,
      tvaCents: invoice.totalTvaCents,
      tvaRate: invoice.tvaRate,
      customerCountry: invoice.clientCountry,
      reportedToPPF: false,
      reportingPeriod: getReportingPeriod(invoice.issueDate),
    });

    return ok(entry);
  }

  // BUSINESS RULE [CDC-2.1]: Generer les entrees pour une periode
  async function generateForPeriod(
    tenantId: string,
    invoices: InvoiceForEReporting[],
  ): Promise<Result<EReportingEntry[], AppError>> {
    const entries: EReportingEntry[] = [];

    for (const invoice of invoices) {
      const result = await generateForInvoice(invoice);
      if (result.ok && result.value) {
        entries.push(result.value);
      }
    }

    return ok(entries);
  }

  // BUSINESS RULE [CDC-2.1]: Envoyer les entrees au PPF
  async function sendToPPF(
    tenantId: string,
    period: string,
  ): Promise<Result<{ sent: number; total: number }, AppError>> {
    const entries = await repo.findByPeriodAndType(tenantId, period);
    const unsent = entries.filter((e) => !e.reportedToPPF);

    let sent = 0;
    for (const entry of unsent) {
      // In production, this would call the PPF API
      const ppfReportId = `EREPORT-${entry.id}-${Date.now()}`;
      const updated = await repo.markReported(entry.id, tenantId, ppfReportId);
      if (updated) sent++;
    }

    return ok({ sent, total: entries.length });
  }

  // List entries
  async function list(
    tenantId: string,
    query: EReportingListQuery,
  ): Promise<Result<PaginatedResult<EReportingEntry>, AppError>> {
    const result = await repo.list(tenantId, {
      ...query,
      limit: query.limit ?? 20,
    });
    return ok({
      items: result.items,
      next_cursor: result.next_cursor,
      has_more: result.has_more,
    });
  }

  // Status by period
  async function getStatusByPeriod(
    tenantId: string,
    period: string,
  ): Promise<Result<{ total: number; reported: number; pending: number }, AppError>> {
    const entries = await repo.findByPeriodAndType(tenantId, period);
    const reported = entries.filter((e) => e.reportedToPPF).length;
    return ok({
      total: entries.length,
      reported,
      pending: entries.length - reported,
    });
  }

  return {
    generateForInvoice,
    generateForPeriod,
    sendToPPF,
    list,
    getStatusByPeriod,
    // Expose for testing
    _detectEReportingType: detectEReportingType,
  };
}

// --- PPF Directory Service ---

export function createPPFDirectoryService(repo: PPFDirectoryRepository) {
  async function lookup(siret: string): Promise<Result<PPFDirectoryEntry, AppError>> {
    const entry = await repo.lookup(siret);
    if (!entry) return err(notFound('PPFDirectoryEntry', siret));
    return ok(entry);
  }

  async function isRegistered(siret: string): Promise<Result<boolean, AppError>> {
    const entry = await repo.lookup(siret);
    return ok(entry?.registeredOnPPF ?? false);
  }

  async function getPreferredFormat(siret: string): Promise<Result<string, AppError>> {
    const entry = await repo.lookup(siret);
    if (!entry || !entry.registeredOnPPF) return err(notFound('PPFDirectoryEntry', siret));
    return ok(entry.acceptedFormats[0] ?? 'facturx');
  }

  return { lookup, isRegistered, getPreferredFormat };
}

// --- Compliance Dashboard Service ---

export interface ComplianceDeps {
  hasFaturxEmission: () => Promise<boolean>;
  hasFacturxReception: () => Promise<boolean>;
  isPpfConnected: () => Promise<boolean>;
  isNf525Active: () => Promise<boolean>;
  isEReportingConfigured: () => Promise<boolean>;
  getInvoicesSentViaPPF: () => Promise<number>;
  getInvoicesReceivedViaPPF: () => Promise<number>;
  getEReportingPendingCount: () => Promise<number>;
  getChainIntegrityStatus: () => Promise<{ lastCheck?: Date; status?: 'ok' | 'error' }>;
  getCompanySize: () => Promise<'large' | 'medium' | 'small' | 'micro'>;
}

export function createComplianceDashboardService(deps: ComplianceDeps) {
  async function getDashboard(): Promise<Result<ComplianceDashboard, AppError>> {
    const [
      facturxEmission,
      facturxReception,
      ppfConnected,
      nf525Active,
      eReportingConfigured,
      invoicesSentViaPPF,
      invoicesReceivedViaPPF,
      eReportingEntriesPending,
      chainIntegrity,
      companySize,
    ] = await Promise.all([
      deps.hasFaturxEmission(),
      deps.hasFacturxReception(),
      deps.isPpfConnected(),
      deps.isNf525Active(),
      deps.isEReportingConfigured(),
      deps.getInvoicesSentViaPPF(),
      deps.getInvoicesReceivedViaPPF(),
      deps.getEReportingPendingCount(),
      deps.getChainIntegrityStatus(),
      deps.getCompanySize(),
    ]);

    const checks = {
      facturxEmission,
      facturxReception,
      ppfConnected,
      nf525Active,
      eReportingConfigured,
    };

    const allChecked = Object.values(checks).every(Boolean);
    const anyChecked = Object.values(checks).some(Boolean);

    const overallStatus: ComplianceDashboard['overallStatus'] = allChecked
      ? 'compliant'
      : anyChecked
        ? 'action_required'
        : 'not_ready';

    // BUSINESS RULE [CDC-2.1]: Echeances conformite 2026 selon taille entreprise
    const deadlines = buildDeadlines(companySize, checks);

    return ok({
      overallStatus,
      checks,
      deadlines,
      stats: {
        invoicesSentViaPPF,
        invoicesReceivedViaPPF,
        eReportingEntriesPending,
        chainIntegrityLastCheck: chainIntegrity.lastCheck,
        chainIntegrityStatus: chainIntegrity.status,
      },
    });
  }

  return { getDashboard };
}

function buildDeadlines(
  size: 'large' | 'medium' | 'small' | 'micro',
  checks: ComplianceDashboard['checks'],
): ComplianceDeadline[] {
  const deadlines: ComplianceDeadline[] = [];

  // Large enterprises: Sept 2026
  // Medium: Sept 2026
  // Small/Micro: Sept 2027
  const emissionDate = (size === 'large' || size === 'medium')
    ? new Date('2026-09-01')
    : new Date('2027-09-01');

  const receptionDate = new Date('2026-09-01'); // All companies

  deadlines.push({
    date: receptionDate,
    obligation: 'Reception factures electroniques obligatoire',
    applicable: true,
    status: checks.facturxReception ? 'done' : checks.ppfConnected ? 'in_progress' : 'not_started',
  });

  deadlines.push({
    date: emissionDate,
    obligation: 'Emission factures electroniques obligatoire',
    applicable: true,
    status: checks.facturxEmission ? 'done' : checks.ppfConnected ? 'in_progress' : 'not_started',
  });

  deadlines.push({
    date: emissionDate,
    obligation: 'E-reporting B2C et international',
    applicable: true,
    status: checks.eReportingConfigured ? 'done' : 'not_started',
  });

  deadlines.push({
    date: new Date('2026-09-01'),
    obligation: 'Certification NF525 logiciel de facturation',
    applicable: true,
    status: checks.nf525Active ? 'done' : 'not_started',
  });

  return deadlines;
}
