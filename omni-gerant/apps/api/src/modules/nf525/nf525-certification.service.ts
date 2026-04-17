// BUSINESS RULE [NF525-K1]: Service de certification NF525 via Kiwiz
// BUSINESS RULE [NF525-K2]: Certification des avoirs (credit memos)
// Les certifications sont non-bloquantes : si Kiwiz echoue, la facture reste valide.

import { ok, err, notFound, appError, conflict } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';
import type { KiwizClient, KiwizInvoiceSaveResponse } from './kiwiz-client.js';
import { mapInvoiceToKiwiz, mapCreditMemoToKiwiz } from './kiwiz-mapper.js';
import type { InvoiceForKiwiz, ClientForKiwiz, CompanyForKiwiz } from './kiwiz-mapper.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Nf525CertificationResult {
  file_hash: string;
  block_hash: string;
  certified_at: Date;
  test_mode: boolean;
}

export interface Nf525Status {
  certified: boolean;
  file_hash: string | null;
  block_hash: string | null;
  certified_at: Date | null;
  test_mode: boolean;
  invoice_number: string;
}

// BUSINESS RULE [NF525-K1]: Stockage minimal des donnees de certification
export interface CertificationRecord {
  invoice_id: string;
  tenant_id: string;
  file_hash: string;
  block_hash: string;
  certified_at: Date;
  test_mode: boolean;
  type: 'invoice' | 'credit_memo';
}

// ---------------------------------------------------------------------------
// Repository interface (for storing certification records)
// ---------------------------------------------------------------------------

export interface CertificationRepository {
  findByInvoiceId(invoiceId: string, tenantId: string): Promise<CertificationRecord | null>;
  save(record: CertificationRecord): Promise<void>;
}

// ---------------------------------------------------------------------------
// Invoice lookup interface (minimal — just what we need)
// ---------------------------------------------------------------------------

export interface InvoiceLookup {
  findById(id: string, tenantId: string): Promise<InvoiceForKiwiz | null>;
  findClientForInvoice(id: string, tenantId: string): Promise<ClientForKiwiz | null>;
  findCompanyForTenant(tenantId: string): Promise<CompanyForKiwiz | null>;
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export interface Nf525CertificationService {
  certifyInvoice(invoiceId: string, tenantId: string): Promise<Result<Nf525CertificationResult, AppError>>;
  certifyCreditMemo(creditMemoId: string, tenantId: string): Promise<Result<Nf525CertificationResult, AppError>>;
  getStatus(invoiceId: string, tenantId: string): Promise<Result<Nf525Status, AppError>>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface Nf525CertificationDeps {
  kiwizClient: KiwizClient;
  certificationRepo: CertificationRepository;
  invoiceLookup: InvoiceLookup;
  testMode: boolean;
}

export function createNf525CertificationService(deps: Nf525CertificationDeps): Nf525CertificationService {
  const { kiwizClient, certificationRepo, invoiceLookup, testMode } = deps;

  // BUSINESS RULE [NF525-K1]: Certification d'une facture via Kiwiz blockchain
  async function certifyInvoice(
    invoiceId: string,
    tenantId: string,
  ): Promise<Result<Nf525CertificationResult, AppError>> {
    return certifyDocument(invoiceId, tenantId, 'invoice');
  }

  // BUSINESS RULE [NF525-K2]: Certification d'un avoir via Kiwiz blockchain
  async function certifyCreditMemo(
    creditMemoId: string,
    tenantId: string,
  ): Promise<Result<Nf525CertificationResult, AppError>> {
    return certifyDocument(creditMemoId, tenantId, 'credit_memo');
  }

  async function certifyDocument(
    documentId: string,
    tenantId: string,
    type: 'invoice' | 'credit_memo',
  ): Promise<Result<Nf525CertificationResult, AppError>> {
    // 1. Check if already certified
    const existing = await certificationRepo.findByInvoiceId(documentId, tenantId);
    if (existing) {
      return err(conflict(`Document ${documentId} is already certified`));
    }

    // 2. Look up the invoice/credit memo
    const invoice = await invoiceLookup.findById(documentId, tenantId);
    if (!invoice) {
      return err(notFound(type === 'invoice' ? 'Invoice' : 'CreditMemo', documentId));
    }

    // 3. Look up client and company
    const client = await invoiceLookup.findClientForInvoice(documentId, tenantId);
    if (!client) {
      return err(notFound('Client', documentId));
    }

    const company = await invoiceLookup.findCompanyForTenant(tenantId);
    if (!company) {
      return err(notFound('Company', tenantId));
    }

    // 4. Map to Kiwiz format
    const kiwizData = type === 'invoice'
      ? mapInvoiceToKiwiz(invoice, client, company)
      : mapCreditMemoToKiwiz(invoice, client, company);

    // 5. Generate mock PDF buffer (real PDF generator not wired here)
    const pdfBuffer = Buffer.from('mock-pdf');

    // 6. Call Kiwiz API
    const kiwizResult: Result<KiwizInvoiceSaveResponse, AppError> = type === 'invoice'
      ? await kiwizClient.saveInvoice(pdfBuffer, kiwizData)
      : await kiwizClient.saveCreditMemo(pdfBuffer, kiwizData);

    if (!kiwizResult.ok) {
      return kiwizResult as Result<never, AppError>;
    }

    // 7. Store certification record
    const certifiedAt = new Date();
    const record: CertificationRecord = {
      invoice_id: documentId,
      tenant_id: tenantId,
      file_hash: kiwizResult.value.document_hash,
      block_hash: kiwizResult.value.block_hash,
      certified_at: certifiedAt,
      test_mode: testMode,
      type,
    };
    await certificationRepo.save(record);

    // 8. Return result
    return ok({
      file_hash: kiwizResult.value.document_hash,
      block_hash: kiwizResult.value.block_hash,
      certified_at: certifiedAt,
      test_mode: testMode,
    });
  }

  // BUSINESS RULE [NF525-K1]: Consultation du statut de certification
  async function getStatus(
    invoiceId: string,
    tenantId: string,
  ): Promise<Result<Nf525Status, AppError>> {
    const invoice = await invoiceLookup.findById(invoiceId, tenantId);
    if (!invoice) {
      return err(notFound('Invoice', invoiceId));
    }

    const record = await certificationRepo.findByInvoiceId(invoiceId, tenantId);

    return ok({
      certified: record !== null,
      file_hash: record?.file_hash ?? null,
      block_hash: record?.block_hash ?? null,
      certified_at: record?.certified_at ?? null,
      test_mode: record?.test_mode ?? testMode,
      invoice_number: invoice.number,
    });
  }

  return {
    certifyInvoice,
    certifyCreditMemo,
    getStatus,
  };
}
