import { describe, it, expect } from 'vitest';
import { createPpfSender, type PpfTransmissionRepository, type PpfTransmissionRecord, type InvoiceDataForPpf } from '../ppf-sender.js';
import { createPpfReceiver, type ReceivedInvoiceRepository, type ReceivedInvoiceRecord } from '../ppf-receiver.js';
import type { PpfStatus, PpfIncomingInvoice } from '../ppf-client.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

function createMockPpfClient() {
  let statusCalls = 0;
  return {
    statusCalls: () => statusCalls,
    async submitInvoice() {
      return { ppf_id: 'PPF-2026-001', status: 'deposee' as PpfStatus };
    },
    async getInvoiceStatus(ppfId: string) {
      statusCalls++;
      return {
        invoice_id: 'inv-001',
        ppf_id: ppfId,
        status: 'en_cours_traitement' as PpfStatus,
        status_date: '2026-04-14',
      };
    },
    async lookupDirectory(siret: string) {
      if (siret === '00000000000000') return null;
      return {
        siret,
        company_name: 'Test Corp',
        e_invoicing_address: `${siret}@ppf.gouv.fr`,
        platform: 'ppf' as const,
        active: true,
      };
    },
    async listIncomingInvoices() {
      return [
        {
          ppf_id: 'PPF-IN-001',
          sender_siret: '12345678901234',
          sender_name: 'Fournisseur Test',
          invoice_number: 'FOURNISSEUR-001',
          invoice_date: '2026-04-10',
          amount_ht_cents: 100000,
          amount_ttc_cents: 120000,
          tax_amount_cents: 20000,
          facturx_xml: '<xml>test</xml>',
          received_at: '2026-04-14T10:00:00Z',
        },
      ] as PpfIncomingInvoice[];
    },
    async downloadInvoiceXml() {
      return '<xml>facturx content</xml>';
    },
    verifyWebhookSignature() {
      return true;
    },
  };
}

function createMockTransmissionRepo(): PpfTransmissionRepository & { records: Map<string, PpfTransmissionRecord> } {
  const records = new Map<string, PpfTransmissionRecord>();
  return {
    records,
    async create(data) {
      const record: PpfTransmissionRecord = { ...data, id: crypto.randomUUID() };
      records.set(data.invoice_id, record);
      return record;
    },
    async findByInvoiceId(_tenantId, invoiceId) {
      return records.get(invoiceId) ?? null;
    },
    async findByPpfId(ppfId) {
      for (const r of records.values()) {
        if (r.ppf_id === ppfId) return r;
      }
      return null;
    },
    async updateStatus(id, status, rejectionReason) {
      for (const [key, r] of records) {
        if (r.id === id) {
          records.set(key, { ...r, status, rejection_reason: rejectionReason, last_status_check: new Date() });
          break;
        }
      }
    },
    async findPending(tenantId) {
      return Array.from(records.values()).filter(
        (r) => r.tenant_id === tenantId && (r.status === 'deposee' || r.status === 'en_cours_traitement'),
      );
    },
  };
}

function createMockReceivedRepo(): ReceivedInvoiceRepository & { records: Map<string, ReceivedInvoiceRecord> } {
  const records = new Map<string, ReceivedInvoiceRecord>();
  return {
    records,
    async create(data) {
      const record: ReceivedInvoiceRecord = { ...data, id: crypto.randomUUID() };
      records.set(data.ppf_id, record);
      return record;
    },
    async findByPpfId(ppfId) {
      return records.get(ppfId) ?? null;
    },
    async updatePurchaseId(id, purchaseId) {
      for (const [key, r] of records) {
        if (r.id === id) {
          records.set(key, { ...r, purchase_id: purchaseId });
          break;
        }
      }
    },
    async updateStatus(id, status) {
      for (const [key, r] of records) {
        if (r.id === id) {
          records.set(key, { ...r, status });
          break;
        }
      }
    },
    async findByTenant(tenantId) {
      return Array.from(records.values()).filter((r) => r.tenant_id === tenantId);
    },
  };
}

const SAMPLE_INVOICE: InvoiceDataForPpf = {
  id: 'inv-001',
  number: 'FAC-2026-001',
  date: '2026-04-14',
  sender_siret: '98765432101234',
  receiver_siret: '12345678901234',
  amount_ht_cents: 100000,
  amount_ttc_cents: 120000,
  tax_amount_cents: 20000,
  facturx_xml: '<xml>facturx</xml>',
};

describe('PpfSender', () => {
  it('submits invoice to PPF', async () => {
    const ppfClient = createMockPpfClient();
    const repo = createMockTransmissionRepo();
    const sender = createPpfSender(ppfClient, repo);

    const result = await sender.submitInvoice(TENANT_ID, SAMPLE_INVOICE);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ppf_id).toBe('PPF-2026-001');
      expect(result.value.status).toBe('deposee');
      expect(result.value.invoice_number).toBe('FAC-2026-001');
    }
  });

  it('rejects duplicate submission', async () => {
    const ppfClient = createMockPpfClient();
    const repo = createMockTransmissionRepo();
    const sender = createPpfSender(ppfClient, repo);

    await sender.submitInvoice(TENANT_ID, SAMPLE_INVOICE);
    const result = await sender.submitInvoice(TENANT_ID, SAMPLE_INVOICE);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('ALREADY_SUBMITTED');
    }
  });

  it('rejects when receiver not in directory', async () => {
    const ppfClient = createMockPpfClient();
    const repo = createMockTransmissionRepo();
    const sender = createPpfSender(ppfClient, repo);

    const invoice = { ...SAMPLE_INVOICE, id: 'inv-002', receiver_siret: '00000000000000' };
    const result = await sender.submitInvoice(TENANT_ID, invoice);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('RECEIVER_NOT_FOUND');
    }
  });

  it('refreshes status for a transmission', async () => {
    const ppfClient = createMockPpfClient();
    const repo = createMockTransmissionRepo();
    const sender = createPpfSender(ppfClient, repo);

    await sender.submitInvoice(TENANT_ID, SAMPLE_INVOICE);
    const result = await sender.refreshStatus('PPF-2026-001');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('en_cours_traitement');
    }
  });

  it('refreshes all pending transmissions', async () => {
    const ppfClient = createMockPpfClient();
    const repo = createMockTransmissionRepo();
    const sender = createPpfSender(ppfClient, repo);

    await sender.submitInvoice(TENANT_ID, SAMPLE_INVOICE);
    const result = await sender.refreshAllPending(TENANT_ID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
    }
  });

  it('returns null for unknown invoice status', async () => {
    const ppfClient = createMockPpfClient();
    const repo = createMockTransmissionRepo();
    const sender = createPpfSender(ppfClient, repo);

    const result = await sender.getTransmissionStatus(TENANT_ID, 'unknown-invoice');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });
});

describe('PpfReceiver', () => {
  it('handles incoming invoice', async () => {
    const ppfClient = createMockPpfClient();
    const repo = createMockReceivedRepo();
    const receiver = createPpfReceiver(ppfClient, repo);

    const incoming: PpfIncomingInvoice = {
      ppf_id: 'PPF-IN-001',
      sender_siret: '12345678901234',
      sender_name: 'Fournisseur Test',
      invoice_number: 'FOUR-001',
      invoice_date: '2026-04-10',
      amount_ht_cents: 100000,
      amount_ttc_cents: 120000,
      tax_amount_cents: 20000,
      facturx_xml: '<xml>test</xml>',
      received_at: '2026-04-14T10:00:00Z',
    };

    const result = await receiver.handleIncomingInvoice(TENANT_ID, incoming);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ppf_id).toBe('PPF-IN-001');
      expect(result.value.status).toBe('received');
      expect(result.value.sender_name).toBe('Fournisseur Test');
    }
  });

  it('deduplicates incoming invoices', async () => {
    const ppfClient = createMockPpfClient();
    const repo = createMockReceivedRepo();
    const receiver = createPpfReceiver(ppfClient, repo);

    const incoming: PpfIncomingInvoice = {
      ppf_id: 'PPF-IN-DUP',
      sender_siret: '12345678901234',
      sender_name: 'Test',
      invoice_number: 'FOUR-DUP',
      invoice_date: '2026-04-10',
      amount_ht_cents: 50000,
      amount_ttc_cents: 60000,
      tax_amount_cents: 10000,
      facturx_xml: '<xml/>',
      received_at: '2026-04-14T10:00:00Z',
    };

    await receiver.handleIncomingInvoice(TENANT_ID, incoming);
    await receiver.handleIncomingInvoice(TENANT_ID, incoming);

    expect(repo.records.size).toBe(1);
  });

  it('polls for incoming invoices', async () => {
    const ppfClient = createMockPpfClient();
    const repo = createMockReceivedRepo();
    const receiver = createPpfReceiver(ppfClient, repo);

    const result = await receiver.pollIncoming(TENANT_ID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!.ppf_id).toBe('PPF-IN-001');
    }
  });

  it('lists received invoices for tenant', async () => {
    const ppfClient = createMockPpfClient();
    const repo = createMockReceivedRepo();
    const receiver = createPpfReceiver(ppfClient, repo);

    await receiver.pollIncoming(TENANT_ID);
    const result = await receiver.listReceived(TENANT_ID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
    }
  });
});
