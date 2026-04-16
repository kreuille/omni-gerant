import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSyncService } from '../sync.service.js';
import type { BridgeClient, BridgeAccount, BridgeTransaction } from '../bridge-client.js';
import type {
  BankAccountRepository,
  BankTransactionRepository,
  BankAccount,
  CreateBankAccountData,
  CreateTransactionData,
} from '../bank.service.js';
import { ok, err } from '@zenadmin/shared';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

function createMockBridgeClient(): BridgeClient {
  return {
    getConnectUrl: vi.fn(),
    listAccounts: vi.fn(),
    listTransactions: vi.fn(),
    refreshItem: vi.fn(),
    validateWebhook: vi.fn(),
  };
}

function createMockAccountRepo(): BankAccountRepository {
  const accounts = new Map<string, BankAccount>();

  return {
    async create(data: CreateBankAccountData) {
      const id = crypto.randomUUID();
      const account: BankAccount = {
        id,
        tenant_id: data.tenant_id,
        provider_id: data.provider_id ?? null,
        bank_name: data.bank_name,
        account_name: data.account_name ?? null,
        iban: data.iban ?? null,
        bic: data.bic ?? null,
        balance_cents: data.balance_cents ?? 0,
        currency: data.currency ?? 'EUR',
        last_sync_at: null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      accounts.set(id, account);
      return account;
    },
    async findById(id, tenantId) {
      const a = accounts.get(id);
      if (!a || a.tenant_id !== tenantId || a.deleted_at) return null;
      return a;
    },
    async findByProviderId(providerId, tenantId) {
      for (const a of accounts.values()) {
        if (a.provider_id === providerId && a.tenant_id === tenantId && !a.deleted_at) return a;
      }
      return null;
    },
    async update(id, tenantId, data) {
      const a = accounts.get(id);
      if (!a || a.tenant_id !== tenantId || a.deleted_at) return null;
      const updated = { ...a, ...data, updated_at: new Date() } as BankAccount;
      accounts.set(id, updated);
      return updated;
    },
    async softDelete(id, tenantId) {
      const a = accounts.get(id);
      if (!a || a.tenant_id !== tenantId) return false;
      a.deleted_at = new Date();
      return true;
    },
    async list(tenantId, query) {
      let items = [...accounts.values()].filter(
        (a) => a.tenant_id === tenantId && !a.deleted_at,
      );
      if (query.status) items = items.filter((a) => a.status === query.status);
      return { items, next_cursor: null, has_more: false };
    },
  };
}

function createMockTransactionRepo(): BankTransactionRepository {
  const transactions = new Map<string, { id: string; provider_id: string | null; bank_account_id: string }>();
  let count = 0;

  return {
    async create(data: CreateTransactionData) {
      const id = crypto.randomUUID();
      transactions.set(id, { id, provider_id: data.provider_id ?? null, bank_account_id: data.bank_account_id });
      count++;
      return {
        id,
        tenant_id: data.tenant_id,
        bank_account_id: data.bank_account_id,
        provider_id: data.provider_id ?? null,
        date: data.date,
        value_date: data.value_date ?? null,
        amount_cents: data.amount_cents,
        currency: data.currency ?? 'EUR',
        label: data.label,
        raw_label: data.raw_label ?? null,
        category: data.category ?? null,
        type: data.type ?? null,
        matched: false,
        invoice_id: null,
        purchase_id: null,
        created_at: new Date(),
      };
    },
    async createMany(data) {
      for (const d of data) {
        await this.create(d);
      }
      return data.length;
    },
    async findById() { return null; },
    async findByProviderId(providerId, bankAccountId) {
      for (const tx of transactions.values()) {
        if (tx.provider_id === providerId && tx.bank_account_id === bankAccountId) {
          return { id: tx.id, matched: false } as any;
        }
      }
      return null;
    },
    async update() { return null; },
    async list() { return { items: [], next_cursor: null, has_more: false }; },
  };
}

describe('SyncService', () => {
  let bridgeClient: ReturnType<typeof createMockBridgeClient>;
  let accountRepo: BankAccountRepository;
  let transactionRepo: BankTransactionRepository;
  let syncService: ReturnType<typeof createSyncService>;

  beforeEach(() => {
    bridgeClient = createMockBridgeClient();
    accountRepo = createMockAccountRepo();
    transactionRepo = createMockTransactionRepo();
    syncService = createSyncService(bridgeClient, accountRepo, transactionRepo);
  });

  describe('eurosToCents', () => {
    it('converts euros to centimes correctly', () => {
      // BUSINESS RULE [R02]: Montants en centimes
      expect(syncService.eurosToCents(15.42)).toBe(1542);
      expect(syncService.eurosToCents(0.01)).toBe(1);
      expect(syncService.eurosToCents(100.00)).toBe(10000);
      expect(syncService.eurosToCents(-25.50)).toBe(-2550);
      expect(syncService.eurosToCents(0)).toBe(0);
    });

    it('handles floating point precision', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      expect(syncService.eurosToCents(0.3)).toBe(30);
      expect(syncService.eurosToCents(19.99)).toBe(1999);
    });
  });

  describe('syncAccount', () => {
    it('syncs new transactions from Bridge', async () => {
      // Create account with provider_id
      const account = await accountRepo.create({
        tenant_id: TENANT_ID,
        provider_id: '1001',
        bank_name: 'Credit Agricole',
      });

      const bridgeTransactions: BridgeTransaction[] = [
        {
          id: 5001,
          account_id: 1001,
          date: '2026-04-14',
          value_date: '2026-04-14',
          amount: 250.00,
          currency_code: 'EUR',
          description: 'Virement client Dupont',
          raw_description: 'VIR DUPONT SARL',
          category_id: null,
          is_deleted: false,
        },
        {
          id: 5002,
          account_id: 1001,
          date: '2026-04-13',
          value_date: null,
          amount: -18.50,
          currency_code: 'EUR',
          description: 'EDF Facture',
          raw_description: 'PRELEVEMENT EDF SA',
          category_id: 4,
          is_deleted: false,
        },
      ];

      (bridgeClient.listTransactions as any).mockResolvedValue(ok(bridgeTransactions));
      (bridgeClient.listAccounts as any).mockResolvedValue(
        ok([{ id: 1001, balance: 1542.30, bank_name: 'Credit Agricole' }]),
      );

      const result = await syncService.syncAccount(TENANT_ID, account, 'user-uuid');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.new_transactions).toBe(2);
        expect(result.value.updated_balance_cents).toBe(154230);
      }
    });

    it('skips deleted transactions', async () => {
      const account = await accountRepo.create({
        tenant_id: TENANT_ID,
        provider_id: '1001',
        bank_name: 'CA',
      });

      (bridgeClient.listTransactions as any).mockResolvedValue(ok([
        {
          id: 5001,
          account_id: 1001,
          date: '2026-04-14',
          value_date: null,
          amount: 100,
          currency_code: 'EUR',
          description: 'Deleted',
          raw_description: 'DELETED',
          category_id: null,
          is_deleted: true,
        },
      ]));
      (bridgeClient.listAccounts as any).mockResolvedValue(ok([{ id: 1001, balance: 100 }]));

      const result = await syncService.syncAccount(TENANT_ID, account, 'user');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.new_transactions).toBe(0);
      }
    });

    it('skips already imported transactions', async () => {
      const account = await accountRepo.create({
        tenant_id: TENANT_ID,
        provider_id: '1001',
        bank_name: 'CA',
      });

      // Pre-import a transaction
      await transactionRepo.create({
        tenant_id: TENANT_ID,
        bank_account_id: account.id,
        provider_id: '5001',
        date: new Date('2026-04-14'),
        amount_cents: 25000,
        label: 'Already imported',
      });

      (bridgeClient.listTransactions as any).mockResolvedValue(ok([
        {
          id: 5001,
          account_id: 1001,
          date: '2026-04-14',
          value_date: null,
          amount: 250,
          currency_code: 'EUR',
          description: 'Already imported',
          raw_description: 'VIR',
          category_id: null,
          is_deleted: false,
        },
      ]));
      (bridgeClient.listAccounts as any).mockResolvedValue(ok([{ id: 1001, balance: 250 }]));

      const result = await syncService.syncAccount(TENANT_ID, account, 'user');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.new_transactions).toBe(0);
      }
    });

    it('returns error for account without provider_id', async () => {
      const account = await accountRepo.create({
        tenant_id: TENANT_ID,
        bank_name: 'Manual Account',
      });

      const result = await syncService.syncAccount(TENANT_ID, account, 'user');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('BAD_REQUEST');
      }
    });

    it('marks account as error on Bridge API failure', async () => {
      const account = await accountRepo.create({
        tenant_id: TENANT_ID,
        provider_id: '1001',
        bank_name: 'CA',
      });

      (bridgeClient.listTransactions as any).mockResolvedValue(
        err({ code: 'SERVICE_UNAVAILABLE', message: 'Bridge down' }),
      );

      const result = await syncService.syncAccount(TENANT_ID, account, 'user');
      expect(result.ok).toBe(false);

      // Account should be marked as error
      const updated = await accountRepo.findById(account.id, TENANT_ID);
      expect(updated?.status).toBe('error');
    });
  });

  describe('importAccounts', () => {
    it('imports accounts from Bridge', async () => {
      const bridgeAccounts: BridgeAccount[] = [
        {
          id: 1001,
          name: 'Compte Courant',
          balance: 1542.30,
          iban: 'FR7630006000011234567890189',
          currency: 'EUR',
          bank_name: 'Credit Agricole',
          status: '0',
          updated_at: '2026-04-14T08:00:00Z',
        },
        {
          id: 1002,
          name: 'Compte Epargne',
          balance: 8500.00,
          iban: 'FR7630004000031234567890143',
          currency: 'EUR',
          bank_name: 'Credit Agricole',
          status: '0',
          updated_at: '2026-04-14T08:00:00Z',
        },
      ];

      (bridgeClient.listAccounts as any).mockResolvedValue(ok(bridgeAccounts));

      const result = await syncService.importAccounts(TENANT_ID, 'user-uuid');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]!.bank_name).toBe('Credit Agricole');
        expect(result.value[0]!.balance_cents).toBe(154230);
        expect(result.value[1]!.balance_cents).toBe(850000);
      }
    });

    it('does not duplicate already imported accounts', async () => {
      // Pre-create account
      await accountRepo.create({
        tenant_id: TENANT_ID,
        provider_id: '1001',
        bank_name: 'Credit Agricole',
        balance_cents: 100000,
      });

      (bridgeClient.listAccounts as any).mockResolvedValue(ok([
        {
          id: 1001,
          name: 'Compte Courant',
          balance: 1542.30,
          iban: 'FR76',
          currency: 'EUR',
          bank_name: 'Credit Agricole',
          status: '0',
          updated_at: '2026-04-14',
        },
      ]));

      const result = await syncService.importAccounts(TENANT_ID, 'user');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        // Should return the existing account, not create a new one
        expect(result.value[0]!.balance_cents).toBe(100000);
      }
    });

    it('returns error when Bridge API fails', async () => {
      (bridgeClient.listAccounts as any).mockResolvedValue(
        err({ code: 'UNAUTHORIZED', message: 'Invalid token' }),
      );

      const result = await syncService.importAccounts(TENANT_ID, 'user');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('handleWebhook', () => {
    it('rejects invalid signature', async () => {
      (bridgeClient.validateWebhook as any).mockReturnValue(false);

      const result = await syncService.handleWebhook('{}', 'bad-sig');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('accepts valid webhook', async () => {
      (bridgeClient.validateWebhook as any).mockReturnValue(true);

      const result = await syncService.handleWebhook('{"type":"item.refreshed"}', 'valid-sig');
      expect(result.ok).toBe(true);
    });
  });

  describe('syncAllAccounts', () => {
    it('syncs all active accounts', async () => {
      await accountRepo.create({
        tenant_id: TENANT_ID,
        provider_id: '1001',
        bank_name: 'CA',
      });
      await accountRepo.create({
        tenant_id: TENANT_ID,
        provider_id: '1002',
        bank_name: 'BNP',
      });

      (bridgeClient.listTransactions as any).mockResolvedValue(ok([]));
      (bridgeClient.listAccounts as any).mockResolvedValue(ok([]));

      const result = await syncService.syncAllAccounts(TENANT_ID, 'user');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
    });
  });
});
