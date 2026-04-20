import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { loadConfig } from './config.js';
import { installFrenchZodErrors } from './lib/zod-fr.js';

// P2-08 : messages Zod en francais
installFrenchZodErrors();
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
import { settingsRoutes } from './modules/settings/settings.routes.js';
import { ocrRoutes } from './modules/ocr/ocr.routes.js';
import { notificationRoutes } from './modules/notification/notification.routes.js';
import { jobsRoutes, startInternalJobTicker } from './jobs/jobs.routes.js';
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

  // P1-06 : cookies signes
  await app.register(cookie, {
    secret: config.JWT_SECRET,
    parseOptions: {},
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

  // D5 : observabilite (slow requests + error envelope)
  const { registerObservabilityPlugin } = await import('./plugins/observability.js');
  registerObservabilityPlugin(app);

  // E2 : Sentry optionnel (si SENTRY_DSN defini)
  const { registerSentryPlugin } = await import('./plugins/sentry.js');
  registerSentryPlugin(app);

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
  await app.register(settingsRoutes);
  await app.register(ocrRoutes);
  const { quoteTemplateRoutes } = await import('./modules/quote/templates/template.routes.js');
  await app.register(quoteTemplateRoutes);
  const { importRoutes } = await import('./modules/import/import.routes.js');
  await app.register(importRoutes);
  const { productVariantRoutes } = await import('./modules/product/variant.routes.js');
  await app.register(productVariantRoutes);
  const { calendarRoutes } = await import('./modules/calendar/calendar.routes.js');
  await app.register(calendarRoutes);
  const { webauthnRoutes } = await import('./modules/auth/webauthn.routes.js');
  await app.register(webauthnRoutes);
  const { clientPortalRoutes } = await import('./modules/portal/client-portal.routes.js');
  await app.register(clientPortalRoutes);
  const { webhookRoutes } = await import('./modules/webhooks/webhook.routes.js');
  await app.register(webhookRoutes);
  const { bookingRoutes } = await import('./modules/booking/booking.routes.js');
  await app.register(bookingRoutes);
  const { npsRoutes } = await import('./modules/nps/nps.routes.js');
  await app.register(npsRoutes);
  await app.register(notificationRoutes);
  const { smsRoutes } = await import('./modules/notification/sms.routes.js');
  await app.register(smsRoutes);
  await app.register(jobsRoutes);
  startInternalJobTicker();
  const { billingRoutes } = await import('./modules/billing/billing.routes.js');
  await app.register(billingRoutes);

  return app;
}
