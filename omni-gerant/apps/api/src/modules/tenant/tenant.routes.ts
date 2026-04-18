import type { FastifyInstance } from 'fastify';
import { createTenantService } from './tenant.service.js';
import { updateTenantProfileSchema, siretLookupSchema } from './tenant.schemas.js';
import { createSiretLookup } from '../../lib/siret-lookup.js';
import { createViesClient } from '../../lib/vies-client.js';
import { getAllLegalForms } from './legal-form.js';
import { getAllTvaRegimes } from './tva-regime.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-11.1]: Routes profil entreprise complet

export async function tenantRoutes(app: FastifyInstance) {
  const tenantService = createTenantService();
  const siretLookup = createSiretLookup();
  const viesClient = createViesClient();

  const preHandlers = [authenticate, injectTenant];

  // GET /api/tenant/profile — Get current tenant profile
  app.get(
    '/api/tenant/profile',
    { preHandler: [...preHandlers, requirePermission('settings', 'read')] },
    async (request, reply) => {
      const result = await tenantService.getProfile(request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });

      const profile = result.value;
      const franchiseCheck = tenantService.getFranchiseCheck(profile);
      const legalMentions = tenantService.getLegalMentions(profile);

      return {
        ...profile,
        franchise_check: franchiseCheck,
        legal_mentions: legalMentions,
      };
    },
  );

  // PUT /api/tenant/profile — Update tenant profile
  app.put(
    '/api/tenant/profile',
    { preHandler: [...preHandlers, requirePermission('settings', 'update')] },
    async (request, reply) => {
      const parsed = updateTenantProfileSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Données invalides', details: { issues: parsed.error.issues } },
        });
      }

      const result = await tenantService.updateProfile(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(400).send({ error: result.error });

      const profile = result.value;
      const franchiseCheck = tenantService.getFranchiseCheck(profile);
      const legalMentions = tenantService.getLegalMentions(profile);

      return {
        ...profile,
        franchise_check: franchiseCheck,
        legal_mentions: legalMentions,
      };
    },
  );

  // POST /api/tenant/profile/lookup-siret — Lookup SIRET and auto-fill profile
  app.post(
    '/api/tenant/profile/lookup-siret',
    { preHandler: [...preHandlers, requirePermission('settings', 'update')] },
    async (request, reply) => {
      const body = request.body as { siret?: string } | undefined;
      const rawSiret = body?.siret?.replace(/\s/g, '');

      if (!rawSiret) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'SIRET requis' },
        });
      }

      const parsed = siretLookupSchema.safeParse({ siret: rawSiret });
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Format SIRET invalide (14 chiffres)', details: { issues: parsed.error.issues } },
        });
      }

      // Lookup SIRET (3-layer cascade)
      const lookupResult = await siretLookup.lookup(parsed.data.siret);
      if (!lookupResult.ok) {
        const status = lookupResult.error.code === 'NOT_FOUND' ? 404 : 503;
        return reply.status(status).send({ error: lookupResult.error });
      }

      // Auto-fill profile
      const fillResult = await tenantService.autoFillFromSiret(
        request.auth.tenant_id,
        lookupResult.value,
      );
      if (!fillResult.ok) return reply.status(500).send({ error: fillResult.error });

      const profile = fillResult.value;
      const franchiseCheck = tenantService.getFranchiseCheck(profile);
      const legalMentions = tenantService.getLegalMentions(profile);

      return {
        ...profile,
        franchise_check: franchiseCheck,
        legal_mentions: legalMentions,
        lookup_source: lookupResult.value.source,
      };
    },
  );

  // POST /api/tenant/profile/verify-tva — Verify TVA number via VIES
  app.post(
    '/api/tenant/profile/verify-tva',
    { preHandler: [...preHandlers, requirePermission('settings', 'read')] },
    async (request, reply) => {
      const body = request.body as { tva_number?: string } | undefined;
      const tvaNumber = body?.tva_number?.replace(/\s/g, '');

      if (!tvaNumber || tvaNumber.length < 4) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Numéro TVA invalide' },
        });
      }

      const countryCode = tvaNumber.substring(0, 2);
      const vatNumber = tvaNumber.substring(2);

      const result = await viesClient.checkVatNumber(countryCode, vatNumber);
      if (!result.ok) return reply.status(503).send({ error: result.error });

      return result.value;
    },
  );

  // GET /api/tenant/legal-forms — List all legal forms
  app.get(
    '/api/tenant/legal-forms',
    { preHandler: preHandlers },
    async () => {
      return getAllLegalForms();
    },
  );

  // GET /api/tenant/tva-regimes — List all TVA regimes
  app.get(
    '/api/tenant/tva-regimes',
    { preHandler: preHandlers },
    async () => {
      return getAllTvaRegimes();
    },
  );

  // ---- Legacy endpoints (backward compat) ----

  // GET /api/tenants/me — Legacy: redirect to profile
  app.get('/api/tenants/me', { preHandler: preHandlers }, async (request, reply) => {
    const result = await tenantService.getProfile(request.auth.tenant_id);
    if (!result.ok) return reply.status(404).send({ error: result.error });
    return result.value;
  });

  // PATCH /api/tenants/me — Legacy update
  app.patch('/api/tenants/me', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = updateTenantProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: { issues: parsed.error.issues } },
      });
    }
    const result = await tenantService.updateProfile(request.auth.tenant_id, parsed.data);
    if (!result.ok) return reply.status(404).send({ error: result.error });
    return result.value;
  });

  // GET /api/lookup/siret/:siret — Legacy SIRET lookup (public-ish)
  app.get('/api/lookup/siret/:siret', async (request, reply) => {
    const { siret } = request.params as { siret: string };
    const normalizedSiret = siret.replace(/\s/g, '');
    const parsed = siretLookupSchema.safeParse({ siret: normalizedSiret });
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid SIRET format', details: { issues: parsed.error.issues } },
      });
    }
    const result = await siretLookup.lookup(parsed.data.siret);
    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404
        : result.error.code === 'SIRET_LOOKUP_UNAVAILABLE' ? 503
        : 502;
      return reply.status(status).send({ error: result.error });
    }
    return result.value;
  });
}
