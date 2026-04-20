import type { FastifyInstance } from 'fastify';
import { createPpfClient } from './ppf-client.js';
import { createPpfSender, type PpfTransmissionRepository, type PpfTransmissionRecord } from './ppf-sender.js';
import { createPpfReceiver, type ReceivedInvoiceRepository, type ReceivedInvoiceRecord } from './ppf-receiver.js';
import { authenticate, requirePermission } from '../../../plugins/auth.js';
import { injectTenant } from '../../../plugins/tenant.js';

// BUSINESS RULE [CDC-3.2]: Routes PPF/PDP

export async function ppfRoutes(app: FastifyInstance) {
  const ppfClient = createPpfClient({
    api_url: process.env.PPF_API_URL ?? 'https://api-sandbox.ppf.gouv.fr',
    api_key: process.env.PPF_API_KEY ?? 'ppf_test_placeholder',
    technical_id: process.env.PPF_TECHNICAL_ID ?? 'TECH-001',
    webhook_secret: process.env.PPF_WEBHOOK_SECRET ?? 'whsec_ppf_placeholder',
    environment: (process.env.PPF_ENV as 'sandbox' | 'production') ?? 'sandbox',
  });

  // Placeholder transmission repo
  const transmissionStore = new Map<string, PpfTransmissionRecord>();
  const transmissionRepo: PpfTransmissionRepository = {
    async create(data) {
      const record: PpfTransmissionRecord = { ...data, id: crypto.randomUUID() };
      transmissionStore.set(data.invoice_id, record);
      return record;
    },
    async findByInvoiceId(_tenantId, invoiceId) {
      return transmissionStore.get(invoiceId) ?? null;
    },
    async findByPpfId(ppfId) {
      for (const r of transmissionStore.values()) {
        if (r.ppf_id === ppfId) return r;
      }
      return null;
    },
    async updateStatus(id, status, rejectionReason) {
      for (const [key, r] of transmissionStore) {
        if (r.id === id) {
          transmissionStore.set(key, { ...r, status, rejection_reason: rejectionReason, last_status_check: new Date() });
          break;
        }
      }
    },
    async findPending(tenantId) {
      return Array.from(transmissionStore.values()).filter(
        (r) => r.tenant_id === tenantId && (r.status === 'deposee' || r.status === 'en_cours_traitement'),
      );
    },
  };

  // Placeholder received invoice repo
  const receivedStore = new Map<string, ReceivedInvoiceRecord>();
  const receivedRepo: ReceivedInvoiceRepository = {
    async create(data) {
      const record: ReceivedInvoiceRecord = { ...data, id: crypto.randomUUID() };
      receivedStore.set(data.ppf_id, record);
      return record;
    },
    async findByPpfId(ppfId) {
      return receivedStore.get(ppfId) ?? null;
    },
    async updatePurchaseId(id, purchaseId) {
      for (const [key, r] of receivedStore) {
        if (r.id === id) {
          receivedStore.set(key, { ...r, purchase_id: purchaseId });
          break;
        }
      }
    },
    async updateStatus(id, status) {
      for (const [key, r] of receivedStore) {
        if (r.id === id) {
          receivedStore.set(key, { ...r, status });
          break;
        }
      }
    },
    async findByTenant(tenantId) {
      return Array.from(receivedStore.values()).filter((r) => r.tenant_id === tenantId);
    },
  };

  const sender = createPpfSender(ppfClient, transmissionRepo);
  const receiver = createPpfReceiver(ppfClient, receivedRepo);
  const preHandlers = [authenticate, injectTenant];

  // POST /api/ppf/submit — Submit invoice to PPF
  app.post(
    '/api/ppf/submit',
    { preHandler: [...preHandlers, requirePermission('invoice', 'update')] },
    async (request, reply) => {
      const body = request.body as {
        invoice_id: string;
        number: string;
        date: string;
        sender_siret: string;
        receiver_siret: string;
        amount_ht_cents: number;
        amount_ttc_cents: number;
        tax_amount_cents: number;
        facturx_xml: string;
        pdf_base64?: string;
      };
      const result = await sender.submitInvoice(request.auth.tenant_id, {
        id: body.invoice_id,
        ...body,
      });
      if (!result.ok) {
        const status = result.error.code === 'ALREADY_SUBMITTED' ? 409 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/ppf/status/:invoiceId — Get transmission status
  app.get(
    '/api/ppf/status/:invoiceId',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const { invoiceId } = request.params as { invoiceId: string };
      const result = await sender.getTransmissionStatus(request.auth.tenant_id, invoiceId);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      if (!result.value) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Aucune transmission PPF' } });
      return result.value;
    },
  );

  // POST /api/ppf/refresh — Refresh all pending transmissions
  app.post(
    '/api/ppf/refresh',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const result = await sender.refreshAllPending(request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/ppf/directory/:siret — Lookup SIRET in PPF directory
  app.get(
    '/api/ppf/directory/:siret',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const { siret } = request.params as { siret: string };
      const entry = await ppfClient.lookupDirectory(siret);
      if (!entry) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'SIRET non trouve dans l\'annuaire PPF' } });
      return entry;
    },
  );

  // POST /api/ppf/webhook — PPF webhook endpoint
  app.post(
    '/api/ppf/webhook',
    async (request, reply) => {
      const signature = request.headers['x-ppf-signature'] as string;
      const payload = JSON.stringify(request.body);

      if (!ppfClient.verifyWebhookSignature(payload, signature ?? '')) {
        return reply.status(400).send({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid PPF webhook signature' } });
      }

      const event = request.body as { type: string; data: Record<string, unknown> };

      if (event.type === 'invoice.received') {
        const tenantId = event.data.tenant_id as string;
        const incoming = event.data.invoice as Record<string, unknown>;
        await receiver.handleIncomingInvoice(tenantId, incoming as never);
      }

      // F4 : sync statut interne sur evenement status_changed
      if (event.type === 'invoice.status_changed' || event.type === 'invoice.accepted' || event.type === 'invoice.rejected' || event.type === 'invoice.paid') {
        const invoiceId = event.data.invoice_id as string | undefined;
        const newStatus = event.data.new_status as string | undefined;
        if (invoiceId && newStatus) {
          const { prisma } = await import('@zenadmin/db');
          const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
          if (invoice) {
            const statusMap: Record<string, string> = {
              deposited: 'sent', received: 'sent', accepted: 'sent',
              rejected: 'cancelled', paid: 'paid',
            };
            const internal = statusMap[newStatus];
            if (internal && internal !== invoice.status) {
              await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: internal, ...(internal === 'paid' ? { paid_at: new Date() } : {}) },
              });
            }
          }
        }
      }

      return { received: true };
    },
  );

  // GET /api/ppf/incoming — List received invoices
  app.get(
    '/api/ppf/incoming',
    { preHandler: [...preHandlers, requirePermission('purchase', 'read')] },
    async (request, reply) => {
      const result = await receiver.listReceived(request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // BL5 : GET /api/ppf/platforms — liste des plateformes PPF/PDP connues
  app.get(
    '/api/ppf/platforms',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async () => {
      const { KNOWN_PLATFORMS } = await import('./pdp-routing.service.js');
      return { items: KNOWN_PLATFORMS, total: KNOWN_PLATFORMS.length };
    },
  );

  // BL5 : GET /api/ppf/receiver-platform/:siret — lookup PDP destinataire
  app.get(
    '/api/ppf/receiver-platform/:siret',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { siret } = request.params as { siret: string };
      const { lookupReceiverPlatform } = await import('./pdp-routing.service.js');
      const r = await lookupReceiverPlatform(siret);
      if (!r.ok) return reply.status(400).send({ error: r.error });
      return r.value;
    },
  );

  // F4 : GET /api/ppf/obligation/:invoiceId — verifier obligation PPF pour une facture
  app.get(
    '/api/ppf/obligation/:invoiceId',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request) => {
      const { invoiceId } = request.params as { invoiceId: string };
      const { detectPpfObligation } = await import('./ppf-obligation.service.js');
      return await detectPpfObligation(invoiceId, request.auth.tenant_id);
    },
  );

  // F4 : GET /api/ppf/obligations — liste factures classees par obligation
  app.get(
    '/api/ppf/obligations',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request) => {
      const { listInvoicesByObligation } = await import('./ppf-obligation.service.js');
      const items = await listInvoicesByObligation(request.auth.tenant_id, 100);
      const summary = {
        required: items.filter((i) => i.status === 'required').length,
        e_reporting_only: items.filter((i) => i.status === 'e_reporting_only').length,
        chorus_pro: items.filter((i) => i.status === 'chorus_pro').length,
        not_applicable: items.filter((i) => i.status === 'not_applicable').length,
      };
      return { items, summary };
    },
  );
}
