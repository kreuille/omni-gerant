import { Prisma } from '@prisma/client';

// BUSINESS RULE [R03]: Multi-tenant avec RLS - le middleware injecte le tenant_id

// Models that require tenant isolation (have tenant_id column)
const TENANT_SCOPED_MODELS = new Set([
  'User',
  'AuditLog',
  'Client',
  'Product',
  'Quote',
  'Invoice',
  'Payment',
  'Supplier',
  'Purchase',
  'BankAccount',
  'BankTransaction',
  'Duerp',
  'DuerpUpdateTrigger',
  'Papripact',
  'DuerpArchive',
  'TrainingRecord',
  'EpiAssignment',
  'InvoiceHashChain',
  'Nf525AuditEntry',
  'IncomingInvoice',
  'EReportingEntry',
  'RgpdTreatment',
  'InsurancePolicy',
  'TenantSettings',
]);

// Models that are not tenant-scoped
const TENANT_FREE_MODELS = new Set([
  'Tenant',
  'RefreshToken',
]);

export function createTenantMiddleware(getTenantId: () => string | null): Prisma.Middleware {
  return async (params, next) => {
    const model = params.model;
    if (!model || TENANT_FREE_MODELS.has(model) || !TENANT_SCOPED_MODELS.has(model)) {
      return next(params);
    }

    const tenantId = getTenantId();
    if (!tenantId) {
      // No tenant context - allow for system operations
      return next(params);
    }

    // Inject tenant_id on create
    if (params.action === 'create') {
      if (!params.args) params.args = {};
      if (!params.args['data']) params.args['data'] = {};
      params.args['data']['tenant_id'] = tenantId;
      return next(params);
    }

    // Inject tenant_id on createMany
    if (params.action === 'createMany') {
      if (!params.args) params.args = {};
      if (Array.isArray(params.args['data'])) {
        params.args['data'] = params.args['data'].map((item: Record<string, unknown>) => ({
          ...item,
          tenant_id: tenantId,
        }));
      }
      return next(params);
    }

    // Add tenant_id filter on read/update/delete operations
    if ([
      'findFirst', 'findMany', 'findUnique', 'findFirstOrThrow', 'findUniqueOrThrow',
      'count', 'aggregate', 'groupBy',
      'update', 'updateMany',
      'delete', 'deleteMany',
    ].includes(params.action)) {
      if (!params.args) params.args = {};
      if (!params.args['where']) params.args['where'] = {};
      params.args['where']['tenant_id'] = tenantId;
    }

    return next(params);
  };
}
