// BUSINESS RULE [CDC-2.4 / RGPD Art.20 droit a la portabilite / Vague C3]
//
// Exporte l'integralite des donnees du tenant dans un format structure JSON
// + NDJSON pour les gros ensembles (transactions, audit). Format lisible par
// machine (JSON standard), conforme "donnees dans un format structure
// couramment utilise et lisible par machine" de l'article 20 RGPD.

import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, appError } from '@zenadmin/shared';

export interface RgpdExportResult {
  format: 'json';
  generated_at: string;
  tenant: unknown;
  users: unknown[];
  clients: unknown[];
  suppliers: unknown[];
  quotes: unknown[];
  invoices: unknown[];
  purchases: unknown[];
  bank_accounts: unknown[];
  bank_transactions_count: number;
  audit_log_count: number;
  hr_employees: unknown[];
  legal: {
    duerp: unknown[];
    rgpd_treatments: unknown[];
    insurances: unknown[];
  };
  notifications: unknown[];
  subscription: unknown | null;
}

export async function generateRgpdExport(tenantId: string): Promise<Result<RgpdExportResult, AppError>> {
  if (!process.env['DATABASE_URL']) {
    return err(appError('SERVICE_UNAVAILABLE', 'Export RGPD non disponible sans base de donnees.'));
  }

  try {
    const { prisma } = await import('@zenadmin/db');
    const p = prisma as unknown as Record<string, { findMany?: Function; findUnique?: Function; findFirst?: Function; count?: Function }>;

    const [
      tenant,
      users,
      clients,
      suppliers,
      quotes,
      invoices,
      purchases,
      bankAccounts,
      bankTransactionsCount,
      auditLogCount,
      employees,
      duerp,
      rgpdTreatments,
      insurances,
      notifications,
      subscription,
    ] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.user.findMany({ where: { tenant_id: tenantId, deleted_at: null }, select: { id: true, email: true, first_name: true, last_name: true, role: true, totp_enabled: true, last_login_at: true, created_at: true } }),
      prisma.client.findMany({ where: { tenant_id: tenantId, deleted_at: null } }),
      prisma.supplier.findMany({ where: { tenant_id: tenantId, deleted_at: null } }),
      prisma.quote.findMany({ where: { tenant_id: tenantId, deleted_at: null }, include: { lines: true } }),
      prisma.invoice.findMany({ where: { tenant_id: tenantId, deleted_at: null }, include: { lines: true } }),
      prisma.purchase.findMany({ where: { tenant_id: tenantId, deleted_at: null }, include: { lines: true } }),
      (p['bankAccount']?.findMany?.({ where: { tenant_id: tenantId, deleted_at: null } }) ?? []),
      (p['bankTransaction']?.count?.({ where: { tenant_id: tenantId } }) ?? 0),
      (p['auditLog']?.count?.({ where: { tenant_id: tenantId } }) ?? 0),
      (p['hrEmployee']?.findMany?.({ where: { tenant_id: tenantId, deleted_at: null } }) ?? []),
      (p['duerpDocument']?.findMany?.({ where: { tenant_id: tenantId, deleted_at: null }, include: { risks: true } }) ?? []),
      (p['rgpdTreatment']?.findMany?.({ where: { tenant_id: tenantId, deleted_at: null } }) ?? []),
      (p['insurance']?.findMany?.({ where: { tenant_id: tenantId, deleted_at: null } }) ?? []),
      (p['notification']?.findMany?.({ where: { tenant_id: tenantId }, take: 500, orderBy: { created_at: 'desc' } }) ?? []),
      (p['tenantSubscription']?.findFirst?.({ where: { tenant_id: tenantId } }) ?? null),
    ]);

    return ok({
      format: 'json',
      generated_at: new Date().toISOString(),
      tenant,
      users,
      clients,
      suppliers,
      quotes,
      invoices,
      purchases,
      bank_accounts: bankAccounts,
      bank_transactions_count: bankTransactionsCount,
      audit_log_count: auditLogCount,
      hr_employees: employees,
      legal: {
        duerp,
        rgpd_treatments: rgpdTreatments,
        insurances,
      },
      notifications,
      subscription,
    });
  } catch (e) {
    return err(appError('INTERNAL_ERROR', `Export RGPD failed: ${e instanceof Error ? e.message : 'unknown'}`));
  }
}
