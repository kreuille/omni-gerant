import { ok, err } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';
import type { BankTransaction } from '../bank.service.js';
import type { MatchCandidate } from './rules.js';
import { rankCandidates, type MatchScore } from './scorer.js';

// BUSINESS RULE [CDC-2.3]: Algorithme principal de rapprochement bancaire

export interface MatchSuggestion {
  transaction: BankTransaction;
  matches: MatchScore[];
  best_match: MatchScore | null;
}

export interface MatchResult {
  auto_matched: Array<{ transaction_id: string; candidate_id: string; candidate_type: string; score: number }>;
  suggestions: MatchSuggestion[];
  unmatched_count: number;
}

export interface CandidateProvider {
  /** Get invoice candidates (positive amounts = incoming payments) */
  getInvoiceCandidates(tenantId: string): Promise<MatchCandidate[]>;
  /** Get purchase candidates (negative amounts = outgoing payments) */
  getPurchaseCandidates(tenantId: string): Promise<MatchCandidate[]>;
}

export interface TransactionMatcher {
  /** Mark a transaction as matched */
  markMatched(
    transactionId: string,
    tenantId: string,
    invoiceId?: string,
    purchaseId?: string,
  ): Promise<Result<void, AppError>>;
}

/**
 * Run matching algorithm on unmatched transactions
 */
export async function runMatching(
  tenantId: string,
  unmatchedTransactions: BankTransaction[],
  candidateProvider: CandidateProvider,
  transactionMatcher: TransactionMatcher,
  autoMatchThreshold = 100,
): Promise<Result<MatchResult, AppError>> {
  // Fetch all candidates
  const [invoiceCandidates, purchaseCandidates] = await Promise.all([
    candidateProvider.getInvoiceCandidates(tenantId),
    candidateProvider.getPurchaseCandidates(tenantId),
  ]);

  // Track already-matched candidate IDs to prevent double matching
  const matchedCandidateIds = new Set<string>();

  const autoMatched: MatchResult['auto_matched'] = [];
  const suggestions: MatchSuggestion[] = [];
  let unmatchedCount = 0;

  for (const transaction of unmatchedTransactions) {
    if (transaction.matched) continue;

    // Choose candidates based on transaction type
    // Credit (positive) → match with invoices (client payments)
    // Debit (negative) → match with purchases (supplier payments)
    const candidates = transaction.amount_cents >= 0
      ? invoiceCandidates.filter((c) => !matchedCandidateIds.has(c.id))
      : purchaseCandidates.filter((c) => !matchedCandidateIds.has(c.id));

    const ranked = rankCandidates(
      transaction.amount_cents,
      transaction.label + (transaction.raw_label ? ' ' + transaction.raw_label : ''),
      transaction.date,
      candidates,
    );

    if (ranked.length === 0) {
      unmatchedCount++;
      continue;
    }

    const bestMatch = ranked[0]!;

    // BUSINESS RULE [CDC-2.3]: Auto-match si score >= 100
    if (bestMatch.score >= autoMatchThreshold) {
      matchedCandidateIds.add(bestMatch.candidate.id);

      const matchResult = await transactionMatcher.markMatched(
        transaction.id,
        tenantId,
        bestMatch.candidate.type === 'invoice' ? bestMatch.candidate.id : undefined,
        bestMatch.candidate.type === 'purchase' ? bestMatch.candidate.id : undefined,
      );

      if (matchResult.ok) {
        autoMatched.push({
          transaction_id: transaction.id,
          candidate_id: bestMatch.candidate.id,
          candidate_type: bestMatch.candidate.type,
          score: bestMatch.score,
        });
      }
    } else {
      suggestions.push({
        transaction,
        matches: ranked,
        best_match: bestMatch,
      });
    }
  }

  return ok({
    auto_matched: autoMatched,
    suggestions,
    unmatched_count: unmatchedCount,
  });
}
