// Vague K1 : Audit trail version 2 — append-only sur la table audit_events.
// Helper global utilisable depuis n'importe quelle route.

import { getRequestContext } from '../../middleware/request-context.js';

export interface AuditEventInput {
  tenant_id: string;
  user_id?: string | null;
  action: string;           // invoice.create, quote.sign, user.login...
  resource_type: string;
  resource_id?: string | null;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Best-effort log : ne lance pas si l'insert DB echoue.
 */
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  if (!process.env['DATABASE_URL']) return;
  try {
    const { prisma } = await import('@zenadmin/db');
    const ctx = getRequestContext();
    await (prisma as unknown as { auditEvent?: { create?: Function } })
      .auditEvent?.create?.({
        data: {
          tenant_id: input.tenant_id,
          user_id: input.user_id ?? null,
          action: input.action,
          resource_type: input.resource_type,
          resource_id: input.resource_id ?? null,
          metadata: (input.metadata ?? {}) as Record<string, unknown>,
          ip_address: input.ip_address ?? null,
          user_agent: input.user_agent ?? null,
          correlation_id: ctx?.correlation_id ?? null,
        },
      });
  } catch { /* noop */ }
}

export async function queryAuditEvents(
  tenantId: string,
  opts: { resource_type?: string; action?: string; user_id?: string; limit?: number } = {},
): Promise<unknown[]> {
  if (!process.env['DATABASE_URL']) return [];
  const { prisma } = await import('@zenadmin/db');
  const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
  const where: Record<string, unknown> = { tenant_id: tenantId };
  if (opts.resource_type) where['resource_type'] = opts.resource_type;
  if (opts.action) where['action'] = opts.action;
  if (opts.user_id) where['user_id'] = opts.user_id;
  return (await (prisma as unknown as { auditEvent?: { findMany?: Function } })
    .auditEvent?.findMany?.({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
    })) ?? [];
}
