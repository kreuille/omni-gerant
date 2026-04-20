import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague R : segments + campagnes + codes de parrainage.

const segmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  filters: z.record(z.unknown()).default({}),
});

const campaignSchema = z.object({
  name: z.string().min(1).max(200),
  channel: z.enum(['email', 'sms']),
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1).max(20_000),
  segment_id: z.string().uuid().optional().nullable(),
  scheduled_at: z.coerce.date().optional().nullable(),
});

interface SegmentFilters {
  client_type?: 'company' | 'individual';
  total_ttc_min_cents?: number;
  last_purchase_after?: string;
  country?: string;
}

async function resolveSegmentClients(tenantId: string, filters: SegmentFilters): Promise<Array<{ id: string; email: string | null; phone: string | null; company_name: string | null; first_name: string | null; last_name: string | null }>> {
  const { prisma } = await import('@zenadmin/db');
  const where: Record<string, unknown> = {
    tenant_id: tenantId,
    deleted_at: null,
    ...(filters.client_type ? { type: filters.client_type } : {}),
    ...(filters.country ? { country: filters.country.toUpperCase() } : {}),
  };
  const clients = await prisma.client.findMany({ where, select: { id: true, email: true, phone: true, company_name: true, first_name: true, last_name: true } });

  if (filters.total_ttc_min_cents || filters.last_purchase_after) {
    const minTotal = filters.total_ttc_min_cents ?? 0;
    const since = filters.last_purchase_after ? new Date(filters.last_purchase_after) : null;
    const invoiceStats = await prisma.invoice.groupBy({
      by: ['client_id'],
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        ...(since ? { issue_date: { gte: since } } : {}),
      },
      _sum: { total_ttc_cents: true },
      _max: { issue_date: true },
    });
    const statsMap = new Map(invoiceStats.map((s) => [s.client_id, { total: s._sum.total_ttc_cents ?? 0, last: s._max.issue_date }]));
    return clients.filter((c) => {
      const s = statsMap.get(c.id);
      if (!s) return minTotal === 0 && !since;
      return s.total >= minTotal && (!since || (s.last && s.last >= since));
    });
  }

  return clients;
}

export async function marketingRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // === Segments ===

  app.get('/api/marketing/segments', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const items = await (prisma as unknown as { marketingSegment?: { findMany?: Function } })
      .marketingSegment?.findMany?.({
        where: { tenant_id: request.auth.tenant_id },
        orderBy: { created_at: 'desc' },
      }) ?? [];
    return { items };
  });

  app.post('/api/marketing/segments', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = segmentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.' } });
    }
    const { prisma } = await import('@zenadmin/db');
    const created = await (prisma as unknown as { marketingSegment?: { create?: Function } })
      .marketingSegment?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          ...parsed.data,
          filters: parsed.data.filters as Record<string, unknown>,
        },
      });
    return reply.status(201).send(created);
  });

  app.get('/api/marketing/segments/:id/preview', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const segment = await (prisma as unknown as { marketingSegment?: { findFirst?: Function } })
      .marketingSegment?.findFirst?.({
        where: { id, tenant_id: request.auth.tenant_id },
      });
    if (!segment) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Segment introuvable' } });
    const clients = await resolveSegmentClients(request.auth.tenant_id, (segment as { filters: SegmentFilters }).filters);
    return { count: clients.length, sample: clients.slice(0, 20) };
  });

  // === Campagnes ===

  app.get('/api/marketing/campaigns', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const items = await (prisma as unknown as { marketingCampaign?: { findMany?: Function } })
      .marketingCampaign?.findMany?.({
        where: { tenant_id: request.auth.tenant_id },
        orderBy: { created_at: 'desc' },
      }) ?? [];
    return { items };
  });

  app.post('/api/marketing/campaigns', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = campaignSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const { prisma } = await import('@zenadmin/db');
    const created = await (prisma as unknown as { marketingCampaign?: { create?: Function } })
      .marketingCampaign?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          ...parsed.data,
          status: parsed.data.scheduled_at ? 'scheduled' : 'draft',
        },
      });
    return reply.status(201).send(created);
  });

  app.post('/api/marketing/campaigns/:id/send', { preHandler: [...preHandlers, requirePermission('client', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const p = prisma as unknown as {
      marketingCampaign?: { findFirst?: Function; update?: Function };
      marketingSegment?: { findFirst?: Function };
    };
    const campaign = await p.marketingCampaign?.findFirst?.({
      where: { id, tenant_id: request.auth.tenant_id },
    }) as { id: string; channel: string; subject: string | null; body: string; segment_id: string | null; status: string } | null;
    if (!campaign) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Campagne introuvable' } });
    if (campaign.status === 'sent' || campaign.status === 'sending') {
      return reply.status(409).send({ error: { code: 'ALREADY_SENT', message: 'Campagne deja envoyee.' } });
    }

    let clients: Array<{ id: string; email: string | null; phone: string | null; company_name: string | null; first_name: string | null; last_name: string | null }> = [];
    if (campaign.segment_id) {
      const segment = await p.marketingSegment?.findFirst?.({
        where: { id: campaign.segment_id, tenant_id: request.auth.tenant_id },
      }) as { filters: SegmentFilters } | null;
      if (segment) {
        clients = await resolveSegmentClients(request.auth.tenant_id, segment.filters);
      }
    } else {
      const allClients = await prisma.client.findMany({
        where: { tenant_id: request.auth.tenant_id, deleted_at: null },
        select: { id: true, email: true, phone: true, company_name: true, first_name: true, last_name: true },
      });
      clients = allClients;
    }

    await p.marketingCampaign?.update?.({
      where: { id: campaign.id },
      data: { status: 'sending' },
    });

    // Envoi asynchrone best-effort
    let sent = 0;
    let failed = 0;
    if (campaign.channel === 'email') {
      const { createEmailService, createDefaultEmailProvider } = await import('../../lib/email.js');
      const emailService = createEmailService(createDefaultEmailProvider());
      for (const c of clients) {
        if (!c.email) { failed++; continue; }
        const name = c.company_name ?? ([c.first_name, c.last_name].filter(Boolean).join(' ') || 'Client');
        const r = await emailService.send({
          to: c.email,
          subject: campaign.subject ?? '(pas de sujet)',
          html: campaign.body.replace(/\{\{name\}\}/g, name),
          text: campaign.body.replace(/<[^>]+>/g, '').replace(/\{\{name\}\}/g, name),
        });
        if (r.ok) sent++; else failed++;
      }
    } else if (campaign.channel === 'sms') {
      const { createDefaultSmsProvider, normalizePhoneFr } = await import('../../lib/sms.js');
      const sms = createDefaultSmsProvider();
      for (const c of clients) {
        if (!c.phone) { failed++; continue; }
        const to = normalizePhoneFr(c.phone);
        if (!to) { failed++; continue; }
        const name = c.company_name ?? ([c.first_name, c.last_name].filter(Boolean).join(' ') || 'Client');
        const r = await sms.send({ to, text: campaign.body.slice(0, 459).replace(/\{\{name\}\}/g, name) });
        if (r.ok) sent++; else failed++;
      }
    }

    await p.marketingCampaign?.update?.({
      where: { id: campaign.id },
      data: {
        status: 'sent',
        sent_at: new Date(),
        stats_sent: sent,
        stats_delivered: sent,
        stats_failed: failed,
      },
    });

    return { sent, failed, total: clients.length };
  });

  // === Referral codes ===

  app.get('/api/marketing/referrals', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const items = await (prisma as unknown as { referralCode?: { findMany?: Function } })
      .referralCode?.findMany?.({
        where: { tenant_id: request.auth.tenant_id },
        orderBy: { created_at: 'desc' },
      }) ?? [];
    return { items };
  });

  app.post('/api/marketing/referrals', { preHandler: preHandlers }, async (request, reply) => {
    const body = (request.body ?? {}) as { owner_client_id?: string; reward_cents?: number; description?: string; max_uses?: number };
    const code = randomBytes(4).toString('hex').toUpperCase();
    const { prisma } = await import('@zenadmin/db');
    const created = await (prisma as unknown as { referralCode?: { create?: Function } })
      .referralCode?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          code,
          owner_client_id: body.owner_client_id ?? null,
          description: body.description ?? null,
          reward_cents: body.reward_cents ?? 0,
          max_uses: body.max_uses ?? null,
        },
      });
    return reply.status(201).send(created);
  });

  // GET public : verifier un code avant application
  app.get('/api/public/referrals/:code', async (request, reply) => {
    const { code } = request.params as { code: string };
    const { prisma } = await import('@zenadmin/db');
    const ref = await (prisma as unknown as { referralCode?: { findUnique?: Function } })
      .referralCode?.findUnique?.({ where: { code: code.toUpperCase() } }) as
      { is_active: boolean; uses_count: number; max_uses: number | null; expires_at: Date | null; reward_cents: number } | null;
    if (!ref || !ref.is_active) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Code inconnu' } });
    if (ref.expires_at && ref.expires_at < new Date()) return reply.status(410).send({ error: { code: 'EXPIRED', message: 'Code expire' } });
    if (ref.max_uses && ref.uses_count >= ref.max_uses) return reply.status(410).send({ error: { code: 'MAX_USES', message: 'Code epuise' } });
    return { valid: true, reward_cents: ref.reward_cents };
  });
}
