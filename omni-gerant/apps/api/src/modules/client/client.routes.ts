import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createClientService, type ClientRepository, type Client } from './client.service.js';
import { createClientSchema, updateClientSchema, clientListQuerySchema } from './client.schemas.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';
import { searchCompanies } from '../../lib/company-search.js';
import { createSiretLookup } from '../../lib/siret-lookup.js';

// BUSINESS RULE [CDC-4]: Endpoints clients avec recherche entreprise publique

const companySearchQuerySchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters').max(100),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export async function clientRoutes(app: FastifyInstance) {
  const clients = new Map<string, Client>();
  const siretLookup = createSiretLookup();

  const repo: ClientRepository = {
    async create(data) {
      const id = crypto.randomUUID();
      const client: Client = {
        id,
        tenant_id: data.tenant_id,
        type: data.type ?? 'company',
        company_name: data.company_name ?? null,
        siret: data.siret ?? null,
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address_line1: data.address_line1 ?? null,
        address_line2: data.address_line2 ?? null,
        zip_code: data.zip_code ?? null,
        city: data.city ?? null,
        country: data.country ?? 'FR',
        notes: data.notes ?? null,
        payment_terms: data.payment_terms ?? 30,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      clients.set(id, client);
      return client;
    },
    async findById(id, tenantId) {
      const c = clients.get(id);
      if (!c || c.tenant_id !== tenantId || c.deleted_at) return null;
      return c;
    },
    async update(id, tenantId, data) {
      const c = clients.get(id);
      if (!c || c.tenant_id !== tenantId || c.deleted_at) return null;
      const updated = { ...c, ...data, updated_at: new Date() } as Client;
      clients.set(id, updated);
      return updated;
    },
    async softDelete(id, tenantId) {
      const c = clients.get(id);
      if (!c || c.tenant_id !== tenantId) return false;
      c.deleted_at = new Date();
      return true;
    },
    async list(tenantId, query) {
      let items = [...clients.values()].filter(
        (c) => c.tenant_id === tenantId && !c.deleted_at,
      );
      if (query.search) {
        const term = query.search.toLowerCase();
        items = items.filter((c) => {
          const name = c.company_name ?? [c.first_name, c.last_name].filter(Boolean).join(' ');
          return name.toLowerCase().includes(term)
            || (c.email?.toLowerCase().includes(term) ?? false)
            || (c.siret?.includes(term) ?? false);
        });
      }
      if (query.type) {
        items = items.filter((c) => c.type === query.type);
      }
      if (query.city) {
        items = items.filter((c) => c.city?.toLowerCase() === query.city!.toLowerCase());
      }
      const total = items.length;
      if (query.sort_by === 'name') {
        items.sort((a, b) => {
          const nameA = (a.company_name ?? a.last_name ?? '').toLowerCase();
          const nameB = (b.company_name ?? b.last_name ?? '').toLowerCase();
          return query.sort_dir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
      } else {
        items.sort((a, b) => {
          return query.sort_dir === 'asc'
            ? a.created_at.getTime() - b.created_at.getTime()
            : b.created_at.getTime() - a.created_at.getTime();
        });
      }
      if (query.cursor) {
        const idx = items.findIndex((c) => c.id === query.cursor);
        if (idx >= 0) items = items.slice(idx + 1);
      }
      items = items.slice(0, query.limit);
      return { items, total };
    },
  };

  const clientService = createClientService(repo);
  const preHandlers = [authenticate, injectTenant];

  // GET /api/clients/company-search — public endpoint (no auth), rate-limited
  app.get(
    '/api/clients/company-search',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const parsed = companySearchQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid search query', details: { issues: parsed.error.issues } },
        });
      }

      const result = await searchCompanies({
        query: parsed.data.q,
        perPage: parsed.data.limit,
      });

      if (!result.ok) {
        return reply.send({ results: [], total: 0 });
      }

      return result.value;
    },
  );

  // POST /api/clients/from-siret — create client from SIRET lookup
  app.post(
    '/api/clients/from-siret',
    { preHandler: [...preHandlers, requirePermission('client', 'create')] },
    async (request, reply) => {
      const schema = z.object({ siret: z.string().regex(/^\d{14}$/, 'SIRET must be 14 digits') });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid SIRET', details: { issues: parsed.error.issues } },
        });
      }

      const tenantId = request.auth.tenant_id;
      const { siret } = parsed.data;

      // BUSINESS RULE: Deduplication — check if a client with this SIRET already exists
      const existing = [...clients.values()].find(
        (c) => c.siret === siret && c.tenant_id === tenantId && !c.deleted_at,
      );
      if (existing) {
        return reply.send({ client: existing, existing: true });
      }

      const lookupResult = await siretLookup.lookup(siret);
      if (!lookupResult.ok) {
        return reply.status(502).send({
          error: { code: 'SIRET_LOOKUP_FAILED', message: lookupResult.error.message },
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

      return reply.status(201).send({
        client: createResult.value,
        siretInfo: {
          naf_code: info.naf_code,
          naf_label: info.naf_label,
          legal_form: info.legal_form,
          tva_number: info.tva_number,
          effectif_reel: info.effectif_reel,
          convention_collective: info.convention_collective,
        },
      });
    },
  );

  // POST /api/clients
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
      return reply.status(201).send({ client: result.value });
    },
  );

  // GET /api/clients
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

  // PUT /api/clients/:id
  app.put(
    '/api/clients/:id',
    { preHandler: [...preHandlers, requirePermission('client', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateClientSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid client data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await clientService.updateClient(id, request.auth.tenant_id, parsed.data);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return result.value;
    },
  );

  // DELETE /api/clients/:id
  app.delete(
    '/api/clients/:id',
    { preHandler: [...preHandlers, requirePermission('client', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await clientService.deleteClient(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return reply.status(204).send();
    },
  );
}
