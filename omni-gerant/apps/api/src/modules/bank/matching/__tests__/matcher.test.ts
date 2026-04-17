import { describe, it, expect, vi } from 'vitest';
import { runMatching, type CandidateProvider, type TransactionMatcher } from '../matcher.js';
import type { BankTransaction } from '../../bank.service.js';
import type { MatchCandidate } from '../rules.js';
import { ok } from '@zenadmin/shared';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

function makeTransaction(overrides: Partial<BankTransaction> = {}): BankTransaction {
  return {
    id: crypto.randomUUID(),
    tenant_id: TENANT_ID,
    bank_account_id: 'acc-1',
    provider_id: null,
    date: new Date('2026-04-14'),
    value_date: null,
    amount_cents: 150000,
    currency: 'EUR',
    label: 'VIR DUPONT SARL FAC-2026-00042',
    raw_label: null,
    category: null,
    type: 'credit',
    matched: false,
    invoice_id: null,
    purchase_id: null,
    created_at: new Date(),
    ...overrides,
  };
}

function makeInvoiceCandidate(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    id: crypto.randomUUID(),
    type: 'invoice',
    number: 'FAC-2026-00042',
    amount_ttc_cents: 150000,
    remaining_cents: 150000,
    due_date: new Date('2026-04-15'),
    entity_name: 'Dupont SARL',
    ...overrides,
  };
}

function makePurchaseCandidate(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    id: crypto.randomUUID(),
    type: 'purchase',
    number: null,
    amount_ttc_cents: 18500,
    remaining_cents: 18500,
    due_date: new Date('2026-04-13'),
    entity_name: 'EDF',
    ...overrides,
  };
}

describe('runMatching', () => {
  function createProvider(
    invoices: MatchCandidate[],
    purchases: MatchCandidate[],
  ): CandidateProvider {
    return {
      getInvoiceCandidates: vi.fn().mockResolvedValue(invoices),
      getPurchaseCandidates: vi.fn().mockResolvedValue(purchases),
    };
  }

  function createMatcher(): TransactionMatcher {
    return {
      markMatched: vi.fn().mockResolvedValue(ok(undefined)),
    };
  }

  it('auto-matches transaction with exact amount + reference', async () => {
    const invoice = makeInvoiceCandidate();
    const transaction = makeTransaction();
    const provider = createProvider([invoice], []);
    const matcher = createMatcher();

    const result = await runMatching(
      TENANT_ID,
      [transaction],
      provider,
      matcher,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.auto_matched).toHaveLength(1);
      expect(result.value.auto_matched[0]!.transaction_id).toBe(transaction.id);
      expect(result.value.auto_matched[0]!.candidate_id).toBe(invoice.id);
      expect(result.value.auto_matched[0]!.score).toBe(100);
      expect(result.value.suggestions).toHaveLength(0);
    }

    expect(matcher.markMatched).toHaveBeenCalledWith(
      transaction.id,
      TENANT_ID,
      invoice.id,
      undefined,
    );
  });

  it('creates suggestion for partial match (amount only)', async () => {
    const invoice = makeInvoiceCandidate({ number: null, entity_name: null, due_date: null });
    const transaction = makeTransaction({ label: 'VIR INCONNU REF 12345' });
    const provider = createProvider([invoice], []);
    const matcher = createMatcher();

    const result = await runMatching(
      TENANT_ID,
      [transaction],
      provider,
      matcher,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.auto_matched).toHaveLength(0);
      expect(result.value.suggestions).toHaveLength(1);
      expect(result.value.suggestions[0]!.best_match!.score).toBe(60);
    }

    expect(matcher.markMatched).not.toHaveBeenCalled();
  });

  it('matches debit transactions to purchases', async () => {
    const purchase = makePurchaseCandidate();
    const transaction = makeTransaction({
      amount_cents: -18500,
      label: 'PRELEVEMENT EDF SA',
      type: 'debit',
    });
    const provider = createProvider([], [purchase]);
    const matcher = createMatcher();

    const result = await runMatching(
      TENANT_ID,
      [transaction],
      provider,
      matcher,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      // exact_amount(60) + entity_name(20 for "EDF" word match) = 80, suggestion
      const hasSuggestionOrAutoMatch =
        result.value.suggestions.length > 0 || result.value.auto_matched.length > 0;
      expect(hasSuggestionOrAutoMatch).toBe(true);
    }
  });

  it('prevents double matching of same candidate', async () => {
    const invoice = makeInvoiceCandidate();
    const tx1 = makeTransaction({ id: 'tx-1', label: 'VIR DUPONT SARL FAC-2026-00042' });
    const tx2 = makeTransaction({ id: 'tx-2', label: 'VIR DUPONT SARL FAC-2026-00042' });
    const provider = createProvider([invoice], []);
    const matcher = createMatcher();

    const result = await runMatching(
      TENANT_ID,
      [tx1, tx2],
      provider,
      matcher,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      // First should auto-match, second should not find the same candidate
      expect(result.value.auto_matched).toHaveLength(1);
      expect(result.value.auto_matched[0]!.transaction_id).toBe('tx-1');
    }
  });

  it('skips already matched transactions', async () => {
    const transaction = makeTransaction({ matched: true });
    const provider = createProvider([makeInvoiceCandidate()], []);
    const matcher = createMatcher();

    const result = await runMatching(
      TENANT_ID,
      [transaction],
      provider,
      matcher,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.auto_matched).toHaveLength(0);
      expect(result.value.suggestions).toHaveLength(0);
    }
  });

  it('handles multiple suggestions for one transaction', async () => {
    const inv1 = makeInvoiceCandidate({ id: 'inv-1', entity_name: null, number: null });
    const inv2 = makeInvoiceCandidate({ id: 'inv-2', entity_name: null, number: null, remaining_cents: 150000 });
    const transaction = makeTransaction({ label: 'VIR REFERENCE INCONNUE' });
    const provider = createProvider([inv1, inv2], []);
    const matcher = createMatcher();

    const result = await runMatching(
      TENANT_ID,
      [transaction],
      provider,
      matcher,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.suggestions).toHaveLength(1);
      // Should have multiple matches in the suggestion
      expect(result.value.suggestions[0]!.matches.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('counts unmatched transactions correctly', async () => {
    const transaction = makeTransaction({
      amount_cents: 12345,
      label: 'RANDOM UNKNOWN LABEL',
    });
    const provider = createProvider([], []);
    const matcher = createMatcher();

    const result = await runMatching(
      TENANT_ID,
      [transaction],
      provider,
      matcher,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.unmatched_count).toBe(1);
    }
  });

  it('handles mixed auto-match and suggestions in one run', async () => {
    const inv1 = makeInvoiceCandidate({ id: 'inv-1' }); // will auto-match tx1
    const inv2 = makeInvoiceCandidate({
      id: 'inv-2',
      number: null,
      entity_name: null,
      amount_ttc_cents: 85000,
      remaining_cents: 85000,
    });

    const tx1 = makeTransaction({ id: 'tx-1' }); // perfect match with inv1
    const tx2 = makeTransaction({
      id: 'tx-2',
      amount_cents: 85000,
      label: 'VIR INCONNU',
    }); // amount-only match

    const provider = createProvider([inv1, inv2], []);
    const matcher = createMatcher();

    const result = await runMatching(
      TENANT_ID,
      [tx1, tx2],
      provider,
      matcher,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.auto_matched).toHaveLength(1);
      expect(result.value.suggestions).toHaveLength(1);
    }
  });
});
