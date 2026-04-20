import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';
import { sendEmailOtp, verifyEmailOtp } from './email-otp.service.js';

// Vague K3 : endpoints 2FA email

export async function emailOtpRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // POST /api/auth/otp/request — envoi code par email (authentifie)
  app.post(
    '/api/auth/otp/request',
    { preHandler: preHandlers },
    async (request, reply) => {
      const body = (request.body ?? {}) as { purpose?: 'login' | 'sensitive_action' };
      if (!process.env['DATABASE_URL']) return reply.status(503).send({ error: { code: 'SERVICE_UNAVAILABLE', message: 'DB indisponible' } });
      const { prisma } = await import('@zenadmin/db');
      const user = await prisma.user.findUnique({ where: { id: request.auth.user_id } });
      if (!user) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User introuvable' } });
      const r = await sendEmailOtp(user.id, user.email, body.purpose ?? 'sensitive_action');
      return r;
    },
  );

  const verifySchema = z.object({
    code: z.string().regex(/^\d{6}$/, 'Code à 6 chiffres'),
    purpose: z.enum(['login', 'sensitive_action']).default('sensitive_action'),
  });

  app.post(
    '/api/auth/otp/verify',
    { preHandler: preHandlers },
    async (request, reply) => {
      const parsed = verifySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Code invalide.' } });
      }
      const r = await verifyEmailOtp(request.auth.user_id, parsed.data.code, parsed.data.purpose);
      if (!r.valid) {
        return reply.status(401).send({ error: { code: 'OTP_INVALID', message: `Code rejeté : ${r.reason}` } });
      }
      return { verified: true };
    },
  );
}
