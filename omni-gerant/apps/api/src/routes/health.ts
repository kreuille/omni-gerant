import type { FastifyInstance } from 'fastify';
import { prisma } from '@omni-gerant/db';

// BUSINESS RULE [R67]: Health check endpoints
export async function healthRoutes(app: FastifyInstance) {
  // Liveness probe - is the process running?
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Simple liveness — Kubernetes-style
  app.get('/health/live', async () => {
    return { alive: true };
  });

  // Readiness probe - is the service ready to handle requests?
  // Used by Render health check
  app.get('/health/ready', async (_request, reply) => {
    const checks: Record<string, string> = {};
    let healthy = true;

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks['database'] = 'ok';
    } catch {
      checks['database'] = 'error';
      healthy = false;
    }

    checks['server'] = 'ok';

    const statusCode = healthy ? 200 : 503;
    return reply.status(statusCode).send({
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // Full health check with DB status (for monitoring)
  app.get('/health/full', async () => {
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      db: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    };
  });

  // Keep legacy /ready for backwards compatibility
  app.get('/ready', async (_request, reply) => {
    const checks: Record<string, string> = {};
    let healthy = true;

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks['database'] = 'ok';
    } catch {
      checks['database'] = 'error';
      healthy = false;
    }

    checks['server'] = 'ok';

    const statusCode = healthy ? 200 : 503;
    return reply.status(statusCode).send({
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    });
  });
}
