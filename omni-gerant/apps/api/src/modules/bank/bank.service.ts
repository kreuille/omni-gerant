import { ok, err } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';
import type { BankAccountListQuery, TransactionListQuery } from './bank.schemas.js';

// BUSINESS RULE [CDC-2.3]: Service bancaire - gestion comptes et transactions

export interface BankAccount {
  id: string;
  tenant_id: string;
  provider_id: string | null;
  bank_name: string;
  account_name: string | null;
  iban: string | null;
  bic: string | null;
  balance_cents: number;
  currency: string;
  last_sync_at: Date | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface BankTransaction {
  id: string;
  tenant_id: string;
  bank_account_id: string;
  provider_id: string | null;
  date: Date;
  value_date: Date | null;
  amount_cents: number;
  currency: string;
  label: string;
  raw_label: string | null;
  category: string | null;
  type: string | null;
  matched: boolean;
  invoice_id: string | null;
  purchase_id: string | null;
  created_at: Date;
}

export interface CreateBankAccountData {
  tenant_id: string;
  provider_id?: string;
  bank_name: string;
  account_name?: string;
  iban?: string;
  bic?: string;
  balance_cents?: number;
  currency?: string;
}

export interface CreateTransactionData {
  tenant_id: string;
  bank_account_id: string;
  provider_id?: string;
  date: Date;
  value_date?: Date;
  amount_cents: number;
  currency?: string;
  label: string;
  raw_label?: string;
  category?: string;
  type?: string;
}

export interface BankAccountRepository {
  create(data: CreateBankAccountData): Promise<BankAccount>;
  findById(id: string, tenantId: string): Promise<BankAccount | null>;
  findByProviderId(providerId: string, tenantId: string): Promise<BankAccount | null>;
  update(id: string, tenantId: string, data: Partial<BankAccount>): Promise<BankAccount | null>;
  softDelete(id: string, tenantId: string): Promise<boolean>;
  list(tenantId: string, query: BankAccountListQuery): Promise<{
    items: BankAccount[];
    next_cursor: string | null;
    has_more: boolean;
  }>;
}

export interface BankTransactionRepository {
  create(data: CreateTransactionData): Promise<BankTransaction>;
  createMany(data: CreateTransactionData[]): Promise<number>;
  findById(id: string, tenantId: string): Promise<BankTransaction | null>;
  findByProviderId(providerId: string, bankAccountId: string): Promise<BankTransaction | null>;
  update(id: string, tenantId: string, data: Partial<BankTransaction>): Promise<BankTransaction | null>;
  list(tenantId: string, query: TransactionListQuery): Promise<{
    items: BankTransaction[];
    next_cursor: string | null;
    has_more: boolean;
  }>;
}

export function createBankService(
  accountRepo: BankAccountRepository,
  transactionRepo: BankTransactionRepository,
) {
  return {
    // === Bank Accounts ===

    async createAccount(
      tenantId: string,
      data: Omit<CreateBankAccountData, 'tenant_id'>,
    ): Promise<Result<BankAccount, AppError>> {
      const account = await accountRepo.create({ ...data, tenant_id: tenantId });
      return ok(account);
    },

    async getAccount(
      id: string,
      tenantId: string,
    ): Promise<Result<BankAccount, AppError>> {
      const account = await accountRepo.findById(id, tenantId);
      if (!account) {
        return err({ code: 'NOT_FOUND', message: `Bank account ${id} not found` });
      }
      return ok(account);
    },

    async listAccounts(
      tenantId: string,
      query: BankAccountListQuery,
    ): Promise<Result<{ items: BankAccount[]; next_cursor: string | null; has_more: boolean }, AppError>> {
      const result = await accountRepo.list(tenantId, query);
      return ok(result);
    },

    async updateAccountStatus(
      id: string,
      tenantId: string,
      status: string,
    ): Promise<Result<BankAccount, AppError>> {
      const account = await accountRepo.update(id, tenantId, { status });
      if (!account) {
        return err({ code: 'NOT_FOUND', message: `Bank account ${id} not found` });
      }
      return ok(account);
    },

    async updateAccountBalance(
      id: string,
      tenantId: string,
      balanceCents: number,
    ): Promise<Result<BankAccount, AppError>> {
      const account = await accountRepo.update(id, tenantId, {
        balance_cents: balanceCents,
        last_sync_at: new Date(),
      });
      if (!account) {
        return err({ code: 'NOT_FOUND', message: `Bank account ${id} not found` });
      }
      return ok(account);
    },

    async disconnectAccount(
      id: string,
      tenantId: string,
    ): Promise<Result<BankAccount, AppError>> {
      const account = await accountRepo.update(id, tenantId, { status: 'disconnected' });
      if (!account) {
        return err({ code: 'NOT_FOUND', message: `Bank account ${id} not found` });
      }
      return ok(account);
    },

    async deleteAccount(
      id: string,
      tenantId: string,
    ): Promise<Result<void, AppError>> {
      const deleted = await accountRepo.softDelete(id, tenantId);
      if (!deleted) {
        return err({ code: 'NOT_FOUND', message: `Bank account ${id} not found` });
      }
      return ok(undefined);
    },

    // === Transactions ===

    async addTransaction(
      tenantId: string,
      data: Omit<CreateTransactionData, 'tenant_id'>,
    ): Promise<Result<BankTransaction, AppError>> {
      // Verify account exists
      const account = await accountRepo.findById(data.bank_account_id, tenantId);
      if (!account) {
        return err({ code: 'NOT_FOUND', message: `Bank account ${data.bank_account_id} not found` });
      }

      const transaction = await transactionRepo.create({ ...data, tenant_id: tenantId });
      return ok(transaction);
    },

    async addTransactions(
      tenantId: string,
      accountId: string,
      transactions: Omit<CreateTransactionData, 'tenant_id' | 'bank_account_id'>[],
    ): Promise<Result<number, AppError>> {
      // Verify account exists
      const account = await accountRepo.findById(accountId, tenantId);
      if (!account) {
        return err({ code: 'NOT_FOUND', message: `Bank account ${accountId} not found` });
      }

      const data = transactions.map((t) => ({
        ...t,
        tenant_id: tenantId,
        bank_account_id: accountId,
      }));

      const count = await transactionRepo.createMany(data);
      return ok(count);
    },

    async listTransactions(
      tenantId: string,
      query: TransactionListQuery,
    ): Promise<Result<{ items: BankTransaction[]; next_cursor: string | null; has_more: boolean }, AppError>> {
      const result = await transactionRepo.list(tenantId, query);
      return ok(result);
    },

    async getTransaction(
      id: string,
      tenantId: string,
    ): Promise<Result<BankTransaction, AppError>> {
      const transaction = await transactionRepo.findById(id, tenantId);
      if (!transaction) {
        return err({ code: 'NOT_FOUND', message: `Transaction ${id} not found` });
      }
      return ok(transaction);
    },

    async markTransactionMatched(
      id: string,
      tenantId: string,
      invoiceId?: string,
      purchaseId?: string,
    ): Promise<Result<BankTransaction, AppError>> {
      const transaction = await transactionRepo.update(id, tenantId, {
        matched: true,
        invoice_id: invoiceId ?? null,
        purchase_id: purchaseId ?? null,
      });
      if (!transaction) {
        return err({ code: 'NOT_FOUND', message: `Transaction ${id} not found` });
      }
      return ok(transaction);
    },

    async unmatchTransaction(
      id: string,
      tenantId: string,
    ): Promise<Result<BankTransaction, AppError>> {
      const transaction = await transactionRepo.update(id, tenantId, {
        matched: false,
        invoice_id: null,
        purchase_id: null,
      });
      if (!transaction) {
        return err({ code: 'NOT_FOUND', message: `Transaction ${id} not found` });
      }
      return ok(transaction);
    },
  };
}
