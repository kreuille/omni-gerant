import { ok, err } from '@omni-gerant/shared';
import type { Result, AppError } from '@omni-gerant/shared';
import {
  mapSaleInvoice,
  mapPurchaseInvoice,
  mapPayment,
  resetEntryCounter,
  type FecEntry,
  type SaleInvoice,
  type PurchaseInvoice,
  type PaymentRecord,
} from './fec/fec-mapper.js';
import { validateFecEntries, type ValidationResult } from './fec/fec-validator.js';
import { generateFecFile, generateFecFilename } from './fec/fec-generator.js';

// BUSINESS RULE [CDC-3.2]: Service export comptable FEC

export interface AccountingDataSource {
  getSaleInvoices(tenantId: string, from: Date, to: Date): Promise<SaleInvoice[]>;
  getPurchaseInvoices(tenantId: string, from: Date, to: Date): Promise<PurchaseInvoice[]>;
  getPayments(tenantId: string, from: Date, to: Date): Promise<PaymentRecord[]>;
  getTenantSiret(tenantId: string): Promise<string>;
}

export function createAccountingService(dataSource: AccountingDataSource) {
  return {
    async generateFec(
      tenantId: string,
      from: Date,
      to: Date,
    ): Promise<Result<{ content: string; filename: string; validation: ValidationResult }, AppError>> {
      resetEntryCounter();

      const [sales, purchases, payments, siret] = await Promise.all([
        dataSource.getSaleInvoices(tenantId, from, to),
        dataSource.getPurchaseInvoices(tenantId, from, to),
        dataSource.getPayments(tenantId, from, to),
        dataSource.getTenantSiret(tenantId),
      ]);

      const entries: FecEntry[] = [];

      for (const sale of sales) {
        entries.push(...mapSaleInvoice(sale));
      }
      for (const purchase of purchases) {
        entries.push(...mapPurchaseInvoice(purchase));
      }
      for (const payment of payments) {
        entries.push(...mapPayment(payment));
      }

      const validation = validateFecEntries(entries);
      const content = generateFecFile(entries);
      const filename = generateFecFilename(siret, from, to);

      return ok({ content, filename, validation });
    },

    async validateFec(
      tenantId: string,
      from: Date,
      to: Date,
    ): Promise<Result<ValidationResult, AppError>> {
      resetEntryCounter();

      const [sales, purchases, payments] = await Promise.all([
        dataSource.getSaleInvoices(tenantId, from, to),
        dataSource.getPurchaseInvoices(tenantId, from, to),
        dataSource.getPayments(tenantId, from, to),
      ]);

      const entries: FecEntry[] = [];
      for (const sale of sales) entries.push(...mapSaleInvoice(sale));
      for (const purchase of purchases) entries.push(...mapPurchaseInvoice(purchase));
      for (const payment of payments) entries.push(...mapPayment(payment));

      return ok(validateFecEntries(entries));
    },
  };
}
