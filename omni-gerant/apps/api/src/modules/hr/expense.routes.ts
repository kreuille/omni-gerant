import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague O2 : Notes de frais + O3 indemnites kilometriques

// Bareme kilometrique URSSAF 2024 (voitures, CV <= 7+)
// https://www.service-public.fr/particuliers/vosdroits/F1311
// Formule simplifiee : d * coef + constante, selon CV et tranches (d <= 5000, 5001-20000, >20000)
const MILEAGE_COEFS: Record<number, { upTo5k: number; upTo20k: [number, number]; above20k: number }> = {
  3: { upTo5k: 0.529, upTo20k: [0.316, 1065], above20k: 0.370 },
  4: { upTo5k: 0.606, upTo20k: [0.340, 1330], above20k: 0.407 },
  5: { upTo5k: 0.636, upTo20k: [0.357, 1395], above20k: 0.427 },
  6: { upTo5k: 0.665, upTo20k: [0.374, 1457], above20k: 0.447 },
  7: { upTo5k: 0.697, upTo20k: [0.394, 1515], above20k: 0.470 },
};

function mileageAmountCents(km: number, cv: number): number {
  const coef = MILEAGE_COEFS[cv] ?? MILEAGE_COEFS[7]!;
  let amount: number;
  if (km <= 5000) amount = km * coef.upTo5k;
  else if (km <= 20000) amount = km * coef.upTo20k[0] + coef.upTo20k[1];
  else amount = km * coef.above20k;
  return Math.round(amount * 100);
}

const expenseSchema = z.object({
  employee_id: z.string().uuid(),
  date: z.coerce.date(),
  category: z.enum(['meal', 'transport', 'hotel', 'supplies', 'fuel', 'other']),
  description: z.string().min(1).max(500),
  amount_ttc_cents: z.number().int().min(0),
  tva_rate: z.number().int().refine((v) => [0, 550, 1000, 2000].includes(v)).default(2000),
  receipt_url: z.string().url().optional().nullable(),
});

const mileageSchema = z.object({
  employee_id: z.string().uuid(),
  date: z.coerce.date(),
  origin: z.string().min(1).max(200),
  destination: z.string().min(1).max(200),
  purpose: z.string().min(1).max(200),
  distance_km: z.number().min(0.1).max(10000),
  vehicle_cv: z.number().int().min(3).max(7).default(5),
});

export async function expenseRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // === Notes de frais ===

  app.get('/api/hr/expenses', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const q = request.query as { employee_id?: string; status?: string };
    const items = await (prisma as unknown as { expenseClaim?: { findMany?: Function } })
      .expenseClaim?.findMany?.({
        where: {
          tenant_id: request.auth.tenant_id,
          ...(q.employee_id ? { employee_id: q.employee_id } : {}),
          ...(q.status ? { status: q.status } : {}),
        },
        orderBy: { date: 'desc' },
        take: 200,
      }) ?? [];
    return { items };
  });

  app.post('/api/hr/expenses', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = expenseSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const { prisma } = await import('@zenadmin/db');
    const year = parsed.data.date.getUTCFullYear();
    const count = await (prisma as unknown as { expenseClaim?: { count?: Function } })
      .expenseClaim?.count?.({
        where: { tenant_id: request.auth.tenant_id, claim_number: { startsWith: `NDF-${year}-` } },
      }) ?? 0;
    const claimNumber = `NDF-${year}-${String(count + 1).padStart(5, '0')}`;
    const tvaCents = Math.round(parsed.data.amount_ttc_cents * parsed.data.tva_rate / (10000 + parsed.data.tva_rate));
    const created = await (prisma as unknown as { expenseClaim?: { create?: Function } })
      .expenseClaim?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          employee_id: parsed.data.employee_id,
          claim_number: claimNumber,
          date: parsed.data.date,
          category: parsed.data.category,
          description: parsed.data.description,
          amount_ttc_cents: parsed.data.amount_ttc_cents,
          tva_rate: parsed.data.tva_rate,
          tva_cents: tvaCents,
          receipt_url: parsed.data.receipt_url ?? null,
          status: 'pending',
        },
      });
    return reply.status(201).send(created);
  });

  app.post('/api/hr/expenses/:id/approve', { preHandler: [...preHandlers, requirePermission('legal', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    await (prisma as unknown as { expenseClaim?: { updateMany?: Function } })
      .expenseClaim?.updateMany?.({
        where: { id, tenant_id: request.auth.tenant_id, status: 'pending' },
        data: { status: 'approved', approver_id: request.auth.user_id, approved_at: new Date() },
      });
    return { approved: true };
  });

  app.post('/api/hr/expenses/:id/reimburse', { preHandler: [...preHandlers, requirePermission('legal', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    await (prisma as unknown as { expenseClaim?: { updateMany?: Function } })
      .expenseClaim?.updateMany?.({
        where: { id, tenant_id: request.auth.tenant_id, status: 'approved' },
        data: { status: 'reimbursed', reimbursed_at: new Date() },
      });
    return { reimbursed: true };
  });

  // === Indemnites kilometriques ===

  app.get('/api/hr/mileage', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [], total_cents: 0 };
    const { prisma } = await import('@zenadmin/db');
    const q = request.query as { employee_id?: string };
    const items = await (prisma as unknown as { mileageLog?: { findMany?: Function } })
      .mileageLog?.findMany?.({
        where: {
          tenant_id: request.auth.tenant_id,
          ...(q.employee_id ? { employee_id: q.employee_id } : {}),
        },
        orderBy: { date: 'desc' },
        take: 200,
      }) ?? [];
    const total = (items as Array<{ amount_cents: number }>).reduce((s, i) => s + i.amount_cents, 0);
    return { items, total_cents: total };
  });

  app.post('/api/hr/mileage', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = mileageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const amountCents = mileageAmountCents(parsed.data.distance_km, parsed.data.vehicle_cv);
    const { prisma } = await import('@zenadmin/db');
    const created = await (prisma as unknown as { mileageLog?: { create?: Function } })
      .mileageLog?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          employee_id: parsed.data.employee_id,
          date: parsed.data.date,
          origin: parsed.data.origin,
          destination: parsed.data.destination,
          purpose: parsed.data.purpose,
          distance_km: parsed.data.distance_km,
          vehicle_cv: parsed.data.vehicle_cv,
          amount_cents: amountCents,
        },
      });
    return reply.status(201).send(created);
  });

  app.get('/api/hr/mileage/rate', { preHandler: preHandlers }, async (request) => {
    const q = request.query as { distance_km?: string; vehicle_cv?: string };
    const km = Number(q.distance_km ?? '1');
    const cv = Number(q.vehicle_cv ?? '5');
    return {
      distance_km: km,
      vehicle_cv: cv,
      amount_cents: mileageAmountCents(km, cv),
      bareme_year: 2024,
    };
  });
}
