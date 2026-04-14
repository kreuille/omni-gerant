import type { Result } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';
import { ok, err, appError } from '@omni-gerant/shared';

// BUSINESS RULE [CDC-2.2]: Interface de base pour connecteurs fournisseurs
// BUSINESS RULE [CDC-2.2]: Stockage credentials chiffre AES-256

export interface ConnectorCredentials {
  encrypted: string;
  iv: string;
}

export interface ConnectorSession {
  token?: string;
  cookies?: Record<string, string>;
  expiresAt?: Date;
}

export interface RawInvoice {
  external_id: string;
  number: string;
  date: string;
  due_date?: string;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  supplier_name: string;
  document_url?: string;
  lines?: Array<{
    label: string;
    quantity: number;
    unit_price_cents: number;
    tva_rate: number;
    total_ht_cents: number;
  }>;
}

export interface ConnectorConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  credentials: ConnectorCredentials;
  settings: Record<string, unknown>;
  lastSyncAt?: Date;
  syncInterval: number; // minutes
}

export interface ConnectorBase {
  readonly type: string;
  readonly displayName: string;
  readonly description: string;

  authenticate(credentials: ConnectorCredentials): Promise<Result<ConnectorSession, AppError>>;
  fetchInvoices(session: ConnectorSession, since: Date): Promise<Result<RawInvoice[], AppError>>;
  downloadDocument(session: ConnectorSession, documentUrl: string): Promise<Result<Buffer, AppError>>;
}

// BUSINESS RULE: Retry avec backoff exponentiel
export async function withRetry<T>(
  fn: () => Promise<Result<T, AppError>>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<Result<T, AppError>> {
  let lastError: AppError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await fn();
    if (result.ok) return result;

    lastError = result.error;

    // Don't retry on auth or validation errors
    if (result.error.code === 'UNAUTHORIZED' || result.error.code === 'VALIDATION_ERROR') {
      return result;
    }

    if (attempt < maxRetries) {
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return err(lastError ?? appError('INTERNAL_ERROR', 'Retry exhausted'));
}

// BUSINESS RULE [CDC-2.2]: Chiffrement AES-256 des credentials
export async function encryptCredentials(
  data: string,
  key: Uint8Array,
): Promise<ConnectorCredentials> {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-CBC', false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    new TextEncoder().encode(data),
  );

  return {
    encrypted: Buffer.from(encrypted).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
  };
}

export async function decryptCredentials(
  credentials: ConnectorCredentials,
  key: Uint8Array,
): Promise<string> {
  const iv = Buffer.from(credentials.iv, 'base64');
  const data = Buffer.from(credentials.encrypted, 'base64');
  const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-CBC', false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, data);
  return new TextDecoder().decode(decrypted);
}
