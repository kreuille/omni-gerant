// BUSINESS RULE [CDC-2.1]: NF525 — Inalterabilite, securisation, conservation, tracabilite
// BUSINESS RULE [CDC-2.1]: Hash chaine SHA-256 — chaque facture reference la precedente
// BUSINESS RULE [CDC-2.1]: Facture validee immuable — seul un avoir peut corriger

import type { Result } from '@zenadmin/shared';
import { ok, err, appError, notFound } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';
import type { Invoice, InvoiceLine } from './invoice.service.js';
import crypto from 'node:crypto';

// --- Types ---

export interface InvoiceHashChain {
  invoiceId: string;
  invoiceNumber: string;
  sequenceNumber: number;
  currentHash: string;
  previousHash: string;       // 'GENESIS' for the first invoice
  timestamp: Date;
  signedFields: string[];
}

export interface ChainVerificationReport {
  totalInvoices: number;
  verifiedOk: number;
  errors: ChainError[];
  isChainValid: boolean;
}

export interface ChainError {
  invoiceId: string;
  invoiceNumber: string;
  errorType: 'hash_mismatch' | 'sequence_gap' | 'missing_previous';
  details: string;
}

// --- Hash chain storage ---

export interface NF525Repository {
  getLastChainEntry(tenantId: string): Promise<InvoiceHashChain | null>;
  saveChainEntry(tenantId: string, entry: InvoiceHashChain): Promise<void>;
  getChainEntry(invoiceId: string, tenantId: string): Promise<InvoiceHashChain | null>;
  getAllChainEntries(tenantId: string): Promise<InvoiceHashChain[]>;
}

// --- Invoice repository for NF525 ---

export interface NF525InvoiceRepository {
  findById(id: string, tenantId: string): Promise<Invoice | null>;
  updateNF525Hash(id: string, tenantId: string, hash: string, sequenceNumber: number): Promise<Invoice | null>;
}

// --- Signed fields ---

const SIGNED_FIELDS = [
  'invoiceNumber',
  'issueDate',
  'dueDate',
  'sellerSiret',
  'buyerSiret',
  'totalHtCents',
  'totalTvaCents',
  'totalTtcCents',
  'lines',
  'previousHash',
];

// BUSINESS RULE [CDC-2.1]: Serialisation deterministe des champs pour le hash
function buildHashPayload(invoice: Invoice, lines: InvoiceLine[], previousHash: string): string {
  // Deterministic JSON with sorted keys
  const payload = {
    buyerSiret: '', // Not stored on invoice directly — placeholder for buyer context
    dueDate: invoice.due_date.toISOString(),
    invoiceNumber: invoice.number,
    issueDate: invoice.issue_date.toISOString(),
    lines: lines
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        description: l.label,
        quantity: l.quantity,
        tvaRate: l.tva_rate,
        unitPriceCents: l.unit_price_cents,
      })),
    previousHash,
    sellerSiret: '', // Context-dependent
    totalHtCents: invoice.total_ht_cents,
    totalTtcCents: invoice.total_ttc_cents,
    totalTvaCents: invoice.total_tva_cents,
  };

  return JSON.stringify(payload);
}

// BUSINESS RULE [CDC-2.1]: Hash SHA-256 de la facture
function computeHash(payload: string): string {
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

// --- Service ---

export function createNF525Service(
  nf525Repo: NF525Repository,
  invoiceRepo: NF525InvoiceRepository,
) {
  // BUSINESS RULE [CDC-2.1]: Valider une facture et l'ajouter a la chaine NF525
  async function sealInvoice(
    invoiceId: string,
    tenantId: string,
  ): Promise<Result<InvoiceHashChain, AppError>> {
    const invoice = await invoiceRepo.findById(invoiceId, tenantId);
    if (!invoice) return err(notFound('Invoice', invoiceId));

    // Check if already sealed
    const existingEntry = await nf525Repo.getChainEntry(invoiceId, tenantId);
    if (existingEntry) {
      return err(appError('CONFLICT', 'Invoice already sealed in NF525 chain'));
    }

    // Get previous hash (or GENESIS)
    const lastEntry = await nf525Repo.getLastChainEntry(tenantId);
    const previousHash = lastEntry ? lastEntry.currentHash : 'GENESIS';
    const sequenceNumber = lastEntry ? lastEntry.sequenceNumber + 1 : 1;

    // Build and compute hash
    const payload = buildHashPayload(invoice, invoice.lines, previousHash);
    const currentHash = computeHash(payload);

    const entry: InvoiceHashChain = {
      invoiceId,
      invoiceNumber: invoice.number,
      sequenceNumber,
      currentHash,
      previousHash,
      timestamp: new Date(),
      signedFields: SIGNED_FIELDS,
    };

    await nf525Repo.saveChainEntry(tenantId, entry);
    await invoiceRepo.updateNF525Hash(invoiceId, tenantId, currentHash, sequenceNumber);

    return ok(entry);
  }

  // BUSINESS RULE [CDC-2.1]: Verifier l'integrite d'une facture individuelle
  async function verifyInvoiceIntegrity(
    invoiceId: string,
    tenantId: string,
  ): Promise<Result<boolean, AppError>> {
    const invoice = await invoiceRepo.findById(invoiceId, tenantId);
    if (!invoice) return err(notFound('Invoice', invoiceId));

    const entry = await nf525Repo.getChainEntry(invoiceId, tenantId);
    if (!entry) {
      return err(appError('NOT_FOUND', 'Invoice not found in NF525 chain'));
    }

    const payload = buildHashPayload(invoice, invoice.lines, entry.previousHash);
    const recomputedHash = computeHash(payload);

    return ok(recomputedHash === entry.currentHash);
  }

  // BUSINESS RULE [CDC-2.1]: Verifier toute la chaine (detecte trous et modifications)
  async function verifyChainIntegrity(
    tenantId: string,
  ): Promise<Result<ChainVerificationReport, AppError>> {
    const entries = await nf525Repo.getAllChainEntries(tenantId);
    const sortedEntries = [...entries].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    const errors: ChainError[] = [];
    let verifiedOk = 0;

    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i]!;

      // Check sequence gaps
      const expectedSeq = i + 1;
      if (entry.sequenceNumber !== expectedSeq) {
        errors.push({
          invoiceId: entry.invoiceId,
          invoiceNumber: entry.invoiceNumber,
          errorType: 'sequence_gap',
          details: `Expected sequence ${expectedSeq}, got ${entry.sequenceNumber}`,
        });
      }

      // Check previous hash linkage
      if (i === 0) {
        if (entry.previousHash !== 'GENESIS') {
          errors.push({
            invoiceId: entry.invoiceId,
            invoiceNumber: entry.invoiceNumber,
            errorType: 'missing_previous',
            details: `First entry should have previousHash = GENESIS, got ${entry.previousHash}`,
          });
        }
      } else {
        const prevEntry = sortedEntries[i - 1]!;
        if (entry.previousHash !== prevEntry.currentHash) {
          errors.push({
            invoiceId: entry.invoiceId,
            invoiceNumber: entry.invoiceNumber,
            errorType: 'missing_previous',
            details: `Previous hash mismatch: expected ${prevEntry.currentHash}, got ${entry.previousHash}`,
          });
        }
      }

      // Verify hash integrity
      const invoice = await invoiceRepo.findById(entry.invoiceId, tenantId);
      if (!invoice) {
        errors.push({
          invoiceId: entry.invoiceId,
          invoiceNumber: entry.invoiceNumber,
          errorType: 'hash_mismatch',
          details: 'Invoice not found in database — may have been deleted',
        });
        continue;
      }

      const payload = buildHashPayload(invoice, invoice.lines, entry.previousHash);
      const recomputedHash = computeHash(payload);

      if (recomputedHash !== entry.currentHash) {
        errors.push({
          invoiceId: entry.invoiceId,
          invoiceNumber: entry.invoiceNumber,
          errorType: 'hash_mismatch',
          details: 'Hash does not match current invoice data — invoice may have been modified',
        });
      } else {
        verifiedOk++;
      }
    }

    return ok({
      totalInvoices: sortedEntries.length,
      verifiedOk,
      errors,
      isChainValid: errors.length === 0,
    });
  }

  // BUSINESS RULE [CDC-2.1]: NF525 — Facture validee immuable
  function checkImmutability(invoice: Invoice): Result<void, AppError> {
    // If the invoice has been finalized (has finalized_at), it's immutable
    if (invoice.finalized_at) {
      return err(appError(
        'FORBIDDEN',
        'INVOICE_IMMUTABLE: Facture validee NF525, modification impossible. Creez un avoir.',
      ));
    }
    return ok(undefined);
  }

  // BUSINESS RULE [CDC-2.1]: Soft delete interdit sur facture validee
  function checkDeletable(invoice: Invoice): Result<void, AppError> {
    if (invoice.finalized_at) {
      return err(appError(
        'FORBIDDEN',
        'INVOICE_IMMUTABLE: Impossible de supprimer une facture validee NF525. Creez un avoir.',
      ));
    }
    return ok(undefined);
  }

  return {
    sealInvoice,
    verifyInvoiceIntegrity,
    verifyChainIntegrity,
    checkImmutability,
    checkDeletable,
    // Expose for testing
    _buildHashPayload: buildHashPayload,
    _computeHash: computeHash,
  };
}
