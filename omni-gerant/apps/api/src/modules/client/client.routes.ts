import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@zenadmin/db';
import { createClientService } from './client.service.js';
import { createPrismaClientRepository } from './client.repository.js';
import { createClientSchema, clientListQuerySchema } from './client.schemas.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';
import { searchCompanies } from '../../lib/company-search.js';
import { createSiretLookup } from '../../lib/siret-lookup.js';

// BUSINESS RULE [CDC-2.1]: Endpoints clients — CRUD + recherche entreprise + creation depuis SIRET

const companySearchQuerySchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters').max(100),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(25).default(10),
});

const fromSiretSchema = z.object({
  siret: z.string().regex(/^\d{14}$/, 'SIRET must be 14 digits'),
});

// BUSINESS RULE [CDC-6]: Rate limiting per-tenant for company search
const searchRateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_SEARCH_PER_MINUTE = 10;

function checkSearchRateLimit(tenantId: string): boolean {
  const now = Date.now();
  const entry = searchRateLimits.get(tenantId);
  if (!entry || entry.resetAt < now) {
    searchRateLimits.set(tenantId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= MAX_SEARCH_PER_MINUTE) return false;
  entry.count++;
  return true;
}

export async function clientRoutes(app: FastifyInstance) {
  const repo = createPrismaClientRepository();
  const clientService = createClientService(repo);
  const siretLookup = createSiretLookup();
  const preHandlers = [authenticate, injectTenant];

  // GET /api/clients — List clients with optional ?search=
  app.get(
    '/api/clients',
    { preHandler: [...preHandlers, requirePermission('client', 'read')] },
    async (request, reply) => {
      const parsed = clientListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: { issues: parsed.error.issues } },
        });
      }
      const result = await clientService.listClients(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // POST /api/clients — Create a client
  app.post(
    '/api/clients',
    { preHandler: [...preHandlers, requirePermission('client', 'create')] },
    async (request, reply) => {
      const parsed = createClientSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid client data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await clientService.createClient(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/clients/company-search — Search companies by name (public API)
  app.get(
    '/api/clients/company-search',
    { preHandler: [authenticate, injectTenant] },
    async (request, reply) => {
      const parsed = companySearchQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid search query', details: { issues: parsed.error.issues } },
        });
      }

      // BUSINESS RULE [CDC-6]: Rate limit company searches per tenant
      if (!checkSearchRateLimit(request.auth.tenant_id)) {
        return reply.status(429).send({
          error: { code: 'RATE_LIMITED', message: 'Too many company searches. Please wait a moment.' },
        });
      }

      const result = await searchCompanies({
        query: parsed.data.q,
        page: parsed.data.page,
        perPage: parsed.data.per_page,
      });

      if (!result.ok) {
        return reply.status(500).send({ error: result.error });
      }
      return result.value;
    },
  );

  // POST /api/clients/from-siret — Create client from SIRET lookup with deduplication
  app.post(
    '/api/clients/from-siret',
    { preHandler: [...preHandlers, requirePermission('client', 'create')] },
    async (request, reply) => {
      const parsed = fromSiretSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid SIRET', details: { issues: parsed.error.issues } },
        });
      }

      const { siret } = parsed.data;
      const tenantId = request.auth.tenant_id;

      // BUSINESS RULE [CDC-4]: Deduplication — if SIRET already exists for this tenant, return existing
      const existing = await prisma.client.findFirst({
        where: { tenant_id: tenantId, siret },
      });
      if (existing) {
        return reply.status(200).send(existing);
      }

      // Lookup SIRET via cascade (Pappers -> SIRENE -> data.gouv.fr)
      const lookupResult = await siretLookup.lookup(siret);
      if (!lookupResult.ok) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: `Entreprise introuvable pour le SIRET ${siret}` },
        });
      }

      const info = lookupResult.value;
      const createResult = await clientService.createClient(tenantId, {
        type: 'company',
        company_name: info.company_name,
        siret: info.siret,
        address_line1: info.address.line1,
        zip_code: info.address.zip_code,
        city: info.address.city,
        country: info.address.country,
        payment_terms: 30,
      });

      if (!createResult.ok) {
        return reply.status(400).send({ error: createResult.error });
      }
      return reply.status(201).send(createResult.value);
    },
  );

  // GET /api/clients/:id
  app.get(
    '/api/clients/:id',
    { preHandler: [...preHandlers, requirePermission('client', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await clientService.getClient(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );
}
