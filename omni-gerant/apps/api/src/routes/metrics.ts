import type { FastifyInstance } from 'fastify';
import { getConfig } from '../config.js';

// BUSINESS RULE [D2]: Application metrics for monitoring

// In-memory counters — reset on restart (fine for free tier monitoring)
const counters = {
  requests_total: 0,
  errors_total: 0,
  started_at: Date.now(),
  // Sliding window: last 60 seconds
  _recentRequests: [] as number[],
  _recentErrors: [] as number[],
};

/**
 * Register the request counting hook — call once from app.ts
 */
export function registerMetricsHook(app: FastifyInstance) {
  app.addHook('onResponse', (_request, reply, done) => {
    const now = Date.now();
    counters.requests_total++;
    counters._recentRequests.push(now);

    if (reply.statusCode >= 500) {
      counters.errors_total++;
      counters._recentErrors.push(now);
    }

    // Prune entries older than 60s
    const cutoff = now - 60_000;
    counters._recentRequests = counters._recentRequests.filter((t) => t > cutoff);
    counters._recentErrors = counters._recentErrors.filter((t) => t > cutoff);

    done();
  });
}

export async function metricsRoutes(app: FastifyInstance) {
  app.get('/metrics', async (request, reply) => {
    // Protect with a simple API key header
    const config = getConfig();
    const metricsKey = process.env['METRICS_API_KEY'];

    if (metricsKey && config.NODE_ENV === 'production') {
      const provided = request.headers['x-metrics-key'];
      if (provided !== metricsKey) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Invalid metrics API key' },
        });
      }
    }

    const now = Date.now();
    const cutoff = now - 60_000;
    const recentRequests = counters._recentRequests.filter((t) => t > cutoff).length;
    const recentErrors = counters._recentErrors.filter((t) => t > cutoff).length;

    return {
      requests_total: counters.requests_total,
      requests_per_minute: recentRequests,
      errors_total: counters.errors_total,
      errors_per_minute: recentErrors,
      error_rate_percent: recentRequests > 0
        ? Math.round((recentErrors / recentRequests) * 100 * 100) / 100
        : 0,
      uptime_seconds: Math.round(process.uptime()),
      memory: {
        rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    };
  });
}
