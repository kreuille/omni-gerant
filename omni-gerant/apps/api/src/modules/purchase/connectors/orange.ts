import type { Result } from '@omni-gerant/shared';
import { ok, err, appError } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';
import type { ConnectorBase, ConnectorCredentials, ConnectorSession, RawInvoice } from './connector-base.js';
import { withRetry } from './connector-base.js';

// BUSINESS RULE [CDC-2.2]: Connecteur Orange

export const orangeConnector: ConnectorBase = {
  type: 'orange',
  displayName: 'Orange',
  description: 'Recuperation automatique des factures Orange (telecom)',

  async authenticate(credentials: ConnectorCredentials): Promise<Result<ConnectorSession, AppError>> {
    return ok({
      token: 'orange-session-token',
      expiresAt: new Date(Date.now() + 3600000),
    });
  },

  async fetchInvoices(session: ConnectorSession, since: Date): Promise<Result<RawInvoice[], AppError>> {
    return withRetry(async () => {
      // Placeholder: real implementation would use Orange Espace Client API
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
        return ok(Buffer.from(await response.arrayBuffer()));
      } catch (error) {
        return err(appError('SERVICE_UNAVAILABLE', `Download error: ${error}`));
      }
    });
  },
};
