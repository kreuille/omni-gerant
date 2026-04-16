import { ok, err } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';
import type { BridgeClient, BridgeAccount, BridgeTransaction } from './bridge-client.js';
import { categorizeTransaction } from './bridge-client.js';
import type {
  BankAccountRepository,
  BankTransactionRepository,
  BankAccount,
  CreateTransactionData,
} from './bank.service.js';

// BUSINESS RULE [CDC-2.3]: Synchronisation transactions via DSP2

export interface SyncResult {
  account_id: string;
  new_transactions: number;
  updated_balance_cents: number;
}

export function createSyncService(
  bridgeClient: BridgeClient,
  accountRepo: BankAccountRepository,
  transactionRepo: BankTransactionRepository,
) {
  /**
   * Convert Bridge API euros (float) to centimes (int)
   * BUSINESS RULE [R02]: Montants en centimes
   */
  function eurosToCents(euros: number): number {
    return Math.round(euros * 100);
  }

  /**
   * Sync a single bank account's transactions from Bridge API
   */
  async function syncAccount(
    tenantId: string,
    account: BankAccount,
    userUuid: string,
  ): Promise<Result<SyncResult, AppError>> {
    if (!account.provider_id) {
      return err({
        code: 'BAD_REQUEST',
        message: `Account ${account.id} has no provider_id`,
      });
    }

    const providerId = parseInt(account.provider_id, 10);

    // Fetch latest transactions from Bridge
    const since = account.last_sync_at
      ? account.last_sync_at.toISOString().split('T')[0]
      : undefined;

    const transResult = await bridgeClient.listTransactions(
      userUuid,
      providerId,
      since,
    );
    if (!transResult.ok) {
      // Mark account as error
      await accountRepo.update(account.id, tenantId, { status: 'error' });
      return err(transResult.error);
    }

    // Filter out already-imported transactions
    const newTransactions: CreateTransactionData[] = [];
    for (const bt of transResult.value) {
      if (bt.is_deleted) continue;

      const existing = await transactionRepo.findByProviderId(
        String(bt.id),
        account.id,
      );
      if (existing) continue;

      const amountCents = eurosToCents(bt.amount);

      newTransactions.push({
        tenant_id: tenantId,
        bank_account_id: account.id,
        provider_id: String(bt.id),
        date: new Date(bt.date),
        value_date: bt.value_date ? new Date(bt.value_date) : undefined,
        amount_cents: amountCents,
        currency: bt.currency_code || 'EUR',
        label: bt.description,
        raw_label: bt.raw_description,
        category: categorizeTransaction(bt.raw_description, bt.category_id),
        type: amountCents >= 0 ? 'credit' : 'debit',
      });
    }

    // Batch insert new transactions
    let insertedCount = 0;
    if (newTransactions.length > 0) {
      insertedCount = await transactionRepo.createMany(newTransactions);
    }

    // Update account balance from Bridge
    const accountsResult = await bridgeClient.listAccounts(userUuid);
    let updatedBalanceCents = account.balance_cents;
    if (accountsResult.ok) {
      const bridgeAccount = accountsResult.value.find(
        (a) => String(a.id) === account.provider_id,
      );
      if (bridgeAccount) {
        updatedBalanceCents = eurosToCents(bridgeAccount.balance);
        await accountRepo.update(account.id, tenantId, {
          balance_cents: updatedBalanceCents,
          last_sync_at: new Date(),
          status: 'active',
          bank_name: bridgeAccount.bank_name || account.bank_name,
        });
      }
    }

    return ok({
      account_id: account.id,
      new_transactions: insertedCount,
      updated_balance_cents: updatedBalanceCents,
    });
  }

  /**
   * Sync all accounts for a tenant
   */
  async function syncAllAccounts(
    tenantId: string,
    userUuid: string,
  ): Promise<Result<SyncResult[], AppError>> {
    const accountsResult = await accountRepo.list(tenantId, {
      status: 'active',
      limit: 100,
    });

    const results: SyncResult[] = [];
    for (const account of accountsResult.items) {
      const result = await syncAccount(tenantId, account, userUuid);
      if (result.ok) {
        results.push(result.value);
      }
      // Continue syncing other accounts even if one fails
    }

    return ok(results);
  }

  /**
   * Import accounts from Bridge after initial connection
   */
  async function importAccounts(
    tenantId: string,
    userUuid: string,
  ): Promise<Result<BankAccount[], AppError>> {
    const accountsResult = await bridgeClient.listAccounts(userUuid);
    if (!accountsResult.ok) return accountsResult;

    const imported: BankAccount[] = [];
    for (const ba of accountsResult.value) {
      // Check if already imported
      const existing = await accountRepo.findByProviderId(String(ba.id), tenantId);
      if (existing) {
        imported.push(existing);
        continue;
      }

      const account = await accountRepo.create({
        tenant_id: tenantId,
        provider_id: String(ba.id),
        bank_name: ba.bank_name,
        account_name: ba.name,
        iban: ba.iban,
        balance_cents: eurosToCents(ba.balance),
        currency: ba.currency || 'EUR',
      });
      imported.push(account);
    }

    return ok(imported);
  }

  /**
   * Handle Bridge webhook notification
   */
  async function handleWebhook(
    payload: string,
    signature: string,
  ): Promise<Result<void, AppError>> {
    // Validate signature
    if (!bridgeClient.validateWebhook(payload, signature)) {
      return err({ code: 'UNAUTHORIZED', message: 'Invalid webhook signature' });
    }

    // Parse and process — actual sync will be triggered by the job
    return ok(undefined);
  }

  return {
    syncAccount,
    syncAllAccounts,
    importAccounts,
    handleWebhook,
    eurosToCents,
  };
}
