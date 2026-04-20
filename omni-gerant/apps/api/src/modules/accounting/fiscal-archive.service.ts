// Vague K2 : Archivage fiscal 10 ans avec chaine de hash (inalterabilite).
// Conservation : 10 ans (L123-22 Code de commerce), 6 ans (L102-B LPF),
// 40 ans (DUERP loi 2021-1018). On se met au plus strict : 10 ans.

import { createHash } from 'node:crypto';

export interface ArchiveInput {
  tenant_id: string;
  year: number;
  document_type: 'invoice' | 'purchase' | 'payslip' | 'fec' | 'duerp' | 'quote';
  document_id: string;
  content: string;           // JSON ou texte integral a archiver
  pdf_url?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Archive un document. Idempotent via @@unique(tenant, doc_type, doc_id) :
 * les archivages dupliques sont no-op.
 * Chaine : chain_hash(n) = SHA256(chain_hash(n-1) || document_hash).
 */
export async function archiveDocument(input: ArchiveInput): Promise<{ archived: boolean; chain_hash: string; document_hash: string } | null> {
  if (!process.env['DATABASE_URL']) return null;
  const { prisma } = await import('@zenadmin/db');
  const p = prisma as unknown as {
    fiscalArchive?: { findFirst?: Function; findUnique?: Function; create?: Function };
  };

  // Si deja archive -> retourner l'existant
  const existing = await p.fiscalArchive?.findUnique?.({
    where: {
      tenant_id_document_type_document_id: {
        tenant_id: input.tenant_id,
        document_type: input.document_type,
        document_id: input.document_id,
      },
    },
  }) as { chain_hash: string; document_hash: string } | null;
  if (existing) {
    return { archived: false, chain_hash: existing.chain_hash, document_hash: existing.document_hash };
  }

  // Dernier hash de la chaine pour ce tenant
  const last = await p.fiscalArchive?.findFirst?.({
    where: { tenant_id: input.tenant_id },
    orderBy: { created_at: 'desc' },
  }) as { chain_hash: string } | null;

  const documentHash = createHash('sha256').update(input.content).digest('hex');
  const chainInput = (last?.chain_hash ?? '') + documentHash;
  const chainHash = createHash('sha256').update(chainInput).digest('hex');

  await p.fiscalArchive?.create?.({
    data: {
      tenant_id: input.tenant_id,
      year: input.year,
      document_type: input.document_type,
      document_id: input.document_id,
      document_hash: documentHash,
      previous_hash: last?.chain_hash ?? null,
      chain_hash: chainHash,
      pdf_url: input.pdf_url ?? null,
      metadata: (input.metadata ?? {}) as Record<string, unknown>,
    },
  });

  return { archived: true, chain_hash: chainHash, document_hash: documentHash };
}

/**
 * Verifie l'integrite de la chaine d'un tenant (pour audit).
 */
export async function verifyArchiveChain(tenantId: string): Promise<{
  valid: boolean;
  broken_at: string | null;
  total: number;
}> {
  if (!process.env['DATABASE_URL']) return { valid: false, broken_at: null, total: 0 };
  const { prisma } = await import('@zenadmin/db');
  const entries = await (prisma as unknown as { fiscalArchive?: { findMany?: Function } })
    .fiscalArchive?.findMany?.({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'asc' },
      select: { id: true, document_hash: true, previous_hash: true, chain_hash: true },
    }) ?? [];

  let prev = '';
  for (const e of entries as Array<{ id: string; document_hash: string; previous_hash: string | null; chain_hash: string }>) {
    const expected = createHash('sha256').update(prev + e.document_hash).digest('hex');
    if (expected !== e.chain_hash) {
      return { valid: false, broken_at: e.id, total: entries.length };
    }
    prev = e.chain_hash;
  }

  return { valid: true, broken_at: null, total: entries.length };
}
