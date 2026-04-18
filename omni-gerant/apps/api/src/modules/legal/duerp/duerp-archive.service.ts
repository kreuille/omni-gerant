// BUSINESS RULE [CDC-2.4]: E10 — Conservation 40 ans et archivage immutable
// Art. R4121-4 du Code du travail : conservation 40 ans
// Chaque version est immutable avec hash SHA-256 et chaine de hash

import { createHash } from 'node:crypto';

// ── Interfaces ────────────────────────────────────────────────────

export interface DuerpArchiveEntry {
  id: string;
  duerpId: string;
  version: number;
  tenantId: string;
  frozenContent: Record<string, unknown>;
  contentHash: string;
  previousVersionHash: string | null;
  archivedAt: Date;
  retentionExpiresAt: Date;
  isImmutable: boolean;
  accessLog: DuerpAccessLog[];
}

export interface DuerpAccessLog {
  accessedAt: Date;
  accessedBy: string;
  reason: 'consultation' | 'export_pdf' | 'audit' | 'former_employee_request';
  ipAddress: string | null;
}

// ── Constants ─────────────────────────────────────────────────────

export const RETENTION_YEARS = 40;

// ── Hash computation ──────────────────────────────────────────────

export function computeContentHash(content: Record<string, unknown>): string {
  const serialized = JSON.stringify(content, null, 0);
  return createHash('sha256').update(serialized).digest('hex');
}

// ── Service ───────────────────────────────────────────────────────

export function createArchiveService() {
  const archives = new Map<string, DuerpArchiveEntry>();

  function archive(
    duerpId: string,
    tenantId: string,
    version: number,
    content: Record<string, unknown>,
  ): DuerpArchiveEntry {
    // Get previous version hash for chain
    const previousVersions = getVersions(duerpId, tenantId);
    const latestPrevious = previousVersions.find((v) => v.version === version - 1);
    const previousVersionHash = latestPrevious?.contentHash ?? null;

    const contentHash = computeContentHash(content);
    const archivedAt = new Date();
    const retentionExpiresAt = new Date(archivedAt);
    retentionExpiresAt.setFullYear(retentionExpiresAt.getFullYear() + RETENTION_YEARS);

    const entry: DuerpArchiveEntry = {
      id: crypto.randomUUID(),
      duerpId,
      version,
      tenantId,
      frozenContent: structuredClone(content), // Deep copy for immutability
      contentHash,
      previousVersionHash,
      archivedAt,
      retentionExpiresAt,
      isImmutable: true,
      accessLog: [],
    };

    archives.set(entry.id, entry);
    return entry;
  }

  function getVersions(duerpId: string, tenantId: string): DuerpArchiveEntry[] {
    return [...archives.values()]
      .filter((a) => a.duerpId === duerpId && a.tenantId === tenantId)
      .sort((a, b) => a.version - b.version);
  }

  function getVersion(duerpId: string, tenantId: string, version: number, accessedBy?: string, reason?: DuerpAccessLog['reason']): DuerpArchiveEntry | null {
    const entry = [...archives.values()].find(
      (a) => a.duerpId === duerpId && a.tenantId === tenantId && a.version === version,
    );
    if (!entry) return null;

    // BUSINESS RULE [CDC-2.4]: Chaque consultation est tracee dans le access log
    if (accessedBy) {
      entry.accessLog.push({
        accessedAt: new Date(),
        accessedBy,
        reason: reason ?? 'consultation',
        ipAddress: null,
      });
    }

    return entry;
  }

  // BUSINESS RULE [CDC-2.4]: Verification d'integrite d'une version
  function verifyIntegrity(duerpId: string, tenantId: string, version: number): {
    valid: boolean;
    expectedHash: string;
    actualHash: string;
  } {
    const entry = [...archives.values()].find(
      (a) => a.duerpId === duerpId && a.tenantId === tenantId && a.version === version,
    );
    if (!entry) return { valid: false, expectedHash: '', actualHash: '' };

    const actualHash = computeContentHash(entry.frozenContent as Record<string, unknown>);
    return {
      valid: actualHash === entry.contentHash,
      expectedHash: entry.contentHash,
      actualHash,
    };
  }

  // BUSINESS RULE [CDC-2.4]: Verification de toute la chaine de hash
  function verifyChain(duerpId: string, tenantId: string): {
    valid: boolean;
    versions: number;
    brokenAt: number | null;
  } {
    const versions = getVersions(duerpId, tenantId);
    if (versions.length === 0) return { valid: true, versions: 0, brokenAt: null };

    for (let i = 0; i < versions.length; i++) {
      const entry = versions[i]!;

      // Check content hash
      const actualHash = computeContentHash(entry.frozenContent as Record<string, unknown>);
      if (actualHash !== entry.contentHash) {
        return { valid: false, versions: versions.length, brokenAt: entry.version };
      }

      // Check chain link (version > 1 should reference previous hash)
      if (i > 0) {
        const previousEntry = versions[i - 1]!;
        if (entry.previousVersionHash !== previousEntry.contentHash) {
          return { valid: false, versions: versions.length, brokenAt: entry.version };
        }
      }
    }

    return { valid: true, versions: versions.length, brokenAt: null };
  }

  // BUSINESS RULE [CDC-2.4]: Pas de suppression physique — meme soft delete interdit
  function attemptDelete(_duerpId: string, _tenantId: string, _version: number): { ok: false; error: string } {
    return { ok: false, error: 'ARCHIVE_IMMUTABLE: Les archives DUERP ne peuvent pas etre supprimees (conservation 40 ans — Art. R4121-4)' };
  }

  // BUSINESS RULE [CDC-2.4]: Tentative de modification → erreur
  function attemptModify(_duerpId: string, _tenantId: string, _version: number): { ok: false; error: string } {
    return { ok: false, error: 'ARCHIVE_IMMUTABLE: Les archives DUERP sont inalterables (Art. R4121-4)' };
  }

  return {
    archive,
    getVersions,
    getVersion,
    verifyIntegrity,
    verifyChain,
    attemptDelete,
    attemptModify,
  };
}

export type ArchiveService = ReturnType<typeof createArchiveService>;
