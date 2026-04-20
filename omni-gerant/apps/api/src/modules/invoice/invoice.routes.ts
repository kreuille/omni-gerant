import type { FastifyInstance } from 'fastify';
import { createInvoiceService } from './invoice.service.js';
import { createInvoiceSchema, invoiceListSchema } from './invoice.schemas.js';
import { createDocumentNumberGenerator, createInMemoryNumberRepo, createPrismaNumberRepo } from '../quote/document-number.js';
import { createPrismaInvoiceRepository } from './invoice.repository.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-2.1]: Endpoints factures

export async function invoiceRoutes(app: FastifyInstance) {
  const repo = createPrismaInvoiceRepository();

  // Plan 3 : persistence PostgreSQL pour FAC-YYYY-NNNNN (advisory lock)
  const numberRepo = process.env['DATABASE_URL'] ? createPrismaNumberRepo() : createInMemoryNumberRepo();
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

  // Alias documentes dans CLAUDE.md :
  // - GET /api/invoices/:id/pdf -> redirige vers facturx.pdf (P0-04)
  // - GET /api/invoices/:id/facturx -> redirige vers facturx.xml (P0-03)
  app.get(
    '/api/invoices/:id/pdf',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const qs = new URLSearchParams(request.query as Record<string, string> ?? {}).toString();
      const target = `/api/invoices/${id}/facturx.pdf${qs ? '?' + qs : ''}`;
      return reply.redirect(307, target);
    },
  );

  app.get(
    '/api/invoices/:id/facturx',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const qs = new URLSearchParams(request.query as Record<string, string> ?? {}).toString();
      const target = `/api/invoices/${id}/facturx.xml${qs ? '?' + qs : ''}`;
      return reply.redirect(307, target);
    },
  );

  // F1 : GET /api/invoices/:id/facturx.pdf — genere et retourne PDF/A-3 avec XML Factur-X embedded
  app.get(
    '/api/invoices/:id/facturx.pdf',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { profile } = request.query as { profile?: 'MINIMUM' | 'BASIC WL' | 'BASIC' | 'EN 16931' | 'EXTENDED' };
      const chosenProfile = profile ?? 'EN 16931';

      const { prisma } = await import('@zenadmin/db');
      const invoice = await prisma.invoice.findFirst({
        where: { id, tenant_id: request.auth.tenant_id, deleted_at: null },
        include: { lines: true, client: true },
      });
      if (!invoice) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Facture introuvable' } });
      const tenant = await prisma.tenant.findUnique({ where: { id: request.auth.tenant_id } });
      if (!tenant) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Tenant introuvable' } });

      const { generateFacturxXml, getTypeCode } = await import('./facturx/facturx-xml.js');
      const { generateFacturxPdf } = await import('./facturx/facturx-pdf.js');

      const addr = tenant.address as { line1?: string; zip?: string; city?: string; country?: string } | null;
      const clientAddr = {
        line1: invoice.client?.address_line1 ?? '',
        zip: invoice.client?.zip_code ?? '',
        city: invoice.client?.city ?? '',
        country: invoice.client?.country ?? 'FR',
      };

      const taxGroups = new Map<number, { base: number; tva: number }>();
      for (const l of invoice.lines) {
        const rate = l.tva_rate / 100;
        const existing = taxGroups.get(rate) ?? { base: 0, tva: 0 };
        existing.base += l.total_ht_cents;
        existing.tva += Math.round(l.total_ht_cents * rate / 100);
        taxGroups.set(rate, existing);
      }

      const xml = generateFacturxXml({
        number: invoice.number,
        type_code: getTypeCode(invoice.type),
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        currency: 'EUR',
        seller: {
          name: tenant.name,
          siret: tenant.siret ?? undefined,
          vat_number: undefined,
          address_line: addr?.line1 ?? tenant.name,
          zip_code: addr?.zip ?? '',
          city: addr?.city ?? '',
          country_code: addr?.country ?? 'FR',
        },
        buyer: {
          name: invoice.client?.company_name ?? ([invoice.client?.first_name, invoice.client?.last_name].filter(Boolean).join(' ') || 'Client'),
          siret: invoice.client?.siret ?? undefined,
          address_line: clientAddr.line1,
          zip_code: clientAddr.zip,
          city: clientAddr.city,
          country_code: clientAddr.country,
        },
        lines: invoice.lines.map((l) => ({
          position: l.position,
          label: l.label,
          quantity: Number(l.quantity),
          unit: l.unit,
          unit_price_cents: l.unit_price_cents,
          tva_rate: l.tva_rate / 100,
          total_ht_cents: l.total_ht_cents,
        })),
        tax_groups: [...taxGroups.entries()].map(([rate, v]) => ({ tva_rate: rate, base_ht_cents: v.base, tva_cents: v.tva })),
        total_ht_cents: invoice.total_ht_cents,
        total_tva_cents: invoice.total_tva_cents,
        total_ttc_cents: invoice.total_ttc_cents,
        payment_terms_days: invoice.payment_terms,
        profile: chosenProfile,
      });

      const pdfResult = await generateFacturxPdf({
        employer: { name: tenant.name, siret: tenant.siret, address: addr?.line1 ?? null, nafCode: tenant.naf_code },
        client: {
          name: invoice.client?.company_name ?? ([invoice.client?.first_name, invoice.client?.last_name].filter(Boolean).join(' ') || 'Client'),
          siret: invoice.client?.siret ?? null,
          address: [clientAddr.line1, clientAddr.zip, clientAddr.city].filter(Boolean).join(', '),
        },
        number: invoice.number,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        lines: invoice.lines.map((l) => ({ label: l.label, quantity: Number(l.quantity), unitPriceCents: l.unit_price_cents, tvaRate: l.tva_rate, totalHtCents: l.total_ht_cents })),
        totalHtCents: invoice.total_ht_cents,
        totalTvaCents: invoice.total_tva_cents,
        totalTtcCents: invoice.total_ttc_cents,
      }, xml, chosenProfile);

      if (!pdfResult.ok) return reply.status(500).send({ error: pdfResult.error });
      return reply
        .type('application/pdf')
        .header('content-disposition', `inline; filename="${pdfResult.value.filename}"`)
        .header('x-facturx-profile', pdfResult.value.profile)
        .header('x-pdfa-version', pdfResult.value.pdfaVersion)
        .send(pdfResult.value.pdf_buffer);
    },
  );

  // F1 : GET /api/invoices/:id/facturx.xml — XML seul
  app.get(
    '/api/invoices/:id/facturx.xml',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { profile } = request.query as { profile?: 'MINIMUM' | 'BASIC WL' | 'BASIC' | 'EN 16931' | 'EXTENDED' };
      const { prisma } = await import('@zenadmin/db');
      const invoice = await prisma.invoice.findFirst({
        where: { id, tenant_id: request.auth.tenant_id, deleted_at: null },
        include: { lines: true, client: true },
      });
      if (!invoice) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Facture introuvable' } });
      const tenant = await prisma.tenant.findUnique({ where: { id: request.auth.tenant_id } });
      if (!tenant) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Tenant introuvable' } });

      const { generateFacturxXml, getTypeCode } = await import('./facturx/facturx-xml.js');
      const addr = tenant.address as { line1?: string; zip?: string; city?: string; country?: string } | null;
      const xml = generateFacturxXml({
        number: invoice.number,
        type_code: getTypeCode(invoice.type),
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        currency: 'EUR',
        seller: { name: tenant.name, address_line: addr?.line1 ?? '', zip_code: addr?.zip ?? '', city: addr?.city ?? '', country_code: addr?.country ?? 'FR', siret: tenant.siret ?? undefined },
        buyer: {
          name: invoice.client?.company_name ?? 'Client',
          siret: invoice.client?.siret ?? undefined,
          address_line: invoice.client?.address_line1 ?? '',
          zip_code: invoice.client?.zip_code ?? '',
          city: invoice.client?.city ?? '',
          country_code: invoice.client?.country ?? 'FR',
        },
        lines: invoice.lines.map((l) => ({ position: l.position, label: l.label, quantity: Number(l.quantity), unit: l.unit, unit_price_cents: l.unit_price_cents, tva_rate: l.tva_rate / 100, total_ht_cents: l.total_ht_cents })),
        tax_groups: [{ tva_rate: 20, base_ht_cents: invoice.total_ht_cents, tva_cents: invoice.total_tva_cents }],
        total_ht_cents: invoice.total_ht_cents,
        total_tva_cents: invoice.total_tva_cents,
        total_ttc_cents: invoice.total_ttc_cents,
        payment_terms_days: invoice.payment_terms,
        profile: profile ?? 'EN 16931',
      });
      return reply.type('application/xml').send(xml);
    },
  );

  // F5 : POST /api/invoices/:id/sign — signature eIDAS simple
  app.post(
    '/api/invoices/:id/sign',
    { preHandler: [...preHandlers, requirePermission('invoice', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { signerEmail?: string };
      if (!body?.signerEmail) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'signerEmail requis' } });
      const { signInvoice } = await import('./invoice-signature.service.js');
      const r = await signInvoice(id, request.auth.tenant_id, body.signerEmail);
      if (!r.ok) return reply.status(r.error.code === 'NOT_FOUND' ? 404 : 400).send({ error: r.error });
      return r.value;
    },
  );

  app.get(
    '/api/invoices/:id/signature/verify',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { verifyInvoiceSignature } = await import('./invoice-signature.service.js');
      const r = await verifyInvoiceSignature(id, request.auth.tenant_id);
      if (!r.ok) return reply.status(r.error.code === 'NOT_FOUND' ? 404 : 400).send({ error: r.error });
      return r.value;
    },
  );

  app.patch(
    '/api/invoices/:id/early-payment',
    { preHandler: [...preHandlers, requirePermission('invoice', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { rateBp?: number; days?: number };
      const { prisma } = await import('@zenadmin/db');
      const inv = await prisma.invoice.findFirst({ where: { id, tenant_id: request.auth.tenant_id, deleted_at: null } });
      if (!inv) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Facture introuvable' } });
      await prisma.invoice.update({
        where: { id },
        data: {
          early_payment_rate_bp: body?.rateBp !== undefined ? Math.max(0, Math.min(2000, Math.round(body.rateBp))) : null,
          early_payment_days: body?.days !== undefined ? Math.max(0, Math.min(90, Math.round(body.days))) : null,
        },
      });
      return { id, rateBp: body?.rateBp ?? null, days: body?.days ?? null };
    },
  );
}
