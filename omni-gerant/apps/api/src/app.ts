import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadConfig } from './config.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerRateLimiter } from './plugins/rate-limiter.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { registerTenantPlugin } from './plugins/tenant.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { tenantRoutes } from './modules/tenant/tenant.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { quoteRoutes } from './modules/quote/quote.routes.js';
import { invoiceRoutes } from './modules/invoice/invoice.routes.js';
import { situationRoutes } from './modules/invoice/situation.routes.js';
import { paymentRoutes } from './modules/payment/payment.routes.js';
import { supplierRoutes } from './modules/supplier/supplier.routes.js';
import { purchaseRoutes } from './modules/purchase/purchase.routes.js';
import { bankRoutes } from './modules/bank/bank.routes.js';
import { forecastRoutes } from './modules/bank/forecast/forecast.routes.js';
import { createRequestContext, runWithContext } from './middleware/request-context.js';

export async function buildApp() {
  const config = loadConfig();

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    requestIdHeader: 'x-correlation-id',
    genReqId: () => crypto.randomUUID(),
  });

  // CORS
  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(','),
    credentials: true,
  });

  // Request context (correlation_id, tenant_id, user_id)
  app.addHook('onRequest', (request, _reply, done) => {
    const context = createRequestContext({
      correlation_id: request.id,
    });
    runWithContext(context, () => done());
  });

  // Error handler
  registerErrorHandler(app);

  // Rate limiter
  await registerRateLimiter(app);

  // Plugins
  await app.register(registerAuthPlugin);
  await app.register(registerTenantPlugin);

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(tenantRoutes);
  await app.register(auditRoutes);
  await app.register(quoteRoutes);
  await app.register(invoiceRoutes);
  await app.register(situationRoutes);
  await app.register(paymentRoutes);
  await app.register(supplierRoutes);
  await app.register(purchaseRoutes);
  await app.register(bankRoutes);
  await app.register(forecastRoutes);

  return app;
}
