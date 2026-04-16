import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createIncomingInvoiceService,
  verifyWebhookHmac,
  type IncomingInvoice,
  type IncomingInvoiceRepository,
  type SupplierLookup,
  type PurchaseMatcher,
  type IncomingInvoiceStatus,
} from '../incoming-invoice.service.js';
import type { Supplier } from '../../supplier/supplier.service.js';
import type { Purchase } from '../../purchase/purchase.service.js';
import crypto from 'node:crypto';

// --- Test helpers ---

const TENANT_ID = 'tenant-001';

function buildMinimumXml(overrides: Record<string, string> = {}): string {
  const number = overrides.number ?? 'FAC-2026-001';
  const sellerSiret = overrides.sellerSiret ?? '12345678901234';
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${number}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">20260115</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>Fournisseur SAS</ram:Name>
        <ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${sellerSiret}</ram:ID></ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress><ram:LineOne>10 rue</ram:LineOne><ram:PostcodeCode>75001</ram:PostcodeCode><ram:CityName>Paris</ram:CityName><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>Ma Societe</ram:Name>
        <ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">98765432109876</ram:ID></ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress><ram:LineOne>5 ave</ram:LineOne><ram:PostcodeCode>69001</ram:PostcodeCode><ram:CityName>Lyon</ram:CityName><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>200.00</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>1000.00</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime><udt:DateTimeString format="102">20260215</udt:DateTimeString></ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>1000.00</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>1000.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">200.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>1200.00</ram:GrandTotalAmount>
        <ram:DuePayableAmount>1200.00</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

function buildPdfWithXml(xml: string): Buffer {
  return Buffer.from(`%PDF-1.7\nstream\n${xml}\nendstream`, 'latin1');
}

function makeFakeInvoice(overrides: Partial<IncomingInvoice> = {}): IncomingInvoice {
  return {
    id: 'inv-001',
    tenant_id: TENANT_ID,
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
    manual_entry_required: false,
    duplicate_warning: false,
    rejection_reason: null,
    raw_xml: null,
    parsed_data: null,
    ppf_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: 'sup-001',
    tenant_id: TENANT_ID,
    name: 'Fournisseur SAS',
    siret: '12345678901234',
    email: null,
    phone: null,
    address: null,
    iban: null,
    bic: null,
    payment_terms: 30,
    category: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 'pur-001',
    tenant_id: TENANT_ID,
    supplier_id: 'sup-001',
    number: 'ACH-001',
    status: 'pending',
    source: 'manual',
    issue_date: new Date('2026-01-10'),
    due_date: new Date('2026-02-10'),
    total_ht_cents: 100000,
    total_tva_cents: 20000,
    total_ttc_cents: 120000,
    paid_cents: 0,
    category: null,
    notes: null,
    document_url: null,
    ocr_data: null,
    ocr_confidence: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    lines: [],
    ...overrides,
  };
}

// --- Mocks ---

function createMockRepo(): IncomingInvoiceRepository {
  let autoId = 0;
  return {
    create: vi.fn(async (data) => ({
      ...data,
      id: `inv-${++autoId}`,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    })) as unknown as IncomingInvoiceRepository['create'],
    findById: vi.fn(async () => null),
    findByInvoiceAndSiret: vi.fn(async () => null),
    updateStatus: vi.fn(async (id, _tenantId, status, extra) => makeFakeInvoice({ id, status, ...extra })),
    softDelete: vi.fn(async () => true),
    list: vi.fn(async () => ({ items: [], next_cursor: null, has_more: false })),
  };
}

function createMockSupplierLookup(): SupplierLookup {
  return {
    findBySiret: vi.fn(async () => null),
    createFromParsed: vi.fn(async (_tenantId, seller) => makeSupplier({ name: seller.name, siret: seller.siret })),
  };
}

function createMockPurchaseMatcher(): PurchaseMatcher {
  return {
    findCandidates: vi.fn(async () => []),
  };
}

// --- Tests ---

describe('Incoming Invoice Service', () => {
  let repo: IncomingInvoiceRepository;
  let supplierLookup: SupplierLookup;
  let purchaseMatcher: PurchaseMatcher;
  let service: ReturnType<typeof createIncomingInvoiceService>;

  beforeEach(() => {
    repo = createMockRepo();
    supplierLookup = createMockSupplierLookup();
    purchaseMatcher = createMockPurchaseMatcher();
    service = createIncomingInvoiceService(repo, supplierLookup, purchaseMatcher);
  });

  describe('uploadPdf', () => {
    it('parses PDF with Factur-X XML and transitions to parsed status', async () => {
      const xml = buildMinimumXml();
      const pdf = buildPdfWithXml(xml);

      const result = await service.uploadPdf(TENANT_ID, pdf);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.status).toBe('parsed');
      expect(result.value.invoice_number).toBe('FAC-2026-001');
      expect(result.value.supplier_siret).toBe('12345678901234');
      expect(result.value.total_ht_cents).toBe(100000);
      expect(result.value.total_tva_cents).toBe(20000);
      expect(result.value.total_ttc_cents).toBe(120000);
      expect(result.value.manual_entry_required).toBe(false);
    });

    it('flags manualEntryRequired when PDF has no XML', async () => {
      const pdf = Buffer.from('%PDF-1.7\nno xml here\n', 'latin1');

      const result = await service.uploadPdf(TENANT_ID, pdf);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.status).toBe('received');
      expect(result.value.manual_entry_required).toBe(true);
      expect(result.value.invoice_number).toBeNull();
    });
  });

  describe('receiveWebhook', () => {
    it('accepts valid HMAC and parses XML', async () => {
      const xml = buildMinimumXml();
      const payload = JSON.stringify({ xml });
      const secret = 'webhook-secret-key';
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const result = await service.receiveWebhook(TENANT_ID, payload, signature, secret);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe('parsed');
      expect(result.value.source).toBe('webhook');
    });

    it('rejects invalid HMAC signature', async () => {
      const payload = JSON.stringify({ xml: buildMinimumXml() });

      const result = await service.receiveWebhook(TENANT_ID, payload, 'invalid-sig', 'secret');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Supplier lookup', () => {
    it('identifies known supplier by SIRET', async () => {
      const knownSupplier = makeSupplier({ id: 'sup-known', siret: '12345678901234' });
      vi.mocked(supplierLookup.findBySiret).mockResolvedValue(knownSupplier);

      const xml = buildMinimumXml();
      const pdf = buildPdfWithXml(xml);
      const result = await service.uploadPdf(TENANT_ID, pdf);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.supplier_id).toBe('sup-known');
      expect(supplierLookup.findBySiret).toHaveBeenCalledWith('12345678901234', TENANT_ID);
    });

    it('creates new supplier when unknown SIRET', async () => {
      vi.mocked(supplierLookup.findBySiret).mockResolvedValue(null);
      const newSupplier = makeSupplier({ id: 'sup-new' });
      vi.mocked(supplierLookup.createFromParsed).mockResolvedValue(newSupplier);

      const xml = buildMinimumXml();
      const pdf = buildPdfWithXml(xml);
      const result = await service.uploadPdf(TENANT_ID, pdf);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.supplier_id).toBe('sup-new');
      expect(supplierLookup.createFromParsed).toHaveBeenCalled();
    });
  });

  describe('Duplicate detection', () => {
    it('flags duplicate when same invoice number + same SIRET exists', async () => {
      const existingInvoice = makeFakeInvoice({ id: 'existing-001' });
      vi.mocked(repo.findByInvoiceAndSiret).mockResolvedValue(existingInvoice);

      const xml = buildMinimumXml();
      const pdf = buildPdfWithXml(xml);
      const result = await service.uploadPdf(TENANT_ID, pdf);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.duplicate_warning).toBe(true);
    });
  });

  describe('Auto-matching', () => {
    it('auto-matches when single purchase candidate found', async () => {
      const purchase = makePurchase({ id: 'pur-match' });
      vi.mocked(purchaseMatcher.findCandidates).mockResolvedValue([purchase]);

      const invoice = makeFakeInvoice({
        id: 'inv-to-match',
        status: 'validated',
        supplier_siret: '12345678901234',
        issue_date: new Date('2026-01-15'),
        total_ttc_cents: 120000,
      });
      vi.mocked(repo.findById).mockResolvedValue(invoice);

      const result = await service.autoMatch('inv-to-match', TENANT_ID);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.invoice.status).toBe('matched');
      expect(result.value.invoice.matched_purchase_id).toBe('pur-match');
    });

    it('returns candidates without auto-matching when multiple found', async () => {
      const purchases = [
        makePurchase({ id: 'pur-1' }),
        makePurchase({ id: 'pur-2' }),
      ];
      vi.mocked(purchaseMatcher.findCandidates).mockResolvedValue(purchases);

      const invoice = makeFakeInvoice({
        id: 'inv-multi',
        status: 'validated',
        supplier_siret: '12345678901234',
        issue_date: new Date('2026-01-15'),
        total_ttc_cents: 120000,
      });
      vi.mocked(repo.findById).mockResolvedValue(invoice);

      const result = await service.autoMatch('inv-multi', TENANT_ID);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.candidates).toHaveLength(2);
      // Not auto-matched
      expect(result.value.invoice.status).toBe('validated');
    });

    it('returns empty candidates when no match found', async () => {
      vi.mocked(purchaseMatcher.findCandidates).mockResolvedValue([]);

      const invoice = makeFakeInvoice({
        id: 'inv-no-match',
        status: 'validated',
        supplier_siret: '12345678901234',
        issue_date: new Date('2026-01-15'),
        total_ttc_cents: 120000,
      });
      vi.mocked(repo.findById).mockResolvedValue(invoice);

      const result = await service.autoMatch('inv-no-match', TENANT_ID);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.candidates).toHaveLength(0);
    });
  });

  describe('Workflow transitions', () => {
    it('validates a parsed invoice (parsed → validated)', async () => {
      const invoice = makeFakeInvoice({ id: 'inv-parsed', status: 'parsed' });
      vi.mocked(repo.findById).mockResolvedValue(invoice);

      const result = await service.validate('inv-parsed', TENANT_ID);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe('validated');
    });

    it('completes full workflow: received → parsed → validated → approved', async () => {
      // Upload gets parsed
      const xml = buildMinimumXml();
      const pdf = buildPdfWithXml(xml);
      const uploadResult = await service.uploadPdf(TENANT_ID, pdf);
      expect(uploadResult.ok).toBe(true);
      if (!uploadResult.ok) return;
      expect(uploadResult.value.status).toBe('parsed');

      // Validate
      const parsedInvoice = makeFakeInvoice({ id: uploadResult.value.id, status: 'parsed' });
      vi.mocked(repo.findById).mockResolvedValue(parsedInvoice);
      const validateResult = await service.validate(uploadResult.value.id, TENANT_ID);
      expect(validateResult.ok).toBe(true);

      // Approve
      const validatedInvoice = makeFakeInvoice({ id: uploadResult.value.id, status: 'validated' });
      vi.mocked(repo.findById).mockResolvedValue(validatedInvoice);
      const approveResult = await service.approve(uploadResult.value.id, TENANT_ID);
      expect(approveResult.ok).toBe(true);
      if (!approveResult.ok) return;
      expect(approveResult.value.status).toBe('approved');
    });
  });

  describe('Rejection', () => {
    it('rejects with reason', async () => {
      const invoice = makeFakeInvoice({ id: 'inv-rej', status: 'validated' });
      vi.mocked(repo.findById).mockResolvedValue(invoice);

      const result = await service.reject('inv-rej', TENANT_ID, 'Montant incorrect');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe('rejected');
      expect(result.value.rejection_reason).toBe('Montant incorrect');
    });

    it('cannot reject an already rejected invoice', async () => {
      const invoice = makeFakeInvoice({ id: 'inv-rej2', status: 'rejected' });
      vi.mocked(repo.findById).mockResolvedValue(invoice);

      const result = await service.reject('inv-rej2', TENANT_ID, 'another reason');
      expect(result.ok).toBe(false);
    });
  });

  describe('Treasury update', () => {
    it('due date is preserved from parsed data for treasury forecasting', async () => {
      const xml = buildMinimumXml();
      const pdf = buildPdfWithXml(xml);

      const result = await service.uploadPdf(TENANT_ID, pdf);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.due_date).toBeDefined();
      expect(result.value.total_ttc_cents).toBe(120000);
    });
  });

  describe('verifyWebhookHmac', () => {
    it('returns true for valid HMAC', () => {
      const payload = '{"test": true}';
      const secret = 'my-secret';
      const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      expect(verifyWebhookHmac(payload, sig, secret)).toBe(true);
    });

    it('returns false for invalid HMAC', () => {
      expect(verifyWebhookHmac('payload', 'a'.repeat(64), 'secret')).toBe(false);
    });
  });

  describe('Delete', () => {
    it('allows deleting received invoices', async () => {
      const invoice = makeFakeInvoice({ id: 'inv-del', status: 'received' });
      vi.mocked(repo.findById).mockResolvedValue(invoice);

      const result = await service.delete('inv-del', TENANT_ID);
      expect(result.ok).toBe(true);
    });

    it('prevents deleting approved invoices', async () => {
      const invoice = makeFakeInvoice({ id: 'inv-del2', status: 'approved' });
      vi.mocked(repo.findById).mockResolvedValue(invoice);

      const result = await service.delete('inv-del2', TENANT_ID);
      expect(result.ok).toBe(false);
    });
  });
});
