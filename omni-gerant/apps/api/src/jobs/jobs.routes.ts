import type { FastifyInstance } from 'fastify';
import { listJobs, runAllDueJobs, runJobIfDue } from './registry.js';
import { invoiceRemindersJob } from './invoice-reminders.job.js';
import { duerpAlertsJob } from './duerp-alerts.job.js';
import { bankSyncJob } from './bank-sync.job.js';
import { reconciliationJob } from './reconciliation.job.js';
import { dsnMonthlyJob } from './dsn-monthly.job.js';
import { calendarRemindersJob } from './calendar-reminders.job.js';
import { webhookDeliverJob } from './webhook-deliver.job.js';
import { contractRenewalJob } from './contract-renewal.job.js';
import { registerJob } from './registry.js';

// Vague A2 : expose les jobs cron via HTTP pour scheduler externe
//
// Auth : header `X-Cron-Secret` = process.env.CRON_SECRET.
// Si le secret est absent cote serveur, l'endpoint est desactive.

// Enregistrement des jobs au chargement du module
registerJob(invoiceRemindersJob);
registerJob(duerpAlertsJob);
registerJob(bankSyncJob);
registerJob(reconciliationJob);
registerJob(dsnMonthlyJob);
registerJob(calendarRemindersJob);
registerJob(webhookDeliverJob);
registerJob(contractRenewalJob);

// Demarrage automatique du tick interne (fallback si pas de scheduler externe)
let intervalHandle: ReturnType<typeof setInterval> | null = null;
export function startInternalJobTicker(): void {
  if (intervalHandle) return;
  if (process.env['NODE_ENV'] === 'test') return;
  // Toutes les 5 minutes (les jobs ont chacun leur minIntervalMs qui filtre)
  intervalHandle = setInterval(() => {
    runAllDueJobs().catch((e) => console.error('[cron tick] error:', e));
  }, 5 * 60 * 1000);
}

export async function jobsRoutes(app: FastifyInstance) {
  const cronSecret = process.env['CRON_SECRET'];

  function checkSecret(request: import('fastify').FastifyRequest): boolean {
    if (!cronSecret) return false;
    const got = request.headers['x-cron-secret'];
    return typeof got === 'string' && got === cronSecret;
  }

  // GET /api/jobs — liste des jobs enregistres (public)
  app.get('/api/jobs', async () => {
    return {
      jobs: listJobs().map((j) => ({
        name: j.name,
        description: j.description,
        min_interval_ms: j.minIntervalMs,
        allowed_hours_utc: j.allowedHoursUtc ?? null,
      })),
    };
  });

  // POST /api/jobs/tick — declenche tous les jobs dus (shared-secret)
  app.post('/api/jobs/tick', async (request, reply) => {
    if (!checkSecret(request)) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid X-Cron-Secret header.' } });
    }
    const results = await runAllDueJobs();
    return { tick_at: new Date().toISOString(), results };
  });

  // POST /api/jobs/:name/run — force un job specifique
  app.post('/api/jobs/:name/run', async (request, reply) => {
    if (!checkSecret(request)) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid X-Cron-Secret header.' } });
    }
    const { name } = request.params as { name: string };
    const force = (request.query as { force?: string }).force === '1';
    const r = await runJobIfDue(name, force);
    return { job: name, ...r };
  });
}
