// BUSINESS RULE [NF525-K1]: Routes de certification NF525
// POST /api/invoices/:id/certify       - Re-try certification for an invoice
// GET  /api/invoices/:id/nf525         - Get NF525 status for an invoice
// POST /api/admin/nf525/retry-all      - Batch retry all uncertified (K3)
// GET  /api/admin/nf525/status         - Certification counts (K3)
// GET  /api/invoices/:id/nf525/verify  - Certification details (K4)
// GET  /api/invoices/:id/nf525/download - Download certified PDF (K4)
// GET  /api/nf525/dashboard            - NF525 compliance dashboard (K4)

import type { FastifyInstance } from 'fastify';
import { authenticate, requirePermission, requireRole } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';
import type { Nf525CertificationService, CertificationRepository } from './nf525-certification.service.js';
import type { KiwizClient } from './kiwiz-client.js';
import { runCertificationRetryJob } from './kiwiz-certification-job.js';
import type { UncertifiedDocumentLookup } from './kiwiz-certification-job.js';

export interface Nf525RouteDeps {
  certificationService: Nf525CertificationService;
  certificationRepo: CertificationRepository;
  kiwizClient: KiwizClient;
  uncertifiedLookup: UncertifiedDocumentLookup;
  testMode: boolean;
}

export async function nf525Routes(app: FastifyInstance, deps: Nf525RouteDeps) {
  const { certificationService, certificationRepo, kiwizClient, uncertifiedLookup, testMode } = deps;
  const preHandlers = [authenticate, injectTenant];

  // POST /api/invoices/:id/certify
  // BUSINESS RULE [NF525-K1]: Re-try certification manuelle
  app.post(
    '/api/invoices/:id/certify',
    { preHandler: [...preHandlers, requirePermission('invoice', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await certificationService.certifyInvoice(id, request.auth.tenant_id);

      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404
          : result.error.code === 'CONFLICT' ? 409
          : 500;
        return reply.status(status).send({ error: result.error });
      }

      return reply.status(200).send(result.value);
    },
  );

  // GET /api/invoices/:id/nf525
  // BUSINESS RULE [NF525-K1]: Consultation du statut de certification
  app.get(
    '/api/invoices/:id/nf525',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await certificationService.getStatus(id, request.auth.tenant_id);

      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
        return reply.status(status).send({ error: result.error });
      }

      return reply.status(200).send(result.value);
    },
  );

  // -------------------------------------------------------------------------
  // K3: Batch retry + status
  // -------------------------------------------------------------------------

  // POST /api/admin/nf525/retry-all
  // BUSINESS RULE [NF525-K3]: Batch retry — owner/admin only
  app.post(
    '/api/admin/nf525/retry-all',
    { preHandler: [...preHandlers, requireRole('owner', 'admin')] },
    async (request, reply) => {
      const result = await runCertificationRetryJob({
        uncertifiedLookup,
        certificationService,
        logger: request.log,
        tenantId: request.auth.tenant_id,
      });

      return reply.status(200).send(result);
    },
  );

  // GET /api/admin/nf525/status
  // BUSINESS RULE [NF525-K3]: Status des certifications — owner/admin only
  app.get(
    '/api/admin/nf525/status',
    { preHandler: [...preHandlers, requireRole('owner', 'admin')] },
    async (request, reply) => {
      const counts = await uncertifiedLookup.countByStatus(request.auth.tenant_id);
      return reply.status(200).send(counts);
    },
  );

  // -------------------------------------------------------------------------
  // K4: Verify, Download PDF, Dashboard
  // -------------------------------------------------------------------------

  // GET /api/invoices/:id/nf525/verify
  // BUSINESS RULE [NF525-K4]: Verification des details de certification
  app.get(
    '/api/invoices/:id/nf525/verify',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const record = await certificationRepo.findByInvoiceId(id, request.auth.tenant_id);

      return reply.status(200).send({
        certified: record !== null,
        file_hash: record?.file_hash ?? null,
        block_hash: record?.block_hash ?? null,
        certified_at: record?.certified_at ?? null,
        test_mode: record?.test_mode ?? testMode,
        type: record?.type ?? null,
      });
    },
  );

  // GET /api/invoices/:id/nf525/download
  // BUSINESS RULE [NF525-K4]: Telechargement du PDF certifie depuis Kiwiz
  app.get(
    '/api/invoices/:id/nf525/download',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const record = await certificationRepo.findByInvoiceId(id, request.auth.tenant_id);

      if (!record) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No certification found for this invoice' } });
      }

      const pdfResult = record.type === 'credit_memo'
        ? await kiwizClient.getCreditMemo(record.block_hash)
        : await kiwizClient.getInvoice(record.block_hash);

      if (!pdfResult.ok) {
        return reply.status(502).send({ error: pdfResult.error });
      }

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="certified-${id}.pdf"`)
        .send(pdfResult.value);
    },
  );

  // GET /api/nf525/dashboard
  // BUSINESS RULE [NF525-K4]: Dashboard de conformite NF525
  app.get(
    '/api/nf525/dashboard',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const counts = await uncertifiedLookup.countByStatus(request.auth.tenant_id);
      const total = counts.certified + counts.uncertified;
      const certificationRate = total > 0
        ? Math.round((counts.certified / total) * 10000) / 100
        : 0;

      return reply.status(200).send({
        total_invoices: total,
        certified_invoices: counts.certified,
        pending_certification: counts.uncertified,
        certification_rate: certificationRate,
        last_certification: null, // TODO: fetch from repo when needed
        test_mode: testMode,
      });
    },
  );
}
