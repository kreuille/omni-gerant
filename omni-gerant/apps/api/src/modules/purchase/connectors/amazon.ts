import type { Result } from '@omni-gerant/shared';
import { ok, err, appError } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';
import type { ConnectorBase, ConnectorCredentials, ConnectorSession, RawInvoice } from './connector-base.js';
import { withRetry } from './connector-base.js';

// BUSINESS RULE [CDC-2.2]: Connecteur Amazon Business

export const amazonConnector: ConnectorBase = {
  type: 'amazon',
  displayName: 'Amazon Business',
  description: 'Recuperation automatique des factures Amazon Business',

  async authenticate(credentials: ConnectorCredentials): Promise<Result<ConnectorSession, AppError>> {
    // Placeholder: real implementation would use Amazon API or web scraping
    return ok({
      token: 'amazon-session-token',
      expiresAt: new Date(Date.now() + 3600000),
    });
  },

  async fetchInvoices(session: ConnectorSession, since: Date): Promise<Result<RawInvoice[], AppError>> {
    return withRetry(async () => {
      // Placeholder: real implementation would query Amazon order history
      // Rate limiting: max 1 request per 2 seconds
      return ok([]);
    });
  },

  async downloadDocument(session: ConnectorSession, documentUrl: string): Promise<Result<Buffer, AppError>> {
    return withRetry(async () => {
      try {
        const response = await fetch(documentUrl, {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (!response.ok) {
          return err(appError('SERVICE_UNAVAILABLE', `Download failed: ${response.status}`));
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        return ok(buffer);
      } catch (error) {
        return err(appError('SERVICE_UNAVAILABLE', `Download error: ${error}`));
      }
    });
  },
};
