import type { FastifyInstance } from 'fastify';
import { createInvoiceService, type InvoiceRepository, type Invoice } from './invoice.service.js';
import { createInvoiceSchema, invoiceListSchema } from './invoice.schemas.js';
import { createDocumentNumberGenerator, createInMemoryNumberRepo } from '../quote/document-number.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-2.1]: Endpoints factures

export async function invoiceRoutes(app: FastifyInstance) {
  // In-memory repo — functional for dev/demo, use Prisma in production
  const invoices = new Map<string, Invoice>();

  const repo: InvoiceRepository = {
    async create(data) {
      const id = crypto.randomUUID();
      const invoice: Invoice = {
        id,
        tenant_id: data.tenant_id,
        client_id: data.client_id,
        quote_id: data.quote_id ?? null,
        number: data.number,
        type: data.type,
        status: 'draft',
        issue_date: new Date(),
        due_date: data.due_date,
        deposit_percent: data.deposit_percent ?? null,
        situation_percent: data.situation_percent ?? null,
        previous_situation_cents: data.previous_situation_cents ?? null,
        payment_terms: data.payment_terms,
        notes: data.notes ?? null,
        total_ht_cents: data.total_ht_cents,
        total_tva_cents: data.total_tva_cents,
        total_ttc_cents: data.total_ttc_cents,
        paid_cents: 0,
        remaining_cents: data.remaining_cents,
        finalized_at: null,
        paid_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        lines: data.lines.map((l) => ({
          id: crypto.randomUUID(),
          invoice_id: id,
          ...l,
          description: l.description ?? null,
        })),
      };
      invoices.set(id, invoice);
      return invoice;
    },
    async findById(id, tenantId) {
      const invoice = invoices.get(id);
      if (!invoice || invoice.tenant_id !== tenantId || invoice.deleted_at) return null;
      return invoice;
    },
    async findMany(params) {
      let items = Array.from(invoices.values())
        .filter((inv) => inv.tenant_id === params.tenant_id && !inv.deleted_at);
      if (params.status) items = items.filter((inv) => inv.status === params.status);
      if (params.type) items = items.filter((inv) => inv.type === params.type);
      if (params.client_id) items = items.filter((inv) => inv.client_id === params.client_id);
      if (params.search) {
        const s = params.search.toLowerCase();
        items = items.filter((inv) => inv.number.toLowerCase().includes(s));
      }
      items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      const limit = params.limit ?? 20;
      return { items: items.slice(0, limit), next_cursor: null, has_more: items.length > limit };
    },
    async updateStatus(id, tenantId, status, extra) {
      const invoice = invoices.get(id);
      if (!invoice || invoice.tenant_id !== tenantId || invoice.deleted_at) return null;
      const updated = { ...invoice, status, ...extra, updated_at: new Date() };
      invoices.set(id, updated);
      return updated;
    },
    async updatePayment(id, tenantId, paidCents, remainingCents, status, paidAt) {
      const invoice = invoices.get(id);
      if (!invoice || invoice.tenant_id !== tenantId || invoice.deleted_at) return null;
      const updated = {
        ...invoice,
        paid_cents: paidCents,
        remaining_cents: remainingCents,
        status,
        paid_at: paidAt ?? invoice.paid_at,
        updated_at: new Date(),
      };
      invoices.set(id, updated);
      return updated;
    },
    async delete(id, tenantId) {
      const invoice = invoices.get(id);
      if (!invoice || invoice.tenant_id !== tenantId) return false;
      invoices.set(id, { ...invoice, deleted_at: new Date() });
      return true;
    },
  };

  const numberRepo = createInMemoryNumberRepo();
  const numberGen = createDocumentNumberGenerator(numberRepo);
  const invoiceService = createInvoiceService(repo, {
    generate: (tenantId: string) => numberGen.generate(tenantId, 'FAC'),
  });

  const preHandlers = [authenticate, injectTenant];

  // POST /api/invoices
  app.post(
    '/api/invoices',
    { preHandler: [...preHandlers, requirePermission('invoice', 'create')] },
    async (request, reply) => {
      const parsed = createInvoiceSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid invoice data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await invoiceService.create(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/invoices
  app.get(
    '/api/invoices',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const parsed = invoiceListSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: { issues: parsed.error.issues } },
        });
      }
      const result = await invoiceService.list(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/invoices/:id
  app.get(
    '/api/invoices/:id',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await invoiceService.getById(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // POST /api/invoices/:id/finalize
  app.post(
    '/api/invoices/:id/finalize',
    { preHandler: [...preHandlers, requirePermission('invoice', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await invoiceService.finalize(id, request.auth.tenant_id);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 403;
        return reply.status(status).send({ error: result.error });
      }
      return result.value;
    },
  );

  // DELETE /api/invoices/:id
  app.delete(
    '/api/invoices/:id',
    { preHandler: [...preHandlers, requirePermission('invoice', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await invoiceService.delete(id, request.auth.tenant_id);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 403;
        return reply.status(status).send({ error: result.error });
      }
      return reply.status(204).send();
    },
  );
}
