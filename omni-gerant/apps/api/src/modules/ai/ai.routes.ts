import type { FastifyInstance } from 'fastify';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague M : routes IA — insights, assistant contextuel.

export async function aiRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // GET /api/ai/insights — detecte anomalies + predictions
  app.get(
    '/api/ai/insights',
    { preHandler: [...preHandlers, requirePermission('dashboard', 'read')] },
    async (request, reply) => {
      try {
        const { computeInsights } = await import('./ai-insights.service.js');
        const items = await computeInsights(request.auth.tenant_id);
        return { items };
      } catch (e) {
        return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: e instanceof Error ? e.message : 'unknown' } });
      }
    },
  );

  // POST /api/ai/chat — assistant contextuel (OpenAI si dispo)
  app.post(
    '/api/ai/chat',
    { preHandler: preHandlers },
    async (request, reply) => {
      const body = (request.body ?? {}) as { question?: string; context?: string };
      if (!body.question || body.question.trim().length < 3) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'question requise (>= 3 caractères).' } });
      }
      const apiKey = process.env['OPENAI_API_KEY'];
      if (!apiKey) {
        return reply.status(503).send({
          error: { code: 'AI_NOT_CONFIGURED', message: 'Assistant IA non configuré (OPENAI_API_KEY manquant).' },
        });
      }
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Tu es l'assistant zenAdmin, expert en gestion TPE française. Tu réponds de manière concise, en français, avec des conseils pratiques conformes au droit français (RGPD, Code du commerce, CGV, facturation électronique 2026 Factur-X). Si la question porte sur de la compta avancée, rappelle à l'utilisateur de consulter son expert-comptable.`,
              },
              ...(body.context ? [{ role: 'user' as const, content: `Contexte : ${body.context}` }] : []),
              { role: 'user', content: body.question },
            ],
            temperature: 0.4,
          }),
          signal: AbortSignal.timeout(25_000),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          return reply.status(502).send({ error: { code: 'AI_ERROR', message: `OpenAI ${res.status}: ${t.slice(0, 200)}` } });
        }
        const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
        return {
          answer: data.choices?.[0]?.message?.content ?? 'Pas de réponse.',
        };
      } catch (e) {
        return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: e instanceof Error ? e.message : 'unknown' } });
      }
    },
  );
}
