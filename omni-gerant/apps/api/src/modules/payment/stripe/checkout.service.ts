import { ok, err } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';
import type { createStripeClient } from './stripe-client.js';

// BUSINESS RULE [CDC-3.2]: Service Stripe Checkout

export interface PaymentLinkInput {
  invoice_id: string;
  invoice_number: string;
  amount_cents: number;
  currency?: string;
  tenant_stripe_account_id?: string;
}

export interface PaymentLink {
  checkout_url: string;
  session_id: string;
  invoice_id: string;
  amount_cents: number;
}

export function createCheckoutService(
  stripeClient: ReturnType<typeof createStripeClient>,
  baseUrl: string,
) {
  return {
    /**
     * Generate payment link for an invoice
     */
    async createPaymentLink(
      input: PaymentLinkInput,
    ): Promise<Result<PaymentLink, AppError>> {
      try {
        const session = await stripeClient.createCheckoutSession({
          amount_cents: input.amount_cents,
          currency: input.currency ?? 'eur',
          invoice_id: input.invoice_id,
          invoice_number: input.invoice_number,
          tenant_stripe_account_id: input.tenant_stripe_account_id,
          success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/payment/cancel`,
        });

        return ok({
          checkout_url: session.url,
          session_id: session.id,
          invoice_id: input.invoice_id,
          amount_cents: input.amount_cents,
        });
      } catch (error) {
        return err({
          code: 'STRIPE_ERROR',
          message: `Failed to create checkout session: ${error instanceof Error ? error.message : 'unknown'}`,
        });
      }
    },
  };
}
