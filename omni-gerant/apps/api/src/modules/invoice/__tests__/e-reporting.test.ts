import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createEReportingService,
  createPPFDirectoryService,
  createComplianceDashboardService,
  type EReportingRepository,
  type EReportingEntry,
  type PPFDirectoryRepository,
  type PPFDirectoryEntry,
  type InvoiceForEReporting,
  type ComplianceDeps,
} from '../e-reporting.service.js';

const TENANT_ID = 'tenant-ereport';

// --- Helpers ---

function makeInvoice(overrides: Partial<InvoiceForEReporting> = {}): InvoiceForEReporting {
  return {
    id: 'inv-001',
    tenantId: TENANT_ID,
    issueDate: new Date('2026-09-15'),
    totalHtCents: 100000,
    totalTvaCents: 20000,
    tvaRate: 20,
    clientSiret: '12345678901234',
    clientCountry: 'FR',
    type: 'standard',
    ...overrides,
  };
}

// --- Mock repos ---

function createMockEReportingRepo(): EReportingRepository {
  let autoId = 0;
  const entries: EReportingEntry[] = [];

  return {
    create: vi.fn(async (data) => {
      const entry = { ...data, id: `er-${++autoId}` } as EReportingEntry;
      entries.push(entry);
      return entry;
    }),
    findByPeriodAndType: vi.fn(async (_tenantId, period, type) => {
      return entries.filter(e =>
        e.reportingPeriod === period && (!type || e.type === type),
      );
    }),
    findByInvoiceId: vi.fn(async () => null),
    markReported: vi.fn(async (id) => {
      const entry = entries.find(e => e.id === id);
      if (!entry) return null;
      entry.reportedToPPF = true;
      entry.reportedAt = new Date();
      entry.ppfReportId = `EREPORT-${id}`;
      return entry;
    }),
    list: vi.fn(async () => ({ items: entries, next_cursor: null, has_more: false })),
    countPending: vi.fn(async () => entries.filter(e => !e.reportedToPPF).length),
  };
}

function createMockPPFDirectoryRepo(): PPFDirectoryRepository {
  const directory = new Map<string, PPFDirectoryEntry>();
  return {
    lookup: vi.fn(async (siret) => directory.get(siret) ?? null),
    save: vi.fn(async (entry) => { directory.set(entry.siret, entry); }),
    _add: (entry: PPFDirectoryEntry) => { directory.set(entry.siret, entry); },
  } as PPFDirectoryRepository & { _add: (entry: PPFDirectoryEntry) => void };
}

// --- Tests ---

describe('E-Reporting Service', () => {
  let repo: EReportingRepository;
  let service: ReturnType<typeof createEReportingService>;

  beforeEach(() => {
    repo = createMockEReportingRepo();
    service = createEReportingService(repo);
  });

  describe('B2C detection', () => {
    it('generates e-reporting for invoice without client SIRET (B2C)', async () => {
      const invoice = makeInvoice({
        clientSiret: undefined,
        clientCountry: 'FR',
      });

      const result = await service.generateForInvoice(invoice);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).not.toBeNull();
      expect(result.value!.type).toBe('b2c');
      expect(result.value!.customerCountry).toBe('FR');
      expect(result.value!.amountHtCents).toBe(100000);
    });

    it('does not generate e-reporting for B2B invoice with SIRET', async () => {
      const invoice = makeInvoice({
        clientSiret: '12345678901234',
        clientCountry: 'FR',
      });

      const result = await service.generateForInvoice(invoice);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toBeNull();
    });
  });

  describe('International detection', () => {
    it('generates e-reporting for international sale (country != FR)', async () => {
      const invoice = makeInvoice({
        clientSiret: 'DE123456789',
        clientCountry: 'DE',
      });

      const result = await service.generateForInvoice(invoice);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).not.toBeNull();
      expect(result.value!.type).toBe('international_sale');
      expect(result.value!.customerCountry).toBe('DE');
    });
  });

  describe('Period grouping', () => {
    it('groups entries by monthly reporting period', async () => {
      const invoices = [
        makeInvoice({ id: 'inv-sep1', issueDate: new Date('2026-09-05'), clientSiret: undefined }),
        makeInvoice({ id: 'inv-sep2', issueDate: new Date('2026-09-20'), clientSiret: undefined }),
        makeInvoice({ id: 'inv-oct1', issueDate: new Date('2026-10-03'), clientSiret: undefined }),
      ];

      const result = await service.generateForPeriod(TENANT_ID, invoices);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value).toHaveLength(3);
      const periods = result.value.map(e => e.reportingPeriod);
      expect(periods.filter(p => p === '2026-09')).toHaveLength(2);
      expect(periods.filter(p => p === '2026-10')).toHaveLength(1);
    });
  });

  describe('PPF sending', () => {
    it('sends unsent entries for a period', async () => {
      // Generate some entries
      await service.generateForInvoice(makeInvoice({
        id: 'inv-s1',
        issueDate: new Date('2026-09-01'),
        clientSiret: undefined,
      }));
      await service.generateForInvoice(makeInvoice({
        id: 'inv-s2',
        issueDate: new Date('2026-09-15'),
        clientSiret: undefined,
      }));

      const result = await service.sendToPPF(TENANT_ID, '2026-09');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.sent).toBe(2);
      expect(result.value.total).toBe(2);
    });
  });

  describe('Status by period', () => {
    it('returns correct counts', async () => {
      await service.generateForInvoice(makeInvoice({
        id: 'inv-st1',
        issueDate: new Date('2026-09-01'),
        clientSiret: undefined,
      }));

      const result = await service.getStatusByPeriod(TENANT_ID, '2026-09');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.total).toBe(1);
      expect(result.value.pending).toBe(1);
      expect(result.value.reported).toBe(0);
    });
  });
});

describe('PPF Directory Service', () => {
  let repo: PPFDirectoryRepository & { _add: (entry: PPFDirectoryEntry) => void };
  let service: ReturnType<typeof createPPFDirectoryService>;

  beforeEach(() => {
    repo = createMockPPFDirectoryRepo() as PPFDirectoryRepository & { _add: (entry: PPFDirectoryEntry) => void };
    service = createPPFDirectoryService(repo);
  });

  it('looks up SIRET and returns PDP info and formats', async () => {
    repo._add({
      siret: '12345678901234',
      companyName: 'Test SARL',
      registeredOnPPF: true,
      pdpProvider: 'Chorus Pro',
      acceptedFormats: ['facturx', 'ubl'],
      lastUpdated: new Date(),
    });

    const result = await service.lookup('12345678901234');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.companyName).toBe('Test SARL');
    expect(result.value.registeredOnPPF).toBe(true);
    expect(result.value.pdpProvider).toBe('Chorus Pro');
    expect(result.value.acceptedFormats).toContain('facturx');
  });

  it('returns not found for unknown SIRET', async () => {
    const result = await service.lookup('99999999999999');
    expect(result.ok).toBe(false);
  });

  it('checks registration status', async () => {
    repo._add({
      siret: '11111111111111',
      companyName: 'Registered Co',
      registeredOnPPF: true,
      acceptedFormats: ['facturx'],
      lastUpdated: new Date(),
    });

    const result = await service.isRegistered('11111111111111');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(true);

    const result2 = await service.isRegistered('00000000000000');
    expect(result2.ok).toBe(true);
    if (!result2.ok) return;
    expect(result2.value).toBe(false);
  });
});

describe('Compliance Dashboard Service', () => {
  function createMockDeps(overrides: Partial<ComplianceDeps> = {}): ComplianceDeps {
    return {
      hasFaturxEmission: vi.fn(async () => true),
      hasFacturxReception: vi.fn(async () => true),
      isPpfConnected: vi.fn(async () => true),
      isNf525Active: vi.fn(async () => true),
      isEReportingConfigured: vi.fn(async () => true),
      getInvoicesSentViaPPF: vi.fn(async () => 42),
      getInvoicesReceivedViaPPF: vi.fn(async () => 15),
      getEReportingPendingCount: vi.fn(async () => 3),
      getChainIntegrityStatus: vi.fn(async () => ({ lastCheck: new Date(), status: 'ok' as const })),
      getCompanySize: vi.fn(async () => 'small' as const),
      ...overrides,
    };
  }

  it('returns compliant when all checks pass', async () => {
    const deps = createMockDeps();
    const service = createComplianceDashboardService(deps);

    const result = await service.getDashboard();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.overallStatus).toBe('compliant');
    expect(result.value.checks.facturxEmission).toBe(true);
    expect(result.value.checks.facturxReception).toBe(true);
    expect(result.value.checks.ppfConnected).toBe(true);
    expect(result.value.checks.nf525Active).toBe(true);
    expect(result.value.checks.eReportingConfigured).toBe(true);
  });

  it('returns action_required when some checks fail', async () => {
    const deps = createMockDeps({
      hasFaturxEmission: vi.fn(async () => true),
      isEReportingConfigured: vi.fn(async () => false),
    });
    const service = createComplianceDashboardService(deps);

    const result = await service.getDashboard();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.overallStatus).toBe('action_required');
  });

  it('returns not_ready when no checks pass', async () => {
    const deps = createMockDeps({
      hasFaturxEmission: vi.fn(async () => false),
      hasFacturxReception: vi.fn(async () => false),
      isPpfConnected: vi.fn(async () => false),
      isNf525Active: vi.fn(async () => false),
      isEReportingConfigured: vi.fn(async () => false),
    });
    const service = createComplianceDashboardService(deps);

    const result = await service.getDashboard();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.overallStatus).toBe('not_ready');
  });

  it('calculates deadlines based on company size', async () => {
    const deps = createMockDeps({
      getCompanySize: vi.fn(async () => 'large' as const),
    });
    const service = createComplianceDashboardService(deps);

    const result = await service.getDashboard();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.deadlines.length).toBeGreaterThan(0);
    const emissionDeadline = result.value.deadlines.find(d => d.obligation.includes('Emission'));
    expect(emissionDeadline).toBeDefined();
    // Large enterprises: Sept 2026
    expect(emissionDeadline!.date.getFullYear()).toBe(2026);
  });

  it('includes statistics in dashboard', async () => {
    const deps = createMockDeps();
    const service = createComplianceDashboardService(deps);

    const result = await service.getDashboard();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.stats.invoicesSentViaPPF).toBe(42);
    expect(result.value.stats.invoicesReceivedViaPPF).toBe(15);
    expect(result.value.stats.eReportingEntriesPending).toBe(3);
    expect(result.value.stats.chainIntegrityStatus).toBe('ok');
  });
});
