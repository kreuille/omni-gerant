import type { Result } from '@omni-gerant/shared';
import { ok, err, appError } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';
import type { ConnectorBase, ConnectorCredentials, ConnectorSession, RawInvoice } from './connector-base.js';
import { withRetry } from './connector-base.js';

// BUSINESS RULE [CDC-2.2]: Connecteur generique configurable pour portails fournisseurs

export interface GenericPortalConfig {
  login_url: string;
  invoices_url: string;
  username_field: string;
  password_field: string;
  invoice_selector?: string;
  download_pattern?: string;
}

export const genericPortalConnector: ConnectorBase = {
  type: 'generic',
  displayName: 'Portail generique',
  description: 'Connecteur configurable pour tout portail fournisseur avec espace client',

  async authenticate(credentials: ConnectorCredentials): Promise<Result<ConnectorSession, AppError>> {
    // Placeholder: real implementation would perform web login
    return ok({
      token: 'generic-session',
      cookies: {},
      expiresAt: new Date(Date.now() + 3600000),
    });
  },

  async fetchInvoices(session: ConnectorSession, since: Date): Promise<Result<RawInvoice[], AppError>> {
    return withRetry(async () => {
      // Placeholder: real implementation would scrape the portal
      return ok([]);
    });
  },

  async downloadDocument(session: ConnectorSession, documentUrl: string): Promise<Result<Buffer, AppError>> {
    return withRetry(async () => {
      try {
        const headers: Record<string, string> = {};
        if (session.cookies) {
          headers['Cookie'] = Object.entries(session.cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join('; ');
        }
        const response = await fetch(documentUrl, { headers });
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
