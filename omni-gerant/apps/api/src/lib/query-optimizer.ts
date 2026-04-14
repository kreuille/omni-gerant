// BUSINESS RULE [CDC-3.1]: Optimisation requetes avec indexes

/**
 * Database index definitions for optimal query performance.
 * These correspond to Prisma @@index directives in schema.prisma.
 */
export const DB_INDEXES = {
  // Common pattern: every table has (tenant_id, deleted_at) for RLS + soft delete filtering
  TENANT_SOFT_DELETE: '@@index([tenant_id, deleted_at])',

  // Status-based queries
  QUOTES_STATUS: '@@index([tenant_id, status])',
  INVOICES_STATUS: '@@index([tenant_id, status])',
  PURCHASES_STATUS: '@@index([tenant_id, status])',

  // Client-scoped queries
  QUOTES_CLIENT: '@@index([tenant_id, client_id])',
  INVOICES_CLIENT: '@@index([tenant_id, client_id])',

  // Date-based queries for bank transactions
  BANK_TRANSACTIONS_DATE: '@@index([tenant_id, date])',

  // Full-text search
  CLIENT_SEARCH: '@@index([company_name, last_name])',
} as const;

/**
 * Build optimized query filters for tenant-scoped, soft-delete-aware queries
 */
export function tenantFilter(tenantId: string) {
  return {
    tenant_id: tenantId,
    deleted_at: null,
  };
}

/**
 * Build optimized query for status listing
 */
export function statusFilter(tenantId: string, status: string) {
  return {
    ...tenantFilter(tenantId),
    status,
  };
}

/**
 * Build optimized query for client-scoped listing
 */
export function clientFilter(tenantId: string, clientId: string) {
  return {
    ...tenantFilter(tenantId),
    client_id: clientId,
  };
}

/**
 * Build optimized date range filter for bank transactions
 */
export function dateRangeFilter(tenantId: string, from: Date, to: Date) {
  return {
    ...tenantFilter(tenantId),
    date: {
      gte: from,
      lte: to,
    },
  };
}

/**
 * Optimized select fields for list views (avoid fetching heavy columns)
 */
export const LIST_SELECT = {
  quotes: {
    id: true,
    tenant_id: true,
    client_id: true,
    quote_number: true,
    status: true,
    total_ht: true,
    total_ttc: true,
    created_at: true,
    valid_until: true,
  },
  invoices: {
    id: true,
    tenant_id: true,
    client_id: true,
    invoice_number: true,
    status: true,
    total_ht: true,
    total_ttc: true,
    issue_date: true,
    due_date: true,
    paid_amount: true,
  },
  clients: {
    id: true,
    tenant_id: true,
    company_name: true,
    first_name: true,
    last_name: true,
    email: true,
    siret: true,
    created_at: true,
  },
} as const;

/**
 * Cursor-based pagination helper with index-optimized ordering
 */
export function cursorPagination(cursor?: string, limit = 20) {
  return {
    take: limit + 1, // Fetch one extra to detect hasMore
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { created_at: 'desc' as const },
  };
}
