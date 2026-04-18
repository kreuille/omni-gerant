// BUSINESS RULE [CDC-2.1]: Workflow factures entrantes — reception, rapprochement, doublons
// BUSINESS RULE [R02]: Montants en centimes
// BUSINESS RULE [R03]: Multi-tenant avec tenant_id

import type { Result, PaginatedResult } from '@zenadmin/shared';
import { ok, err, notFound, validationError, appError, conflict } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';
import { parseFacturXXml, extractXmlFromPdf, type ParsedFacturXInvoice } from './facturx-parser.js';
import type { Supplier } from '../supplier/supplier.service.js';
import type { Purchase } from '../purchase/purchase.service.js';
import crypto from 'node:crypto';

// --- Types ---

export type IncomingInvoiceStatus =
  | 'received'
  | 'parsed'
  | 'validated'
  | 'matched'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'accounted';

export interface IncomingInvoice {
  id: string;
  tenant_id: string;
  status: IncomingInvoiceStatus;
  invoice_number: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_siret: string | null;
  buyer_siret: string | null;
  issue_date: Date | null;
  due_date: Date | null;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  matched_purchase_id: string | null;
  source: 'upload' | 'webhook' | 'email';
  manual_entry_required: boolean;
  duplicate_warning: boolean;
  rejection_reason: string | null;
  raw_xml: string | null;
  parsed_data: ParsedFacturXInvoice | null;
  ppf_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// --- Repository interface ---

export interface IncomingInvoiceRepository {
  create(data: Omit<IncomingInvoice, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<IncomingInvoice>;
  findById(id: string, tenantId: string): Promise<IncomingInvoice | null>;
  findByInvoiceAndSiret(invoiceNumber: string, supplierSiret: string, tenantId: string): Promise<IncomingInvoice | null>;
  updateStatus(id: string, tenantId: string, status: IncomingInvoiceStatus, extra?: Partial<IncomingInvoice>): Promise<IncomingInvoice | null>;
  softDelete(id: string, tenantId: string): Promise<boolean>;
  list(tenantId: string, query: IncomingInvoiceListQuery): Promise<{ items: IncomingInvoice[]; next_cursor: string | null; has_more: boolean }>;
}

export interface IncomingInvoiceListQuery {
  cursor?: string;
  limit: number;
  status?: IncomingInvoiceStatus;
  supplier_id?: string;
  from?: string;
  to?: string;
}

// --- Supplier lookup interface ---

export interface SupplierLookup {
  findBySiret(siret: string, tenantId: string): Promise<Supplier | null>;
  createFromParsed(tenantId: string, seller: ParsedFacturXInvoice['seller']): Promise<Supplier>;
}

// --- Purchase matching interface ---

export interface PurchaseMatcher {
  findCandidates(tenantId: string, supplierSiret: string, totalTtcCents: number, issueDate: Date): Promise<Purchase[]>;
}

// --- Webhook HMAC validation ---

export function verifyWebhookHmac(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
  } catch {
    return false;
  }
}

// --- Status machine ---

// BUSINESS RULE [CDC-2.1]: Machine a etats factures entrantes
const VALID_TRANSITIONS: Record<IncomingInvoiceStatus, IncomingInvoiceStatus[]> = {
  received: ['parsed', 'rejected'],
  parsed: ['validated', 'rejected'],
  validated: ['matched', 'approved', 'rejected'],
  matched: ['approved', 'rejected'],
  approved: ['paid', 'rejected'],
  rejected: [],
  paid: ['accounted'],
  accounted: [],
};

function canTransition(from: IncomingInvoiceStatus, to: IncomingInvoiceStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

// --- Service ---

export function createIncomingInvoiceService(
  repo: IncomingInvoiceRepository,
  supplierLookup: SupplierLookup,
  purchaseMatcher: PurchaseMatcher,
) {
  // BUSINESS RULE [CDC-2.1]: Upload PDF → parse auto
  async function uploadPdf(
    tenantId: string,
    pdfBuffer: Buffer,
  ): Promise<Result<IncomingInvoice, AppError>> {
    // Try to extract Factur-X XML from PDF
    const xmlResult = extractXmlFromPdf(pdfBuffer);

    if (!xmlResult.ok) {
      // No XML found — create entry requiring manual data entry
      const invoice = await repo.create({
        tenant_id: tenantId,
        status: 'received',
        invoice_number: null,
        supplier_id: null,
        supplier_name: null,
        supplier_siret: null,
        buyer_siret: null,
        issue_date: null,
        due_date: null,
        total_ht_cents: 0,
        total_tva_cents: 0,
        total_ttc_cents: 0,
        matched_purchase_id: null,
        source: 'upload',
        manual_entry_required: true,
        duplicate_warning: false,
        rejection_reason: null,
        raw_xml: null,
        parsed_data: null,
        ppf_id: null,
      });
      return ok(invoice);
    }

    // XML found — parse it
    return processXml(tenantId, xmlResult.value, 'upload');
  }

  // BUSINESS RULE [CDC-2.1]: Reception webhook PPF/PDP
  async function receiveWebhook(
    tenantId: string,
    payload: string,
    signature: string,
    webhookSecret: string,
  ): Promise<Result<IncomingInvoice, AppError>> {
    // Validate HMAC
    if (!signature || !verifyWebhookHmac(payload, signature, webhookSecret)) {
      return err(appError('UNAUTHORIZED', 'Invalid webhook signature'));
    }

    // Parse the payload — expect it to contain Factur-X XML or a reference
    let xml: string;
    try {
      const data = JSON.parse(payload);
      xml = data.xml ?? data.facturx_xml ?? payload;
    } catch {
      xml = payload;
    }

    return processXml(tenantId, xml, 'webhook');
  }

  async function processXml(
    tenantId: string,
    xml: string,
    source: 'upload' | 'webhook' | 'email',
  ): Promise<Result<IncomingInvoice, AppError>> {
    const parseResult = parseFacturXXml(xml);

    if (!parseResult.ok) {
      // XML invalid — create entry in received state
      const invoice = await repo.create({
        tenant_id: tenantId,
        status: 'received',
        invoice_number: null,
        supplier_id: null,
        supplier_name: null,
        supplier_siret: null,
        buyer_siret: null,
        issue_date: null,
        due_date: null,
        total_ht_cents: 0,
        total_tva_cents: 0,
        total_ttc_cents: 0,
        matched_purchase_id: null,
        source,
        manual_entry_required: true,
        duplicate_warning: false,
        rejection_reason: `XML parse error: ${parseResult.error.code}`,
        raw_xml: xml,
        parsed_data: null,
        ppf_id: null,
      });
      return ok(invoice);
    }

    const parsed = parseResult.value;

    // Check for duplicates
    // BUSINESS RULE [CDC-2.1]: Detection doublons — meme numero + meme SIRET
    let duplicateWarning = false;
    if (parsed.invoiceNumber && parsed.seller.siret) {
      const existing = await repo.findByInvoiceAndSiret(parsed.invoiceNumber, parsed.seller.siret, tenantId);
      if (existing) {
        duplicateWarning = true;
      }
    }

    // Lookup or create supplier
    let supplierId: string | null = null;
    if (parsed.seller.siret) {
      const existingSupplier = await supplierLookup.findBySiret(parsed.seller.siret, tenantId);
      if (existingSupplier) {
        supplierId = existingSupplier.id;
      } else {
        // BUSINESS RULE [CDC-2.1]: Fournisseur inconnu → creation automatique
        const newSupplier = await supplierLookup.createFromParsed(tenantId, parsed.seller);
        supplierId = newSupplier.id;
      }
    }

    // Create invoice entry in parsed state
    const invoice = await repo.create({
      tenant_id: tenantId,
      status: 'parsed',
      invoice_number: parsed.invoiceNumber,
      supplier_id: supplierId,
      supplier_name: parsed.seller.name,
      supplier_siret: parsed.seller.siret,
      buyer_siret: parsed.buyer.siret,
      issue_date: parsed.issueDate,
      due_date: parsed.dueDate ?? null,
      total_ht_cents: parsed.totalHtCents,
      total_tva_cents: parsed.totalTvaCents,
      total_ttc_cents: parsed.totalTtcCents,
      matched_purchase_id: null,
      source,
      manual_entry_required: false,
      duplicate_warning: duplicateWarning,
      rejection_reason: null,
      raw_xml: parsed.rawXml,
      parsed_data: parsed,
      ppf_id: null,
    });

    return ok(invoice);
  }

  // BUSINESS RULE [CDC-2.1]: Validation automatique (parsed → validated)
  async function validate(
    id: string,
    tenantId: string,
  ): Promise<Result<IncomingInvoice, AppError>> {
    const invoice = await repo.findById(id, tenantId);
    if (!invoice) return err(notFound('IncomingInvoice', id));

    if (!canTransition(invoice.status as IncomingInvoiceStatus, 'validated')) {
      return err(validationError(`Cannot validate invoice in status '${invoice.status}'`));
    }

    const updated = await repo.updateStatus(id, tenantId, 'validated');
    if (!updated) return err(notFound('IncomingInvoice', id));
    return ok(updated);
  }

  // BUSINESS RULE [CDC-2.1]: Rapprochement automatique (validated → matched)
  async function autoMatch(
    id: string,
    tenantId: string,
  ): Promise<Result<{ invoice: IncomingInvoice; candidates: Purchase[] }, AppError>> {
    const invoice = await repo.findById(id, tenantId);
    if (!invoice) return err(notFound('IncomingInvoice', id));

    if (invoice.status !== 'validated' && invoice.status !== 'parsed') {
      return err(validationError('Invoice must be validated before matching'));
    }

    if (!invoice.supplier_siret || !invoice.issue_date) {
      return ok({ invoice, candidates: [] });
    }

    const candidates = await purchaseMatcher.findCandidates(
      tenantId,
      invoice.supplier_siret,
      invoice.total_ttc_cents,
      invoice.issue_date,
    );

    if (candidates.length === 1) {
      // Auto-match: single candidate
      const updated = await repo.updateStatus(id, tenantId, 'matched', {
        matched_purchase_id: candidates[0]!.id,
      });
      if (!updated) return err(notFound('IncomingInvoice', id));
      return ok({ invoice: updated, candidates });
    }

    // Multiple or zero candidates — return for manual matching
    return ok({ invoice, candidates });
  }

  // Manual matching
  async function manualMatch(
    id: string,
    tenantId: string,
    purchaseId: string,
  ): Promise<Result<IncomingInvoice, AppError>> {
    const invoice = await repo.findById(id, tenantId);
    if (!invoice) return err(notFound('IncomingInvoice', id));

    if (invoice.status !== 'validated' && invoice.status !== 'parsed') {
      return err(validationError('Invoice must be validated or parsed before matching'));
    }

    const updated = await repo.updateStatus(id, tenantId, 'matched', {
      matched_purchase_id: purchaseId,
    });
    if (!updated) return err(notFound('IncomingInvoice', id));
    return ok(updated);
  }

  // Approve
  async function approve(
    id: string,
    tenantId: string,
  ): Promise<Result<IncomingInvoice, AppError>> {
    const invoice = await repo.findById(id, tenantId);
    if (!invoice) return err(notFound('IncomingInvoice', id));

    if (!canTransition(invoice.status as IncomingInvoiceStatus, 'approved')) {
      return err(validationError(`Cannot approve invoice in status '${invoice.status}'`));
    }

    const updated = await repo.updateStatus(id, tenantId, 'approved');
    if (!updated) return err(notFound('IncomingInvoice', id));
    return ok(updated);
  }

  // Reject
  async function reject(
    id: string,
    tenantId: string,
    reason: string,
  ): Promise<Result<IncomingInvoice, AppError>> {
    const invoice = await repo.findById(id, tenantId);
    if (!invoice) return err(notFound('IncomingInvoice', id));

    // Can reject from any non-terminal status
    if (invoice.status === 'rejected' || invoice.status === 'paid' || invoice.status === 'accounted') {
      return err(validationError(`Cannot reject invoice in status '${invoice.status}'`));
    }

    const updated = await repo.updateStatus(id, tenantId, 'rejected', {
      rejection_reason: reason,
    });
    if (!updated) return err(notFound('IncomingInvoice', id));
    return ok(updated);
  }

  // Get suggestions for matching
  async function getSuggestions(
    id: string,
    tenantId: string,
  ): Promise<Result<Purchase[], AppError>> {
    const invoice = await repo.findById(id, tenantId);
    if (!invoice) return err(notFound('IncomingInvoice', id));

    if (!invoice.supplier_siret || !invoice.issue_date) {
      return ok([]);
    }

    const candidates = await purchaseMatcher.findCandidates(
      tenantId,
      invoice.supplier_siret,
      invoice.total_ttc_cents,
      invoice.issue_date,
    );

    return ok(candidates);
  }

  // List
  async function list(
    tenantId: string,
    query: IncomingInvoiceListQuery,
  ): Promise<Result<PaginatedResult<IncomingInvoice>, AppError>> {
    const result = await repo.list(tenantId, {
      ...query,
      limit: query.limit ?? 20,
    });
    return ok({
      items: result.items,
      next_cursor: result.next_cursor,
      has_more: result.has_more,
    });
  }

  // Get by ID
  async function getById(
    id: string,
    tenantId: string,
  ): Promise<Result<IncomingInvoice, AppError>> {
    const invoice = await repo.findById(id, tenantId);
    if (!invoice) return err(notFound('IncomingInvoice', id));
    return ok(invoice);
  }

  // Soft delete (only received/parsed)
  async function deleteInvoice(
    id: string,
    tenantId: string,
  ): Promise<Result<void, AppError>> {
    const invoice = await repo.findById(id, tenantId);
    if (!invoice) return err(notFound('IncomingInvoice', id));

    if (invoice.status !== 'received' && invoice.status !== 'parsed') {
      return err(appError('FORBIDDEN', 'Can only delete received or parsed invoices'));
    }

    await repo.softDelete(id, tenantId);
    return ok(undefined);
  }

  return {
    uploadPdf,
    receiveWebhook,
    validate,
    autoMatch,
    manualMatch,
    approve,
    reject,
    getSuggestions,
    list,
    getById,
    delete: deleteInvoice,
  };
}
