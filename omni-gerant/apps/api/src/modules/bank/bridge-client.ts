import { ok, err } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';
import * as crypto from 'node:crypto';

// BUSINESS RULE [CDC-2.3]: Integration Bridge API pour Open Banking DSP2

export interface BridgeConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  webhookSecret?: string;
}

export interface BridgeAccount {
  id: number;
  name: string;
  balance: number; // euros (float from API)
  iban: string | null;
  currency: string;
  bank_name: string;
  status: string; // 0 = OK
  updated_at: string;
}

export interface BridgeTransaction {
  id: number;
  account_id: number;
  date: string; // YYYY-MM-DD
  value_date: string | null;
  amount: number; // euros (float from API)
  currency_code: string;
  description: string;
  raw_description: string;
  category_id: number | null;
  is_deleted: boolean;
}

export interface BridgeConnectUrl {
  redirect_url: string;
}

export interface BridgeWebhookPayload {
  type: string; // 'item.refreshed', 'item.created', etc.
  item_id: number;
  user_uuid: string;
  timestamp: number;
}

// BUSINESS RULE [CDC-2.3]: Auto-categorisation basique
const CATEGORY_MAP: Record<number, string> = {
  1: 'loyer',
  2: 'assurance',
  3: 'telecom',
  4: 'energie',
  5: 'transport',
  6: 'alimentation',
  7: 'sante',
  8: 'loisirs',
  9: 'impots',
  10: 'salaires',
  11: 'services',
  12: 'equipement',
  13: 'bancaire',
};

// BUSINESS RULE [CDC-2.3]: Categorisation par mots-cles dans le label
const LABEL_CATEGORY_RULES: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /\b(loyer|bail|location)\b/i, category: 'loyer' },
  { pattern: /\b(assurance|maif|macif|axa|allianz|generali)\b/i, category: 'assurance' },
  { pattern: /\b(orange|sfr|bouygues|free|telecom|internet)\b/i, category: 'telecom' },
  { pattern: /\b(edf|engie|electricite|gaz|energie|total\s?energies)\b/i, category: 'energie' },
  { pattern: /\b(sncf|ratp|uber|taxi|carburant|essence|diesel|peage)\b/i, category: 'transport' },
  { pattern: /\b(urssaf|impot|taxe|dgfip|tresor\s?public)\b/i, category: 'impots' },
  { pattern: /\b(salaire|paie|remuneration)\b/i, category: 'salaires' },
  { pattern: /\b(frais\s?bancaire|agios|commission|cb\s)\b/i, category: 'bancaire' },
];

export function categorizeTransaction(
  rawLabel: string,
  bridgeCategoryId: number | null,
): string | null {
  // 1. Try Bridge category ID
  if (bridgeCategoryId !== null && CATEGORY_MAP[bridgeCategoryId]) {
    return CATEGORY_MAP[bridgeCategoryId]!;
  }

  // 2. Try label-based categorization
  for (const rule of LABEL_CATEGORY_RULES) {
    if (rule.pattern.test(rawLabel)) {
      return rule.category;
    }
  }

  return null;
}

export interface BridgeClient {
  /** Get URL for user to connect their bank */
  getConnectUrl(userUuid: string, callbackUrl: string): Promise<Result<BridgeConnectUrl, AppError>>;
  /** List accounts for a user */
  listAccounts(userUuid: string): Promise<Result<BridgeAccount[], AppError>>;
  /** List transactions for an account */
  listTransactions(
    userUuid: string,
    accountId: number,
    since?: string,
  ): Promise<Result<BridgeTransaction[], AppError>>;
  /** Refresh account data */
  refreshItem(userUuid: string, itemId: number): Promise<Result<void, AppError>>;
  /** Validate webhook signature */
  validateWebhook(payload: string, signature: string): boolean;
}

export function createBridgeClient(config: BridgeConfig): BridgeClient {
  const headers = {
    'Bridge-Version': '2021-06-01',
    'Client-Id': config.clientId,
    'Client-Secret': config.clientSecret,
    'Content-Type': 'application/json',
  };

  async function apiRequest<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<Result<T, AppError>> {
    try {
      const response = await fetch(`${config.baseUrl}${path}`, {
        method,
        headers: { ...headers, ...extraHeaders },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return err({
          code: response.status === 401 ? 'UNAUTHORIZED' : 'SERVICE_UNAVAILABLE',
          message: `Bridge API error: ${response.status} ${response.statusText}`,
          details: { body: errorBody },
        });
      }

      const data = (await response.json()) as T;
      return ok(data);
    } catch (error) {
      return err({
        code: 'SERVICE_UNAVAILABLE',
        message: `Bridge API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  return {
    async getConnectUrl(userUuid, callbackUrl) {
      return apiRequest<BridgeConnectUrl>('POST', '/v2/connect/items/add', {
        user_uuid: userUuid,
        redirect_url: callbackUrl,
      });
    },

    async listAccounts(userUuid) {
      const result = await apiRequest<{ resources: BridgeAccount[] }>(
        'GET',
        '/v2/accounts',
        undefined,
        { 'User-Uuid': userUuid },
      );
      if (!result.ok) return result;
      return ok(result.value.resources);
    },

    async listTransactions(userUuid, accountId, since) {
      const params = new URLSearchParams({ account_id: String(accountId) });
      if (since) params.set('since', since);

      const result = await apiRequest<{ resources: BridgeTransaction[] }>(
        'GET',
        `/v2/transactions?${params.toString()}`,
        undefined,
        { 'User-Uuid': userUuid },
      );
      if (!result.ok) return result;
      return ok(result.value.resources);
    },

    async refreshItem(userUuid, itemId) {
      const result = await apiRequest<unknown>(
        'POST',
        `/v2/items/${itemId}/refresh`,
        undefined,
        { 'User-Uuid': userUuid },
      );
      if (!result.ok) return result;
      return ok(undefined);
    },

    validateWebhook(payload, signature) {
      if (!config.webhookSecret) return false;
      // HMAC-SHA256 validation
      const expected = crypto
        .createHmac('sha256', config.webhookSecret)
        .update(payload)
        .digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(signature, 'hex'),
      );
    },
  };
}
