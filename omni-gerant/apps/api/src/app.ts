import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadConfig } from './config.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerRateLimiter } from './plugins/rate-limiter.js';
import { registerSecurityPlugin } from './plugins/security.js';
import { registerDatabasePlugin } from './plugins/database.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { registerTenantPlugin } from './plugins/tenant.js';
import { healthRoutes } from './routes/health.js';
import { metricsRoutes, registerMetricsHook } from './routes/metrics.js';
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
import { duerpRoutes } from './modules/legal/duerp/duerp.routes.js';
import { rgpdRoutes } from './modules/legal/rgpd/rgpd.routes.js';
import { insuranceRoutes } from './modules/legal/insurance/insurance.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { accountingRoutes } from './modules/accounting/accounting.routes.js';
import { paymentIntegrationRoutes } from './modules/payment/payment-integration.routes.js';
import { ppfRoutes } from './modules/invoice/ppf/ppf.routes.js';
import { hrRoutes } from './modules/hr/hr.routes.js';
import { clientRoutes } from './modules/client/client.routes.js';
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

  // CORS — strict origin in production
  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
    credentials: true,
  });

  // Security headers (HSTS, CSP, X-Frame-Options, etc.)
  await registerSecurityPlugin(app);

  // Request context (correlation_id, tenant_id, user_id)
  app.addHook('onRequest', (request, _reply, done) => {
    const context = createRequestContext({
      correlation_id: request.id,
    });
    runWithContext(context, () => done());
  });

  // Metrics counter hook
  registerMetricsHook(app);

  // Error handler
  registerErrorHandler(app);

  // Rate limiter
  await registerRateLimiter(app);

  // Plugins
  await app.register(registerDatabasePlugin);
  await app.register(registerAuthPlugin);
  await app.register(registerTenantPlugin);

  // Routes
  await app.register(healthRoutes);
  await app.register(metricsRoutes);
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
  await app.register(duerpRoutes);
  await app.register(rgpdRoutes);
  await app.register(insuranceRoutes);
  await app.register(dashboardRoutes);
  await app.register(accountingRoutes);
  await app.register(paymentIntegrationRoutes);
  await app.register(ppfRoutes);
  await app.register(hrRoutes);
  await app.register(clientRoutes);

  return app;
}
