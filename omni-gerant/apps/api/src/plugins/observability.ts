import type { FastifyInstance } from 'fastify';

// D5 : observabilite minimale — slow request log + error envelope structure
// Compatible avec n'importe quel exporter externe (Datadog, Sentry, Logtail)
// via parsing stdout JSON.

const SLOW_THRESHOLD_MS = 1000;

export function registerObservabilityPlugin(app: FastifyInstance): void {
  // Track per-request duration
  app.addHook('onRequest', (request, _reply, done) => {
    (request as unknown as { __startedAt?: number }).__startedAt = Date.now();
    done();
  });

  // Log slow requests + error envelope
  app.addHook('onResponse', (request, reply, done) => {
    const start = (request as unknown as { __startedAt?: number }).__startedAt;
    if (!start) return done();
    const duration_ms = Date.now() - start;

    if (duration_ms >= SLOW_THRESHOLD_MS) {
      app.log.warn({
        type: 'slow_request',
        method: request.method,
        path: request.url,
        status: reply.statusCode,
        duration_ms,
        correlation_id: request.id,
      }, `SLOW ${request.method} ${request.url} (${duration_ms}ms)`);
    }

    done();
  });

  // Hook erreurs : structure JSON
  app.addHook('onError', (request, reply, error, done) => {
    app.log.error({
      type: 'request_error',
      method: request.method,
      path: request.url,
      status: reply.statusCode,
      correlation_id: request.id,
      error_name: error.name,
      error_message: error.message,
      stack: error.stack,
    }, 'Request error');
    done();
  });
}
