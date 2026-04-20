import type { FastifyInstance } from 'fastify';

// Vague E2 : Sentry-like error reporting via HTTP direct (pas de SDK).
// Si SENTRY_DSN est defini, les erreurs serveur 5xx + exceptions non-attrapees
// sont envoyees au endpoint DSN via `POST <store-endpoint>` au format envelope
// Sentry v7. Sinon no-op.
//
// On evite le SDK officiel pour ne pas ajouter 2-3 MB de deps sur Render free.
// Pour un vrai projet qui veut replay / breadcrumbs, installer @sentry/node.

interface SentryEnvelope {
  event_id: string;
  timestamp: number;
  message?: string;
  level: 'error' | 'warning' | 'info';
  platform: 'node';
  environment?: string;
  release?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: { frames: Array<{ filename: string; function: string; lineno: number }> };
    }>;
  };
}

function parseDsn(dsn: string): { storeUrl: string; publicKey: string; projectId: string } | null {
  // Format : https://<publicKey>@<host>/<projectId>
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, '');
    const storeUrl = `${url.protocol}//${url.host}/api/${projectId}/envelope/`;
    return { storeUrl, publicKey, projectId };
  } catch {
    return null;
  }
}

function randomEventId(): string {
  // Sentry event ids = 32 hex chars (UUID without dashes)
  return Array.from({ length: 32 })
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('');
}

async function sendToSentry(dsn: string, envelope: SentryEnvelope): Promise<void> {
  const parsed = parseDsn(dsn);
  if (!parsed) return;
  const auth = [
    'Sentry sentry_version=7',
    `sentry_key=${parsed.publicKey}`,
    'sentry_client=zenadmin/0.3.0',
  ].join(', ');

  const header = { event_id: envelope.event_id, sent_at: new Date().toISOString(), dsn };
  const itemHeader = { type: 'event' };
  const body = [JSON.stringify(header), JSON.stringify(itemHeader), JSON.stringify(envelope)].join('\n');

  try {
    await fetch(parsed.storeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': auth,
      },
      body,
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // silencieux — on ne casse jamais une requete user sur un echec Sentry
  }
}

export function registerSentryPlugin(app: FastifyInstance): void {
  const dsn = process.env['SENTRY_DSN'];
  if (!dsn) {
    app.log.info('Sentry disabled (SENTRY_DSN missing)');
    return;
  }
  const env = process.env['NODE_ENV'] ?? 'development';
  const release = process.env['APP_VERSION'] ?? 'unknown';

  app.addHook('onError', (request, _reply, error, done) => {
    const envelope: SentryEnvelope = {
      event_id: randomEventId(),
      timestamp: Math.floor(Date.now() / 1000),
      level: 'error',
      platform: 'node',
      environment: env,
      release,
      tags: {
        path: request.url,
        method: request.method,
        correlation_id: request.id,
      },
      extra: {
        tenant_id: (request as { auth?: { tenant_id: string } }).auth?.tenant_id,
        user_id: (request as { auth?: { user_id: string } }).auth?.user_id,
      },
      exception: {
        values: [
          {
            type: error.name,
            value: error.message,
            stacktrace: error.stack
              ? {
                  frames: error.stack
                    .split('\n')
                    .slice(1, 15)
                    .map((line) => {
                      const m = line.match(/at\s+(.+?)\s+\((.+):(\d+):\d+\)/) ?? line.match(/at\s+(.+):(\d+):\d+/);
                      return {
                        function: m?.[1] ?? 'anonymous',
                        filename: (m?.[2] ?? line).trim(),
                        lineno: Number(m?.[3] ?? 0),
                      };
                    }),
                }
              : undefined,
          },
        ],
      },
    };
    void sendToSentry(dsn, envelope);
    done();
  });

  // Capture des exceptions non attrapees (hors Fastify scope)
  process.on('uncaughtException', (err) => {
    void sendToSentry(dsn, {
      event_id: randomEventId(),
      timestamp: Math.floor(Date.now() / 1000),
      level: 'error',
      platform: 'node',
      environment: env,
      release,
      tags: { source: 'uncaughtException' },
      exception: { values: [{ type: err.name, value: err.message }] },
    });
  });
  process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    void sendToSentry(dsn, {
      event_id: randomEventId(),
      timestamp: Math.floor(Date.now() / 1000),
      level: 'error',
      platform: 'node',
      environment: env,
      release,
      tags: { source: 'unhandledRejection' },
      exception: { values: [{ type: err.name, value: err.message }] },
    });
  });

  app.log.info({ env, release }, 'Sentry enabled');
}
