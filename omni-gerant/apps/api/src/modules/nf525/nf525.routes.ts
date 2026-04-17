// BUSINESS RULE [NF525-K1]: Routes de certification NF525
// POST /api/invoices/:id/certify - Re-try certification for an invoice
// GET  /api/invoices/:id/nf525   - Get NF525 status for an invoice

import type { FastifyInstance } from 'fastify';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';
import type { Nf525CertificationService } from './nf525-certification.service.js';

export interface Nf525RouteDeps {
  certificationService: Nf525CertificationService;
}

export async function nf525Routes(app: FastifyInstance, deps: Nf525RouteDeps) {
  const { certificationService } = deps;
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
}
