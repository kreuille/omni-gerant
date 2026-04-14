// BUSINESS RULE [CDC-2.2]: Job synchronisation fournisseurs
// Sync periodique (quotidien ou configurable)

import type { ConnectorConfig, RawInvoice } from '../modules/purchase/connectors/connector-base.js';

export interface SupplierSyncJobData {
  tenantId: string;
  connectorConfig: ConnectorConfig;
}

export interface SupplierSyncJobResult {
  connectorType: string;
  fetchedInvoices: number;
  createdPurchases: number;
  errors: string[];
}

export const SUPPLIER_SYNC_JOB = {
  name: 'supplier-sync',
  queue: 'supplier-connectors',
  defaultRepeat: {
    every: 24 * 60 * 60 * 1000, // Daily
  },
} as const;

export function createSupplierSyncProcessor(deps: {
  getConnector: (type: string) => import('../modules/purchase/connectors/connector-base.js').ConnectorBase | undefined;
  decryptCredentials: (encrypted: import('../modules/purchase/connectors/connector-base.js').ConnectorCredentials, key: Uint8Array) => Promise<string>;
  getEncryptionKey: (tenantId: string) => Promise<Uint8Array>;
  createPurchaseFromRaw: (tenantId: string, raw: RawInvoice) => Promise<{ id: string } | null>;
}) {
  return async function processSupplierSync(
    data: SupplierSyncJobData,
  ): Promise<SupplierSyncJobResult> {
    const result: SupplierSyncJobResult = {
      connectorType: data.connectorConfig.type,
      fetchedInvoices: 0,
      createdPurchases: 0,
      errors: [],
    };

    const connector = deps.getConnector(data.connectorConfig.type);
    if (!connector) {
      result.errors.push(`Unknown connector type: ${data.connectorConfig.type}`);
      return result;
    }

    // Authenticate
    const authResult = await connector.authenticate(data.connectorConfig.credentials);
    if (!authResult.ok) {
      result.errors.push(`Authentication failed: ${authResult.error.message}`);
      return result;
    }

    // Fetch invoices since last sync
    const since = data.connectorConfig.lastSyncAt ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fetchResult = await connector.fetchInvoices(authResult.value, since);
    if (!fetchResult.ok) {
      result.errors.push(`Fetch failed: ${fetchResult.error.message}`);
      return result;
    }

    result.fetchedInvoices = fetchResult.value.length;

    // Create purchases
    for (const raw of fetchResult.value) {
      try {
        const purchase = await deps.createPurchaseFromRaw(data.tenantId, raw);
        if (purchase) {
          result.createdPurchases++;
        }
      } catch (error) {
        result.errors.push(`Failed to create purchase for ${raw.number}: ${error}`);
      }
    }

    return result;
  };
}
