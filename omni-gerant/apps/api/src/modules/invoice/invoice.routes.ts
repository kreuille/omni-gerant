import type { FastifyInstance } from 'fastify';
import { createInvoiceService } from './invoice.service.js';
import { createInvoiceSchema, invoiceListSchema } from './invoice.schemas.js';
import { createDocumentNumberGenerator, createInMemoryNumberRepo, createPrismaNumberRepo } from '../quote/document-number.js';
import { createPrismaInvoiceRepository } from './invoice.repository.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';
import { createEmailService, createDefaultEmailProvider } from '../../lib/email.js';
import { invoiceSentHtml, invoiceSentText } from '../../lib/email-templates/invoice-sent.js';

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

  // POST /api/invoices/:id/send — envoie la facture par email avec PDF en piece jointe
  // BUSINESS RULE [CDC-2.1 / Vague A1] : Email transactionnel devis/facture
  const emailService = createEmailService(createDefaultEmailProvider());
  app.post(
    '/api/invoices/:id/send',
    { preHandler: [...preHandlers, requirePermission('invoice', 'update')], schema: { body: { type: 'object', additionalProperties: true } } },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { recipient_email?: string; include_pdf?: boolean };

      const { prisma } = await import('@zenadmin/db');
      const invoice = await prisma.invoice.findFirst({
        where: { id, tenant_id: request.auth.tenant_id, deleted_at: null },
        include: { client: true, lines: true },
      });
      if (!invoice) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Facture introuvable' } });

      const tenant = await prisma.tenant.findUnique({ where: { id: request.auth.tenant_id } });
      if (!tenant) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Tenant introuvable' } });

      const recipientEmail = body.recipient_email?.trim() || invoice.client?.email;
      if (!recipientEmail) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Aucune adresse email destinataire. Renseignez recipient_email ou mettez à jour le client.' },
        });
      }

      const formatCents = (c: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100);
      const addr = tenant.address as { line1?: string; zip?: string; city?: string } | null;
      const tenantSettings = (tenant.settings ?? {}) as Record<string, string | undefined>;
      const clientName = invoice.client?.company_name ?? ([invoice.client?.first_name, invoice.client?.last_name].filter(Boolean).join(' ') || 'Client');
      const paymentTerms = invoice.payment_terms === 0 ? 'Paiement comptant' : `${invoice.payment_terms} jours`;

      // Generer le PDF/A-3 Factur-X si include_pdf (defaut true)
      let attachments;
      if (body.include_pdf !== false) {
        try {
          const { generateFacturxXml, getTypeCode } = await import('./facturx/facturx-xml.js');
          const { generateFacturxPdf } = await import('./facturx/facturx-pdf.js');
          const taxGroups = new Map<number, { base: number; tva: number }>();
          for (const l of invoice.lines) {
            const rate = l.tva_rate / 100;
            const ex = taxGroups.get(rate) ?? { base: 0, tva: 0 };
            ex.base += l.total_ht_cents;
            ex.tva += Math.round(l.total_ht_cents * rate / 100);
            taxGroups.set(rate, ex);
          }
          const xml = generateFacturxXml({
            number: invoice.number, type_code: getTypeCode(invoice.type),
            issue_date: invoice.issue_date, due_date: invoice.due_date, currency: 'EUR',
            seller: { name: tenant.name, siret: tenant.siret ?? undefined, address_line: addr?.line1 ?? tenant.name, zip_code: addr?.zip ?? '', city: addr?.city ?? '', country_code: 'FR' },
            buyer: { name: clientName, siret: invoice.client?.siret ?? undefined, address_line: invoice.client?.address_line1 ?? '', zip_code: invoice.client?.zip_code ?? '', city: invoice.client?.city ?? '', country_code: invoice.client?.country ?? 'FR' },
            lines: invoice.lines.map((l) => ({ position: l.position, label: l.label, quantity: Number(l.quantity), unit: l.unit, unit_price_cents: l.unit_price_cents, tva_rate: l.tva_rate / 100, total_ht_cents: l.total_ht_cents })),
            tax_groups: [...taxGroups.entries()].map(([rate, v]) => ({ tva_rate: rate, base_ht_cents: v.base, tva_cents: v.tva })),
            total_ht_cents: invoice.total_ht_cents, total_tva_cents: invoice.total_tva_cents, total_ttc_cents: invoice.total_ttc_cents,
            payment_terms_days: invoice.payment_terms, profile: 'EN 16931',
          });
          const pdfResult = await generateFacturxPdf({
            employer: { name: tenant.name, siret: tenant.siret, address: addr?.line1 ?? null, nafCode: tenant.naf_code },
            client: { name: clientName, siret: invoice.client?.siret ?? null, address: [invoice.client?.address_line1, invoice.client?.zip_code, invoice.client?.city].filter(Boolean).join(', ') },
            number: invoice.number, issueDate: invoice.issue_date, dueDate: invoice.due_date,
            lines: invoice.lines.map((l) => ({ label: l.label, quantity: Number(l.quantity), unitPriceCents: l.unit_price_cents, tvaRate: l.tva_rate, totalHtCents: l.total_ht_cents })),
            totalHtCents: invoice.total_ht_cents, totalTvaCents: invoice.total_tva_cents, totalTtcCents: invoice.total_ttc_cents,
          }, xml, 'EN 16931');
          if (pdfResult.ok) {
            attachments = [{
              filename: `${invoice.number}.pdf`,
              content: Buffer.from(pdfResult.value.pdf_buffer).toString('base64'),
              content_type: 'application/pdf',
            }];
          }
        } catch (e) {
          request.log.warn({ err: e }, 'invoice pdf attachment skipped');
        }
      }

      const templateData = {
        client_name: clientName,
        company_name: tenantSettings.company_name ?? tenant.name,
        invoice_number: invoice.number,
        issue_date: invoice.issue_date.toLocaleDateString('fr-FR'),
        due_date: invoice.due_date?.toLocaleDateString('fr-FR') ?? '—',
        total_ttc: formatCents(invoice.total_ttc_cents),
        total_ht: formatCents(invoice.total_ht_cents),
        payment_terms: paymentTerms,
        iban: tenantSettings.iban,
        bic: tenantSettings.bic,
        company_siret: tenant.siret ?? undefined,
        company_address: addr ? `${addr.line1}, ${addr.zip} ${addr.city}` : undefined,
        company_phone: tenantSettings.phone,
        company_email: tenantSettings.email,
      };

      const emailResult = await emailService.send({
        to: recipientEmail,
        subject: `Facture ${invoice.number} de ${templateData.company_name}`,
        html: invoiceSentHtml(templateData),
        text: invoiceSentText(templateData),
        attachments,
      });

      if (!emailResult.ok) {
        return reply.status(500).send({ error: emailResult.error });
      }

      return { sent: true, recipient: recipientEmail, message_id: emailResult.value.messageId, attached_pdf: !!attachments };
    },
  );

  // D1 : POST /api/invoices/:id/payment-link — genere un lien Stripe Checkout
  // pour la facture (Stripe Connect si tenant a un stripe_account_id).
  app.post(
    '/api/invoices/:id/payment-link',
    { preHandler: [...preHandlers, requirePermission('invoice', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { prisma } = await import('@zenadmin/db');
      const inv = await prisma.invoice.findFirst({
        where: { id, tenant_id: request.auth.tenant_id, deleted_at: null },
      });
      if (!inv) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Facture introuvable' } });

      const { createStripeClient } = await import('../payment/stripe/stripe-client.js');
      const { createCheckoutService } = await import('../payment/stripe/checkout.service.js');
      const stripeKey = process.env['STRIPE_SECRET_KEY'];
      if (!stripeKey) {
        return reply.status(503).send({
          error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Stripe n\'est pas configuré (STRIPE_SECRET_KEY manquant).' },
        });
      }
      const stripeClient = createStripeClient({
        secret_key: stripeKey,
        webhook_secret: process.env['STRIPE_WEBHOOK_SECRET'] ?? '',
        connect_client_id: process.env['STRIPE_CONNECT_CLIENT_ID'] ?? '',
      });
      const checkoutService = createCheckoutService(stripeClient, process.env['APP_BASE_URL'] ?? 'https://omni-gerant.vercel.app');

      // Connect : on lit stripe_account_id depuis tenant.settings si present
      const tenant = await prisma.tenant.findUnique({ where: { id: request.auth.tenant_id }, select: { settings: true } });
      const tenantSettings = (tenant?.settings ?? {}) as Record<string, string | undefined>;
      const remaining = inv.remaining_cents > 0 ? inv.remaining_cents : inv.total_ttc_cents;

      const r = await checkoutService.createPaymentLink({
        invoice_id: inv.id,
        invoice_number: inv.number,
        amount_cents: remaining,
        currency: 'eur',
        tenant_stripe_account_id: tenantSettings['stripe_account_id'],
      });
      if (!r.ok) return reply.status(502).send({ error: r.error });

      // Persist le session_id + URL dans la facture pour reutilisation
      try {
        await (prisma as unknown as { invoice: { update: Function } }).invoice.update({
          where: { id: inv.id },
          data: {
            payment_link_url: r.value.checkout_url,
            payment_link_session_id: r.value.session_id,
          } as unknown as Parameters<typeof prisma.invoice.update>[0]['data'],
        });
      } catch { /* champ optionnel — peut ne pas etre migre */ }

      return r.value;
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
