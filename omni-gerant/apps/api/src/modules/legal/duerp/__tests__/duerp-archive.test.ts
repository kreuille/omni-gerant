import { describe, it, expect, beforeEach } from 'vitest';
import { createArchiveService, computeContentHash, RETENTION_YEARS } from '../duerp-archive.service.js';

describe('E10 — 40-year immutable archive with hash chain', () => {
  let svc: ReturnType<typeof createArchiveService>;
  const TENANT = 'tenant-1';
  const DUERP_ID = 'duerp-1';

  const sampleContent = (version: number) => ({
    companyName: 'Test SAS',
    nafCode: '43.21A',
    employeeCount: 10,
    risks: [{ id: `risk-${version}`, name: 'Chute de hauteur', gravity: 4, frequency: 3 }],
    generatedAt: new Date().toISOString(),
    version,
  });

  beforeEach(() => {
    svc = createArchiveService();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. Archiving
  // ═══════════════════════════════════════════════════════════════

  describe('Archiving', () => {
    it('should archive a DUERP version with frozen content', () => {
      const entry = svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      expect(entry.id).toBeDefined();
      expect(entry.duerpId).toBe(DUERP_ID);
      expect(entry.version).toBe(1);
      expect(entry.tenantId).toBe(TENANT);
      expect(entry.isImmutable).toBe(true);
      expect(entry.frozenContent).toBeDefined();
      expect(entry.contentHash).toBeDefined();
      expect(entry.contentHash.length).toBe(64); // SHA-256 hex
    });

    it('should set retention to 40 years from archive date', () => {
      const entry = svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      const expectedYear = entry.archivedAt.getFullYear() + RETENTION_YEARS;
      expect(entry.retentionExpiresAt.getFullYear()).toBe(expectedYear);
    });

    it('should deep-copy the content (immutable)', () => {
      const content = sampleContent(1);
      const entry = svc.archive(DUERP_ID, TENANT, 1, content);
      // Modify the original — should NOT affect the archive
      (content as Record<string, unknown>).companyName = 'Modified';
      expect((entry.frozenContent as Record<string, unknown>).companyName).toBe('Test SAS');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. Immutability
  // ═══════════════════════════════════════════════════════════════

  describe('Immutability', () => {
    it('should refuse to delete an archive', () => {
      svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      const result = svc.attemptDelete(DUERP_ID, TENANT, 1);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('ARCHIVE_IMMUTABLE');
    });

    it('should refuse to modify an archive', () => {
      svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      const result = svc.attemptModify(DUERP_ID, TENANT, 1);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('ARCHIVE_IMMUTABLE');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. Hash integrity
  // ═══════════════════════════════════════════════════════════════

  describe('Hash integrity', () => {
    it('should verify valid content hash', () => {
      svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      const result = svc.verifyIntegrity(DUERP_ID, TENANT, 1);
      expect(result.valid).toBe(true);
      expect(result.expectedHash).toBe(result.actualHash);
    });

    it('should detect tampered content', () => {
      const entry = svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      // Tamper with the frozen content directly (simulating DB corruption)
      (entry.frozenContent as Record<string, unknown>).companyName = 'TAMPERED';
      const result = svc.verifyIntegrity(DUERP_ID, TENANT, 1);
      expect(result.valid).toBe(false);
      expect(result.expectedHash).not.toBe(result.actualHash);
    });

    it('should produce consistent hash for same content', () => {
      const content = { test: 'data', number: 42 };
      const hash1 = computeContentHash(content);
      const hash2 = computeContentHash(content);
      expect(hash1).toBe(hash2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. Hash chain
  // ═══════════════════════════════════════════════════════════════

  describe('Hash chain', () => {
    it('should chain versions correctly', () => {
      const v1 = svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      const v2 = svc.archive(DUERP_ID, TENANT, 2, sampleContent(2));
      const v3 = svc.archive(DUERP_ID, TENANT, 3, sampleContent(3));

      expect(v1.previousVersionHash).toBeNull(); // First version
      expect(v2.previousVersionHash).toBe(v1.contentHash);
      expect(v3.previousVersionHash).toBe(v2.contentHash);
    });

    it('should verify valid chain', () => {
      svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      svc.archive(DUERP_ID, TENANT, 2, sampleContent(2));
      svc.archive(DUERP_ID, TENANT, 3, sampleContent(3));

      const result = svc.verifyChain(DUERP_ID, TENANT);
      expect(result.valid).toBe(true);
      expect(result.versions).toBe(3);
      expect(result.brokenAt).toBeNull();
    });

    it('should detect broken chain (tampered content)', () => {
      const v1 = svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      svc.archive(DUERP_ID, TENANT, 2, sampleContent(2));

      // Tamper with v1 content
      (v1.frozenContent as Record<string, unknown>).companyName = 'TAMPERED';

      const result = svc.verifyChain(DUERP_ID, TENANT);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe(1);
    });

    it('should return valid for empty chain', () => {
      const result = svc.verifyChain(DUERP_ID, TENANT);
      expect(result.valid).toBe(true);
      expect(result.versions).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. Retention 40 years
  // ═══════════════════════════════════════════════════════════════

  describe('Retention 40 years', () => {
    it('should set retention to exactly 40 years', () => {
      const entry = svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      const diffYears = entry.retentionExpiresAt.getFullYear() - entry.archivedAt.getFullYear();
      expect(diffYears).toBe(40);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. Access log
  // ═══════════════════════════════════════════════════════════════

  describe('Access log', () => {
    it('should log access when retrieving a version', () => {
      svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      const entry = svc.getVersion(DUERP_ID, TENANT, 1, 'user-1', 'consultation');

      expect(entry).not.toBeNull();
      expect(entry!.accessLog.length).toBe(1);
      expect(entry!.accessLog[0]!.accessedBy).toBe('user-1');
      expect(entry!.accessLog[0]!.reason).toBe('consultation');
    });

    it('should accumulate access logs', () => {
      svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      svc.getVersion(DUERP_ID, TENANT, 1, 'user-1', 'consultation');
      svc.getVersion(DUERP_ID, TENANT, 1, 'user-2', 'export_pdf');
      svc.getVersion(DUERP_ID, TENANT, 1, 'ex-employee', 'former_employee_request');

      const entry = svc.getVersion(DUERP_ID, TENANT, 1);
      expect(entry!.accessLog.length).toBe(3);
    });

    it('should not log access when no user specified', () => {
      svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      const entry = svc.getVersion(DUERP_ID, TENANT, 1); // No user
      expect(entry!.accessLog.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. No delete
  // ═══════════════════════════════════════════════════════════════

  describe('No delete', () => {
    it('should never allow deletion', () => {
      svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      const deleteResult = svc.attemptDelete(DUERP_ID, TENANT, 1);
      expect(deleteResult.ok).toBe(false);

      // Entry should still exist
      const versions = svc.getVersions(DUERP_ID, TENANT);
      expect(versions.length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. Multi-tenant
  // ═══════════════════════════════════════════════════════════════

  describe('Multi-tenant isolation', () => {
    it('should isolate archives by tenant', () => {
      svc.archive(DUERP_ID, 'tenant-a', 1, sampleContent(1));
      svc.archive(DUERP_ID, 'tenant-b', 1, sampleContent(1));

      expect(svc.getVersions(DUERP_ID, 'tenant-a').length).toBe(1);
      expect(svc.getVersions(DUERP_ID, 'tenant-b').length).toBe(1);
    });

    it('should not access archive from another tenant', () => {
      svc.archive(DUERP_ID, TENANT, 1, sampleContent(1));
      const entry = svc.getVersion(DUERP_ID, 'other-tenant', 1);
      expect(entry).toBeNull();
    });
  });
});
