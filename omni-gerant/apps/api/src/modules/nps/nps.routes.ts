import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague J2 : Net Promoter Score.
// - /api/public/nps : endpoint public pour soumettre via lien email.
// - /api/nps : tenant voit historique + score aggregate.

const submitSchema = z.object({
  tenant_id: z.string().uuid(),
  score: z.number().int().min(0).max(10),
  comment: z.string().max(1000).optional(),
  client_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid().optional(),
  source: z.enum(['email', 'portal', 'in_app']).default('email'),
});

export async function npsRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // POST public : submit response
  app.post('/api/public/nps', async (request, reply) => {
    const parsed = submitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Score requis 0..10.' } });
    }
    if (!process.env['DATABASE_URL']) return reply.status(503).send({ error: { code: 'SERVICE_UNAVAILABLE', message: 'DB indisponible' } });
    const { prisma } = await import('@zenadmin/db');
    await (prisma as unknown as { npsResponse?: { create?: Function } })
      .npsResponse?.create?.({
        data: {
          tenant_id: parsed.data.tenant_id,
          client_id: parsed.data.client_id ?? null,
          invoice_id: parsed.data.invoice_id ?? null,
          score: parsed.data.score,
          comment: parsed.data.comment ?? null,
          source: parsed.data.source,
        },
      });
    return reply.status(201).send({ thanks: true });
  });

  // GET tenant : history + aggregate
  app.get('/api/nps/summary', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { responses: 0, promoters: 0, passives: 0, detractors: 0, nps: null };
    const { prisma } = await import('@zenadmin/db');
    const items = await (prisma as unknown as { npsResponse?: { findMany?: Function } })
      .npsResponse?.findMany?.({
        where: { tenant_id: request.auth.tenant_id },
        orderBy: { created_at: 'desc' },
        take: 500,
      }) ?? [];
    const promoters = (items as Array<{ score: number }>).filter((r) => r.score >= 9).length;
    const passives = (items as Array<{ score: number }>).filter((r) => r.score >= 7 && r.score <= 8).length;
    const detractors = (items as Array<{ score: number }>).filter((r) => r.score <= 6).length;
    const total = items.length;
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : null;
    return {
      responses: total,
      promoters,
      passives,
      detractors,
      nps, // -100 .. +100
      recent: (items as Array<{ score: number; comment: string | null; created_at: Date }>).slice(0, 20),
    };
  });
}
