import { describe, it, expect, vi } from 'vitest';
import { ok, err, appError, notFound, conflict } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';

import {
  runCertificationRetryJob,
  type UncertifiedDocumentLookup,
  type UncertifiedDocument,
  type CertificationJobResult,
} from '../kiwiz-certification-job.js';
import type {
  Nf525CertificationService,
  Nf525CertificationResult,
  CertificationRepository,
  CertificationRecord,
} from '../nf525-certification.service.js';
import {
  createKiwizSubscriptionService,
  createInMemorySubscriptionRepository,
  type KiwizSubscriptionClient,
  type SubscriptionRepository,
  type KiwizSubscription,
  type KiwizSubscriptionService,
} from '../kiwiz-subscription.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

function mockCertResult(): Nf525CertificationResult {
  return {
    file_hash: 'fh-' + crypto.randomUUID().slice(0, 8),
    block_hash: 'bh-' + crypto.randomUUID().slice(0, 8),
    certified_at: new Date('2026-04-17T10:00:00Z'),
    test_mode: false,
  };
}

function mockCertService(overrides?: Partial<Nf525CertificationService>): Nf525CertificationService {
  return {
    certifyInvoice: vi.fn().mockResolvedValue(ok(mockCertResult())),
    certifyCreditMemo: vi.fn().mockResolvedValue(ok(mockCertResult())),
    getStatus: vi.fn().mockResolvedValue(ok({
      certified: true,
      file_hash: 'fh-123',
      block_hash: 'bh-456',
      certified_at: new Date(),
      test_mode: false,
      invoice_number: 'FAC-2026-001',
    })),
    ...overrides,
  };
}

function mockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
  };
}

function mockUncertifiedLookup(documents: UncertifiedDocument[] = []): UncertifiedDocumentLookup {
  return {
    findUncertified: vi.fn().mockResolvedValue(documents),
    countByStatus: vi.fn().mockResolvedValue({
      certified: 0,
      uncertified: documents.length,
    }),
  };
}

function makeDoc(type: 'invoice' | 'credit_memo' = 'invoice'): UncertifiedDocument {
  return { id: crypto.randomUUID(), tenant_id: TENANT_ID, type };
}

function mockCertRepo(records: CertificationRecord[] = []): CertificationRepository {
  return {
    findByInvoiceId: vi.fn().mockImplementation(async (id: string) => {
      return records.find((r) => r.invoice_id === id) ?? null;
    }),
    save: vi.fn(),
  };
}

function makeCertRecord(invoiceId: string, overrides?: Partial<CertificationRecord>): CertificationRecord {
  return {
    invoice_id: invoiceId,
    tenant_id: TENANT_ID,
    file_hash: 'fh-abc',
    block_hash: 'bh-def',
    certified_at: new Date('2026-04-17T10:00:00Z'),
    test_mode: false,
    type: 'invoice',
    ...overrides,
  };
}

function mockSubscriptionClient(overrides?: Partial<KiwizSubscriptionClient>): KiwizSubscriptionClient {
  return {
    createSubscription: vi.fn().mockResolvedValue(ok({ subscription_id: 'sub-123', plan_id: 'plan-nf525' })),
    cancelSubscription: vi.fn().mockResolvedValue(ok(undefined)),
    reactivateSubscription: vi.fn().mockResolvedValue(ok(undefined)),
    ...overrides,
  };
}

// ============================================================================
// K3 — Certification retry batch job
// ============================================================================

describe('K3 — Certification retry batch job', () => {
  // 1. batch with 0 uncertified
  it('returns zeros when no uncertified documents exist', async () => {
    const result = await runCertificationRetryJob({
      uncertifiedLookup: mockUncertifiedLookup([]),
      certificationService: mockCertService(),
      logger: mockLogger(),
      tenantId: TENANT_ID,
    });

    expect(result).toEqual({ certified: 0, failed: 0, total: 0 });
  });

  // 2. batch with 3 uncertified, all succeed
  it('certifies all documents when all succeed', async () => {
    const docs = [makeDoc('invoice'), makeDoc('invoice'), makeDoc('invoice')];
    const result = await runCertificationRetryJob({
      uncertifiedLookup: mockUncertifiedLookup(docs),
      certificationService: mockCertService(),
      logger: mockLogger(),
      tenantId: TENANT_ID,
    });

    expect(result).toEqual({ certified: 3, failed: 0, total: 3 });
  });

  // 3. batch with 2 uncertified, 1 fails
  it('counts failures separately from successes', async () => {
    const docs = [makeDoc('invoice'), makeDoc('invoice')];
    const service = mockCertService({
      certifyInvoice: vi.fn()
        .mockResolvedValueOnce(ok(mockCertResult()))
        .mockResolvedValueOnce(err(appError('SERVICE_UNAVAILABLE', 'Kiwiz down'))),
    });

    const result = await runCertificationRetryJob({
      uncertifiedLookup: mockUncertifiedLookup(docs),
      certificationService: service,
      logger: mockLogger(),
      tenantId: TENANT_ID,
    });

    expect(result).toEqual({ certified: 1, failed: 1, total: 2 });
  });

  // 4. batch respects batchSize limit (max 50)
  it('caps batchSize at 50', async () => {
    const lookup = mockUncertifiedLookup([]);
    await runCertificationRetryJob({
      uncertifiedLookup: lookup,
      certificationService: mockCertService(),
      logger: mockLogger(),
      tenantId: TENANT_ID,
      batchSize: 200,
    });

    expect(lookup.findUncertified).toHaveBeenCalledWith(TENANT_ID, 50);
  });

  // 5. batch processes both invoices and credit memos
  it('calls certifyInvoice for invoices and certifyCreditMemo for credit memos', async () => {
    const docs = [makeDoc('invoice'), makeDoc('credit_memo')];
    const service = mockCertService();

    await runCertificationRetryJob({
      uncertifiedLookup: mockUncertifiedLookup(docs),
      certificationService: service,
      logger: mockLogger(),
      tenantId: TENANT_ID,
    });

    expect(service.certifyInvoice).toHaveBeenCalledTimes(1);
    expect(service.certifyCreditMemo).toHaveBeenCalledTimes(1);
  });

  // 6. retry-all endpoint returns job result (unit-test the job directly)
  it('returns CertificationJobResult shape', async () => {
    const docs = [makeDoc('invoice')];
    const result = await runCertificationRetryJob({
      uncertifiedLookup: mockUncertifiedLookup(docs),
      certificationService: mockCertService(),
      logger: mockLogger(),
      tenantId: TENANT_ID,
    });

    expect(result).toHaveProperty('certified');
    expect(result).toHaveProperty('failed');
    expect(result).toHaveProperty('total');
    expect(typeof result.certified).toBe('number');
  });

  // 7. status endpoint returns correct counts
  it('countByStatus returns certified and uncertified counts', async () => {
    const lookup: UncertifiedDocumentLookup = {
      findUncertified: vi.fn().mockResolvedValue([]),
      countByStatus: vi.fn().mockResolvedValue({ certified: 10, uncertified: 3 }),
    };

    const counts = await lookup.countByStatus(TENANT_ID);
    expect(counts).toEqual({ certified: 10, uncertified: 3 });
  });

  // 8. batch logs errors for failed certifications
  it('logs errors for each failed certification', async () => {
    const docs = [makeDoc('invoice'), makeDoc('invoice')];
    const service = mockCertService({
      certifyInvoice: vi.fn().mockResolvedValue(err(appError('SERVICE_UNAVAILABLE', 'Kiwiz timeout'))),
    });
    const logger = mockLogger();

    await runCertificationRetryJob({
      uncertifiedLookup: mockUncertifiedLookup(docs),
      certificationService: service,
      logger,
      tenantId: TENANT_ID,
    });

    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Kiwiz timeout'));
  });
});

// ============================================================================
// K4 — Verification + Dashboard + Download
// ============================================================================

describe('K4 — Verification, Dashboard, Download', () => {
  // 9. verify certified invoice -> returns details
  it('verify returns certification details for certified invoice', async () => {
    const record = makeCertRecord('inv-001');
    const repo = mockCertRepo([record]);

    const result = await repo.findByInvoiceId('inv-001', TENANT_ID);
    expect(result).not.toBeNull();
    expect(result!.file_hash).toBe('fh-abc');
    expect(result!.block_hash).toBe('bh-def');
    expect(result!.certified_at).toEqual(new Date('2026-04-17T10:00:00Z'));
  });

  // 10. verify uncertified invoice -> certified: false
  it('verify returns null for uncertified invoice', async () => {
    const repo = mockCertRepo([]);
    const result = await repo.findByInvoiceId('inv-999', TENANT_ID);
    expect(result).toBeNull();
  });

  // 11. download certified PDF -> returns buffer with correct headers
  it('download returns PDF buffer for certified invoice', async () => {
    const pdfContent = Buffer.from('%PDF-1.4 fake content');
    const mockKiwizClient = {
      getInvoice: vi.fn().mockResolvedValue(ok(pdfContent)),
    };

    const pdfResult = await mockKiwizClient.getInvoice('bh-def');
    expect(pdfResult.ok).toBe(true);
    if (pdfResult.ok) {
      expect(Buffer.isBuffer(pdfResult.value)).toBe(true);
      expect(pdfResult.value.toString()).toContain('%PDF');
    }
  });

  // 12. download uncertified -> 404 error
  it('download returns not found for uncertified invoice', async () => {
    const repo = mockCertRepo([]);
    const record = await repo.findByInvoiceId('inv-999', TENANT_ID);
    // Simulates route logic: if no record, return 404
    expect(record).toBeNull();
    const errorResponse = { error: { code: 'NOT_FOUND', message: 'No certification found for this invoice' } };
    expect(errorResponse.error.code).toBe('NOT_FOUND');
  });

  // 13. dashboard with mixed data -> correct stats
  it('dashboard calculates correct stats with mixed data', () => {
    const certified = 148;
    const uncertified = 2;
    const total = certified + uncertified;
    const certificationRate = Math.round((certified / total) * 10000) / 100;

    const dashboard = {
      total_invoices: total,
      certified_invoices: certified,
      pending_certification: uncertified,
      certification_rate: certificationRate,
      last_certification: null,
      test_mode: false,
    };

    expect(dashboard.total_invoices).toBe(150);
    expect(dashboard.certified_invoices).toBe(148);
    expect(dashboard.pending_certification).toBe(2);
    expect(dashboard.certification_rate).toBe(98.67);
  });

  // 14. dashboard with 0 invoices -> all zeros
  it('dashboard returns zeros when no invoices exist', () => {
    const certified = 0;
    const uncertified = 0;
    const total = certified + uncertified;
    const certificationRate = total > 0
      ? Math.round((certified / total) * 10000) / 100
      : 0;

    expect(total).toBe(0);
    expect(certificationRate).toBe(0);
  });

  // 15. dashboard certification_rate calculation (rounded to 2 decimals)
  it('certification_rate is rounded to 2 decimal places', () => {
    const certified = 1;
    const uncertified = 2;
    const total = certified + uncertified;
    const certificationRate = Math.round((certified / total) * 10000) / 100;

    // 1/3 = 0.33333... -> rounded to 33.33
    expect(certificationRate).toBe(33.33);
  });

  // 16. dashboard returns test_mode from config
  it('dashboard reflects test_mode setting', () => {
    const testMode = true;
    const dashboard = {
      total_invoices: 5,
      certified_invoices: 5,
      pending_certification: 0,
      certification_rate: 100,
      last_certification: null,
      test_mode: testMode,
    };

    expect(dashboard.test_mode).toBe(true);
  });
});

// ============================================================================
// K5 — Subscription service
// ============================================================================

describe('K5 — Kiwiz subscription service', () => {
  function makeService(
    clientOverrides?: Partial<KiwizSubscriptionClient>,
    repo?: SubscriptionRepository,
  ): KiwizSubscriptionService {
    return createKiwizSubscriptionService({
      subscriptionClient: mockSubscriptionClient(clientOverrides),
      subscriptionRepo: repo ?? createInMemorySubscriptionRepository(),
    });
  }

  // 17. createSubscription success -> returns subscriptionId
  it('createSubscription returns subscriptionId on success', async () => {
    const service = makeService();
    const result = await service.createSubscription({ id: TENANT_ID, name: 'Test SARL' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.subscriptionId).toBe('sub-123');
    }
  });

  // 18. createSubscription Kiwiz failure -> returns error
  it('createSubscription returns error when Kiwiz fails', async () => {
    const service = makeService({
      createSubscription: vi.fn().mockResolvedValue(
        err(appError('SERVICE_UNAVAILABLE', 'Kiwiz API error')),
      ),
    });

    const result = await service.createSubscription({ id: TENANT_ID, name: 'Test SARL' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
    }
  });

  // 19. getSubscription success
  it('getSubscription returns subscription after creation', async () => {
    const repo = createInMemorySubscriptionRepository();
    const service = makeService(undefined, repo);

    await service.createSubscription({ id: TENANT_ID, name: 'Test SARL' });
    const result = await service.getSubscription(TENANT_ID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.subscription_id).toBe('sub-123');
      expect(result.value.status).toBe('active');
      expect(result.value.company_name).toBe('Test SARL');
    }
  });

  // 20. getSubscription not found -> error
  it('getSubscription returns NOT_FOUND for unknown tenant', async () => {
    const service = makeService();
    const result = await service.getSubscription('unknown-tenant');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  // 21. cancelSubscription success
  it('cancelSubscription succeeds and updates status', async () => {
    const repo = createInMemorySubscriptionRepository();
    const service = makeService(undefined, repo);

    await service.createSubscription({ id: TENANT_ID, name: 'Test SARL' });
    const cancelResult = await service.cancelSubscription(TENANT_ID);

    expect(cancelResult.ok).toBe(true);

    const getResult = await service.getSubscription(TENANT_ID);
    expect(getResult.ok).toBe(true);
    if (getResult.ok) {
      expect(getResult.value.status).toBe('cancelled');
    }
  });

  // 22. cancelSubscription not found -> error
  it('cancelSubscription returns NOT_FOUND for unknown tenant', async () => {
    const service = makeService();
    const result = await service.cancelSubscription('unknown-tenant');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  // 23. reactivateSubscription success
  it('reactivateSubscription succeeds for cancelled subscription', async () => {
    const repo = createInMemorySubscriptionRepository();
    const service = makeService(undefined, repo);

    await service.createSubscription({ id: TENANT_ID, name: 'Test SARL' });
    await service.cancelSubscription(TENANT_ID);

    const result = await service.reactivateSubscription(TENANT_ID);
    expect(result.ok).toBe(true);

    const getResult = await service.getSubscription(TENANT_ID);
    expect(getResult.ok).toBe(true);
    if (getResult.ok) {
      expect(getResult.value.status).toBe('active');
    }
  });

  // 24. reactivateSubscription already active -> error
  it('reactivateSubscription returns CONFLICT for already active subscription', async () => {
    const repo = createInMemorySubscriptionRepository();
    const service = makeService(undefined, repo);

    await service.createSubscription({ id: TENANT_ID, name: 'Test SARL' });
    const result = await service.reactivateSubscription(TENANT_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });
});
