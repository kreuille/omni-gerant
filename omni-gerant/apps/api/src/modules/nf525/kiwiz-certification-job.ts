// BUSINESS RULE [CDC-6]: Job de certification NF525 automatique
// Batch retry des documents non certifies (factures + avoirs).
// Non-bloquant : les echecs sont logges mais n'arretent pas le batch.

import type { Result, AppError } from '@zenadmin/shared';
import type { CertificationRepository, CertificationRecord, Nf525CertificationService } from './nf525-certification.service.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CertificationJobResult {
  certified: number;
  failed: number;
  total: number;
}

// BUSINESS RULE [NF525-K3]: Interface pour requeter les documents non certifies
export interface UncertifiedDocumentLookup {
  findUncertified(tenantId: string, limit: number): Promise<UncertifiedDocument[]>;
  countByStatus(tenantId: string): Promise<{ certified: number; uncertified: number }>;
}

export interface UncertifiedDocument {
  id: string;
  tenant_id: string;
  type: 'invoice' | 'credit_memo';
}

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

const DEFAULT_BATCH_SIZE = 50;

// BUSINESS RULE [NF525-K3]: Batch retry automatique des certifications echouees
export async function runCertificationRetryJob(deps: {
  uncertifiedLookup: UncertifiedDocumentLookup;
  certificationService: Nf525CertificationService;
  logger: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
  tenantId: string;
  batchSize?: number;
}): Promise<CertificationJobResult> {
  const { uncertifiedLookup, certificationService, logger, tenantId } = deps;
  const batchSize = Math.min(deps.batchSize ?? DEFAULT_BATCH_SIZE, DEFAULT_BATCH_SIZE);

  const documents = await uncertifiedLookup.findUncertified(tenantId, batchSize);
  const total = documents.length;

  if (total === 0) {
    logger.info('[NF525-K3] No uncertified documents to process');
    return { certified: 0, failed: 0, total: 0 };
  }

  logger.info(`[NF525-K3] Processing ${total} uncertified documents`);

  let certified = 0;
  let failed = 0;

  for (const doc of documents) {
    const result: Result<unknown, AppError> = doc.type === 'invoice'
      ? await certificationService.certifyInvoice(doc.id, doc.tenant_id)
      : await certificationService.certifyCreditMemo(doc.id, doc.tenant_id);

    if (result.ok) {
      certified++;
    } else {
      failed++;
      logger.error(`[NF525-K3] Certification failed for ${doc.type} ${doc.id}: ${result.error.message}`);
    }
  }

  logger.info(`[NF525-K3] Batch complete: ${certified} certified, ${failed} failed out of ${total}`);

  return { certified, failed, total };
}
