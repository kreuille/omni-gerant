import type { FastifyInstance } from 'fastify';
import { createQuoteService, type QuoteRepository, type Quote, type QuoteLine } from './quote.service.js';
import { createQuoteSchema, updateQuoteSchema, quoteListSchema } from './quote.schemas.js';
import { createDocumentNumberGenerator, createInMemoryNumberRepo } from './document-number.js';
import { createPrismaQuoteRepository } from './quote.repository.js';
import { getNextStatus } from './quote-workflow.js';
import { createShareService, type ShareTokenRepository, type ShareToken } from './quote-share.js';
import { createTrackingService, type TrackingRepository, type TrackingEvent } from './quote-tracking.js';
import { createEmailService, createConsoleEmailProvider } from '../../lib/email.js';
import { quoteSentHtml, quoteSentText } from '../../lib/email-templates/quote-sent.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';
import { createTenantRepository } from '../tenant/tenant.repository.js';
import { ok } from '@zenadmin/shared';
import { z } from 'zod';

// BUSINESS RULE [CDC-2.1]: Endpoints devis

export async function quoteRoutes(app: FastifyInstance) {
  const repo = createPrismaQuoteRepository();
  const tenantRepo = createTenantRepository();

  // Placeholder share token repo (will be migrated in a future prompt)
  const shareTokenRepo: ShareTokenRepository = {
    async create(data) {
      return {
        id: crypto.randomUUID(), ...data,
        viewed_at: null, signed_at: null, created_at: new Date(),
      };
    },
    async findByTokenHash(_hash) { return null; },
    async markViewed(_id) {},
    async markSigned(_id, _sig) {},
  };

  // Placeholder tracking repo (will be migrated in a future prompt)
  const trackingRepo: TrackingRepository = {
    async create(data) {
      return {
        id: crypto.randomUUID(), ...data,
        ip_address: data.ip_address ?? null,
        user_agent: data.user_agent ?? null,
        metadata: data.metadata ?? null,
        created_at: new Date(),
      };
    },
    async findByQuote(_quoteId, _tenantId) { return []; },
  };

  // Use in-memory number repo (advisory locks require real PostgreSQL connection)
  const numberRepo = createInMemoryNumberRepo();
  const numberGen = createDocumentNumberGenerator(numberRepo);
  const quoteService = createQuoteService(repo, {
    generate: (tenantId: string) => numberGen.generate(tenantId, 'DEV'),
  });
  const shareService = createShareService(shareTokenRepo);
  const trackingService = createTrackingService(trackingRepo);
  const emailService = createEmailService(createConsoleEmailProvider());

  const preHandlers = [authenticate, injectTenant];

  // POST /api/quotes
  app.post(
    '/api/quotes',
    { preHandler: [...preHandlers, requirePermission('quote', 'create')] },
    async (request, reply) => {
      const parsed = createQuoteSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid quote data',
            details: { issues: parsed.error.issues },
          },
        });
      }

      const result = await quoteService.create(request.auth.tenant_id, parsed.data);
      if (!result.ok) {
        return reply.status(400).send({ error: result.error });
      }
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/quotes
  app.get(
    '/api/quotes',
    { preHandler: [...preHandlers, requirePermission('quote', 'read')] },
    async (request, reply) => {
      const parsed = quoteListSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: { issues: parsed.error.issues },
          },
        });
      }

      const result = await quoteService.list(request.auth.tenant_id, parsed.data);
      if (!result.ok) {
        return reply.status(500).send({ error: result.error });
      }
      return result.value;
    },
  );

  // GET /api/quotes/:id
  app.get(
    '/api/quotes/:id',
    { preHandler: [...preHandlers, requirePermission('quote', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await quoteService.getById(id, request.auth.tenant_id);
      if (!result.ok) {
        return reply.status(404).send({ error: result.error });
      }

      const tenant = await tenantRepo.findById(request.auth.tenant_id);
      const quote = result.value;

      return {
        ...quote,
        company: tenant ? {
          name: tenant.company_name,
          siret: tenant.siret,
          address: tenant.address?.line1 ?? null,
          zip_code: tenant.address?.zip_code ?? null,
          city: tenant.address?.city ?? null,
          phone: tenant.phone ?? null,
          email: tenant.email ?? null,
          tva_number: tenant.tva_number ?? null,
          legal_form: tenant.legal_form ?? null,
        } : null,
      };
    },
  );

  // PATCH /api/quotes/:id
  app.patch(
    '/api/quotes/:id',
    { preHandler: [...preHandlers, requirePermission('quote', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateQuoteSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid quote data',
            details: { issues: parsed.error.issues },
          },
        });
      }

      const result = await quoteService.update(id, request.auth.tenant_id, parsed.data);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 403;
        return reply.status(status).send({ error: result.error });
      }
      return result.value;
    },
  );

  // DELETE /api/quotes/:id
  app.delete(
    '/api/quotes/:id',
    { preHandler: [...preHandlers, requirePermission('quote', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await quoteService.delete(id, request.auth.tenant_id);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 403;
        return reply.status(status).send({ error: result.error });
      }
      return reply.status(204).send();
    },
  );

  // POST /api/quotes/:id/send - send quote to client
  app.post(
    '/api/quotes/:id/send',
    { preHandler: [...preHandlers, requirePermission('quote', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const quoteResult = await quoteService.getById(id, request.auth.tenant_id);
      if (!quoteResult.ok) {
        return reply.status(404).send({ error: quoteResult.error });
      }
      const quote = quoteResult.value;

      // Transition draft → sent
      const nextStatus = getNextStatus(quote.status as 'draft', 'send');
      if (!nextStatus.ok) {
        return reply.status(403).send({ error: nextStatus.error });
      }

      // Generate share token
      const tokenResult = await shareService.generateToken(
        quote.id, quote.tenant_id, quote.validity_date,
      );
      if (!tokenResult.ok) {
        return reply.status(500).send({ error: tokenResult.error });
      }

      // Track event
      await trackingService.track({
        quote_id: quote.id,
        tenant_id: quote.tenant_id,
        event_type: 'sent',
        actor: request.auth.user_id,
      });

      // Get tenant profile for company name
      const tenantProfile = await tenantRepo.findById(quote.tenant_id);
      const companyName = tenantProfile?.company_name ?? 'Votre entreprise';
      const clientName = quote.client_name ?? 'Client';
      const clientEmail = quote.client_email;

      // Send email
      const shareUrl = `${process.env['APP_URL'] ?? 'http://localhost:3000'}/share/quote/${tokenResult.value.token}`;
      const totalTtc = (quote.total_ttc_cents / 100).toFixed(2).replace('.', ',') + ' EUR';
      const validityDate = quote.validity_date.toLocaleDateString('fr-FR');

      if (clientEmail) {
        await emailService.send({
          to: clientEmail,
          subject: `Devis ${quote.number} de ${companyName} - En attente de validation`,
          html: quoteSentHtml({
            client_name: clientName,
            company_name: companyName,
            quote_number: quote.number,
            quote_title: quote.title,
            total_ttc: totalTtc,
            validity_date: validityDate,
            share_url: shareUrl,
          }),
          text: quoteSentText({
            client_name: clientName,
            company_name: companyName,
            quote_number: quote.number,
            quote_title: quote.title,
            total_ttc: totalTtc,
            validity_date: validityDate,
            share_url: shareUrl,
          }),
        });
      }

      return {
        status: 'sent',
        share_url: shareUrl,
        email_sent: !!clientEmail,
        client_email: clientEmail,
      };
    },
  );

  // POST /api/quotes/:id/duplicate
  app.post(
    '/api/quotes/:id/duplicate',
    { preHandler: [...preHandlers, requirePermission('quote', 'create')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const quoteResult = await quoteService.getById(id, request.auth.tenant_id);
      if (!quoteResult.ok) {
        return reply.status(404).send({ error: quoteResult.error });
      }
      const original = quoteResult.value;

      // Create a copy as draft
      const duplicateResult = await quoteService.create(request.auth.tenant_id, {
        client_id: original.client_id,
        title: original.title ? `${original.title} (copie)` : undefined,
        description: original.description ?? undefined,
        validity_days: 30,
        deposit_rate: original.deposit_rate ?? undefined,
        discount_type: (original.discount_type as 'percentage' | 'fixed') ?? undefined,
        discount_value: original.discount_value ?? undefined,
        notes: original.notes ?? undefined,
        lines: original.lines.map((l) => ({
          product_id: l.product_id ?? undefined,
          position: l.position,
          type: l.type as 'line' | 'section' | 'subtotal' | 'comment',
          label: l.label,
          description: l.description ?? undefined,
          quantity: l.quantity,
          unit: l.unit,
          unit_price_cents: l.unit_price_cents,
          tva_rate: l.tva_rate,
          discount_type: (l.discount_type as 'percentage' | 'fixed') ?? undefined,
          discount_value: l.discount_value ?? undefined,
        })),
      });

      if (!duplicateResult.ok) {
        return reply.status(400).send({ error: duplicateResult.error });
      }

      await trackingService.track({
        quote_id: original.id,
        tenant_id: original.tenant_id,
        event_type: 'duplicated',
        actor: request.auth.user_id,
        metadata: { new_quote_id: duplicateResult.value.id },
      });

      return reply.status(201).send(duplicateResult.value);
    },
  );

  // GET /api/quotes/:id/timeline
  app.get(
    '/api/quotes/:id/timeline',
    { preHandler: [...preHandlers, requirePermission('quote', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const events = await trackingService.getTimeline(id, request.auth.tenant_id);
      return events;
    },
  );

  // === Public share routes (no auth required) ===

  // GET /api/share/quote/:token - view shared quote
  app.get('/api/share/quote/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const result = await shareService.markViewed(token);
    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 401;
      return reply.status(status).send({ error: result.error });
    }

    const shareToken = result.value;
    const quoteResult = await repo.findById(shareToken.quote_id, shareToken.tenant_id);
    if (!quoteResult) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }

    // Track viewing
    await trackingService.track({
      quote_id: shareToken.quote_id,
      tenant_id: shareToken.tenant_id,
      event_type: 'viewed',
      actor: 'client',
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
    });

    // Get company info for the public share page
    const tenant = await tenantRepo.findById(shareToken.tenant_id);

    return {
      quote: {
        number: quoteResult.number,
        title: quoteResult.title,
        description: quoteResult.description,
        status: quoteResult.status,
        issue_date: quoteResult.issue_date,
        validity_date: quoteResult.validity_date,
        total_ht_cents: quoteResult.total_ht_cents,
        total_tva_cents: quoteResult.total_tva_cents,
        total_ttc_cents: quoteResult.total_ttc_cents,
        notes: quoteResult.notes,
        lines: quoteResult.lines,
        client_name: quoteResult.client_name,
        client_address: quoteResult.client_address,
        client_zip_code: quoteResult.client_zip_code,
        client_city: quoteResult.client_city,
        client_siret: quoteResult.client_siret,
      },
      company: tenant ? {
        name: tenant.company_name,
        siret: tenant.siret,
        address: tenant.address?.line1 ?? null,
        zip_code: tenant.address?.zip_code ?? null,
        city: tenant.address?.city ?? null,
        phone: tenant.phone ?? null,
        email: tenant.email ?? null,
        tva_number: tenant.tva_number ?? null,
      } : null,
      can_sign: !shareToken.signed_at,
    };
  });

  // POST /api/share/quote/:token/sign - sign shared quote
  const signSchema = z.object({
    signer_name: z.string().min(1).max(200),
    signer_first_name: z.string().min(1).max(200),
    signature_image: z.string().max(500000).optional(), // Base64 canvas
  });

  app.post('/api/share/quote/:token/sign', async (request, reply) => {
    const { token } = request.params as { token: string };

    const parsed = signSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid signature data',
          details: { issues: parsed.error.issues },
        },
      });
    }

    const result = await shareService.sign(token, {
      signer_name: parsed.data.signer_name,
      signer_first_name: parsed.data.signer_first_name,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] ?? '',
      signed_at: new Date(),
      signature_image: parsed.data.signature_image,
    });

    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 401;
      return reply.status(status).send({ error: result.error });
    }

    // Track signing
    await trackingService.track({
      quote_id: result.value.quote_id,
      tenant_id: result.value.tenant_id,
      event_type: 'signed',
      actor: 'client',
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
      metadata: {
        signer_name: parsed.data.signer_name,
        signer_first_name: parsed.data.signer_first_name,
      },
    });

    return { status: 'signed' };
  });

  // POST /api/share/quote/:token/refuse - client refuses quote
  const refuseSchema = z.object({
    reason: z.string().max(2000).optional(),
  });

  app.post('/api/share/quote/:token/refuse', async (request, reply) => {
    const { token } = request.params as { token: string };
    const parsed = refuseSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid refuse data' },
      });
    }

    // Look up the share token to find the quote
    const viewResult = await shareService.markViewed(token);
    if (!viewResult.ok) {
      const status = viewResult.error.code === 'NOT_FOUND' ? 404 : 401;
      return reply.status(status).send({ error: viewResult.error });
    }
    const shareToken = viewResult.value;

    // Transition quote to refused
    const updated = await repo.update(shareToken.quote_id, shareToken.tenant_id, {
      status: 'refused',
    });
    if (!updated) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }

    // Track refusal
    await trackingService.track({
      quote_id: shareToken.quote_id,
      tenant_id: shareToken.tenant_id,
      event_type: 'refused',
      actor: 'client',
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
      metadata: parsed.data.reason ? { reason: parsed.data.reason } : undefined,
    });

    return { status: 'refused' };
  });
}
