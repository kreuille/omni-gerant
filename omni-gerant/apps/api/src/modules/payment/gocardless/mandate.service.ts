import { ok, err } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';
import type { createGoCardlessClient } from './gocardless-client.js';

// BUSINESS RULE [CDC-3.2]: Service mandats SEPA GoCardless

export interface MandateRecord {
  id: string;
  tenant_id: string;
  client_id: string;
  gocardless_mandate_id: string;
  status: string;
  created_at: Date;
}

export interface MandateRepository {
  create(data: Omit<MandateRecord, 'id' | 'created_at'>): Promise<MandateRecord>;
  findByClientId(tenantId: string, clientId: string): Promise<MandateRecord | null>;
  updateStatus(id: string, status: string): Promise<void>;
}

export function createMandateService(
  gcClient: ReturnType<typeof createGoCardlessClient>,
  repo: MandateRepository,
  baseUrl: string,
) {
  return {
    async initiateMandate(
      tenantId: string,
      clientId: string,
    ): Promise<Result<{ redirect_url: string; flow_id: string }, AppError>> {
      try {
        const sessionToken = crypto.randomUUID();
        const flow = await gcClient.createRedirectFlow({
          description: 'Autorisation de prelevement SEPA',
          session_token: sessionToken,
          success_redirect_url: `${baseUrl}/payment/mandate/success?session=${sessionToken}&client=${clientId}`,
        });

        return ok({
          redirect_url: flow.redirect_url,
          flow_id: flow.id,
        });
      } catch (error) {
        return err({
          code: 'GOCARDLESS_ERROR',
          message: `Failed to create mandate: ${error instanceof Error ? error.message : 'unknown'}`,
        });
      }
    },

    async completeMandate(
      tenantId: string,
      clientId: string,
      flowId: string,
      sessionToken: string,
    ): Promise<Result<MandateRecord, AppError>> {
      try {
        const { mandate_id } = await gcClient.completeRedirectFlow(flowId, sessionToken);

        const record = await repo.create({
          tenant_id: tenantId,
          client_id: clientId,
          gocardless_mandate_id: mandate_id,
          status: 'active',
        });

        return ok(record);
      } catch (error) {
        return err({
          code: 'GOCARDLESS_ERROR',
          message: `Failed to complete mandate: ${error instanceof Error ? error.message : 'unknown'}`,
        });
      }
    },

    async chargeMandate(
      tenantId: string,
      clientId: string,
      invoiceId: string,
      invoiceNumber: string,
      amountCents: number,
    ): Promise<Result<{ payment_id: string }, AppError>> {
      const mandate = await repo.findByClientId(tenantId, clientId);
      if (!mandate) {
        return err({ code: 'NOT_FOUND', message: 'Aucun mandat SEPA actif pour ce client' });
      }
      if (mandate.status !== 'active') {
        return err({ code: 'MANDATE_INACTIVE', message: 'Le mandat SEPA n\'est plus actif' });
      }

      try {
        const payment = await gcClient.createPayment({
          amount_cents: amountCents,
          currency: 'EUR',
          mandate_id: mandate.gocardless_mandate_id,
          description: `Facture ${invoiceNumber}`,
          invoice_id: invoiceId,
        });

        return ok({ payment_id: payment.id });
      } catch (error) {
        return err({
          code: 'GOCARDLESS_ERROR',
          message: `Failed to charge mandate: ${error instanceof Error ? error.message : 'unknown'}`,
        });
      }
    },
  };
}
