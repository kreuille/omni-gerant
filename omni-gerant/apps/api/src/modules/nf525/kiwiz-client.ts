// BUSINESS RULE [NF525-K0]: Client HTTP Kiwiz pour certification NF525
// Toutes les methodes retournent Result<T, AppError> - jamais d'exceptions.
// Auto-retry sur 401 (re-authentification puis retry une fois).

import { ok, err, appError } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';
import type { KiwizConfig } from './kiwiz-config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KiwizTokenResponse {
  token: string;
  expires_at?: string;
}

export interface KiwizInvoiceSaveResponse {
  block_hash: string;
  document_hash: string;
  message?: string;
}

export interface KiwizAddress {
  street?: string;
  zip_code?: string;
  city?: string;
  country?: string;
}

export interface KiwizItem {
  id: string;
  label: string;
  quantity: string;
  unit_price: string;
  total_ht: string;
  tax_rate: string;
}

export interface KiwizTax {
  rate: string;
  base: string;
  amount: string;
}

export interface KiwizInvoiceData {
  number: string;
  date: string;
  total_ht: string;
  total_ttc: string;
  total_tax: string;
  currency: string;
  payment_method?: string;
  seller_name: string;
  buyer_name: string;
  buyer_email?: string;
  buyer_address?: KiwizAddress;
  items: KiwizItem[];
  taxes: KiwizTax[];
}

export interface KiwizQuotaInfo {
  used: number;
  limit: number;
  remaining: number;
}

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

// BUSINESS RULE [R02]: Montants en centimes -> float Kiwiz
/** Convert centimes integer to float (1500 -> 15) */
export function centsToKiwizFloat(cents: number): number {
  return cents / 100;
}

/** Convert centimes integer to Kiwiz string with 4 decimal places (1500 -> "15.0000") */
export function formatKiwizAmount(cents: number): string {
  return centsToKiwizFloat(cents).toFixed(4);
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export interface KiwizClient {
  authenticate(): Promise<Result<string, AppError>>;
  saveInvoice(pdfBuffer: Buffer, data: KiwizInvoiceData): Promise<Result<KiwizInvoiceSaveResponse, AppError>>;
  saveCreditMemo(pdfBuffer: Buffer, data: KiwizInvoiceData): Promise<Result<KiwizInvoiceSaveResponse, AppError>>;
  getInvoice(blockHash: string): Promise<Result<Buffer, AppError>>;
  getCreditMemo(blockHash: string): Promise<Result<Buffer, AppError>>;
  getQuota(): Promise<Result<KiwizQuotaInfo, AppError>>;
}

export function createKiwizClient(config: KiwizConfig): KiwizClient {
  let currentToken: string | null = null;

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  async function doAuthenticate(): Promise<Result<string, AppError>> {
    try {
      const response = await fetch(`${config.apiUrl}/token/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: config.username,
          password: config.password,
        }),
      });

      if (!response.ok) {
        return err(appError(
          'UNAUTHORIZED',
          `Kiwiz authentication failed: ${response.status} ${response.statusText}`,
          { status: response.status },
        ));
      }

      const body = (await response.json()) as KiwizTokenResponse;
      currentToken = body.token;
      return ok(body.token);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(appError('SERVICE_UNAVAILABLE', `Kiwiz authentication error: ${message}`));
    }
  }

  /**
   * Execute an authenticated request with auto-retry on 401.
   * If the first attempt returns 401, re-authenticate and retry once.
   */
  async function authenticatedRequest<T>(
    execute: (token: string) => Promise<Response>,
    parseResponse: (response: Response) => Promise<T>,
    errorContext: string,
  ): Promise<Result<T, AppError>> {
    // Ensure we have a token
    if (!currentToken) {
      const authResult = await doAuthenticate();
      if (!authResult.ok) return authResult as Result<never, AppError>;
    }

    try {
      // First attempt
      let response = await execute(currentToken!);

      // Auto-retry on 401
      if (response.status === 401) {
        const reAuthResult = await doAuthenticate();
        if (!reAuthResult.ok) return reAuthResult as Result<never, AppError>;
        response = await execute(currentToken!);
      }

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          // ignore parse errors
        }
        return err(appError(
          'SERVICE_UNAVAILABLE',
          `Kiwiz ${errorContext} failed: ${response.status} ${response.statusText}`,
          { status: response.status, body: errorBody },
        ));
      }

      const parsed = await parseResponse(response);
      return ok(parsed);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(appError('SERVICE_UNAVAILABLE', `Kiwiz ${errorContext} error: ${message}`));
    }
  }

  function authHeaders(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // -------------------------------------------------------------------------
  // Public methods
  // -------------------------------------------------------------------------

  async function authenticate(): Promise<Result<string, AppError>> {
    return doAuthenticate();
  }

  async function saveInvoice(
    pdfBuffer: Buffer,
    data: KiwizInvoiceData,
  ): Promise<Result<KiwizInvoiceSaveResponse, AppError>> {
    return authenticatedRequest(
      (token) =>
        fetch(`${config.apiUrl}/invoice/save`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({
            pdf: pdfBuffer.toString('base64'),
            data,
            subscription_id: config.subscriptionId,
          }),
        }),
      (response) => response.json() as Promise<KiwizInvoiceSaveResponse>,
      'saveInvoice',
    );
  }

  async function saveCreditMemo(
    pdfBuffer: Buffer,
    data: KiwizInvoiceData,
  ): Promise<Result<KiwizInvoiceSaveResponse, AppError>> {
    return authenticatedRequest(
      (token) =>
        fetch(`${config.apiUrl}/credit-memo/save`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({
            pdf: pdfBuffer.toString('base64'),
            data,
            subscription_id: config.subscriptionId,
          }),
        }),
      (response) => response.json() as Promise<KiwizInvoiceSaveResponse>,
      'saveCreditMemo',
    );
  }

  async function getInvoice(blockHash: string): Promise<Result<Buffer, AppError>> {
    return authenticatedRequest(
      (token) =>
        fetch(`${config.apiUrl}/invoice/${blockHash}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }),
      async (response) => Buffer.from(await response.arrayBuffer()),
      'getInvoice',
    );
  }

  async function getCreditMemo(blockHash: string): Promise<Result<Buffer, AppError>> {
    return authenticatedRequest(
      (token) =>
        fetch(`${config.apiUrl}/credit-memo/${blockHash}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }),
      async (response) => Buffer.from(await response.arrayBuffer()),
      'getCreditMemo',
    );
  }

  async function getQuota(): Promise<Result<KiwizQuotaInfo, AppError>> {
    return authenticatedRequest(
      (token) =>
        fetch(`${config.apiUrl}/quota`, {
          method: 'GET',
          headers: authHeaders(token),
        }),
      (response) => response.json() as Promise<KiwizQuotaInfo>,
      'getQuota',
    );
  }

  return {
    authenticate,
    saveInvoice,
    saveCreditMemo,
    getInvoice,
    getCreditMemo,
    getQuota,
  };
}
