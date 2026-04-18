import { describe, it, expect, beforeEach } from 'vitest';
import { createTrainingTrackerService, ALL_TRAININGS } from '../duerp-training-tracker.service.js';

describe('E11 — Mandatory training database and tracking', () => {
  let svc: ReturnType<typeof createTrainingTrackerService>;
  const TENANT = 'tenant-1';

  beforeEach(() => {
    svc = createTrainingTrackerService();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. Training database
  // ═══════════════════════════════════════════════════════════════

  describe('Training database', () => {
    it('should have at least 20 trainings in the extended database', () => {
      expect(ALL_TRAININGS.length).toBeGreaterThanOrEqual(20);
    });

    it('should include SST for all sectors', () => {
      const sst = ALL_TRAININGS.find((t) => t.id === 'sst');
      expect(sst).toBeDefined();
      expect(sst!.sectors).toContain('*');
    });

    it('should include HACCP for restaurant', () => {
      const trainings = svc.getRequiredTrainings('restaurant');
      expect(trainings.some((t) => t.id === 'haccp')).toBe(true);
    });

    it('should include CACES for BTP', () => {
      const trainings = svc.getRequiredTrainings('btp-general');
      expect(trainings.some((t) => t.id === 'caces')).toBe(true);
    });

    it('should include PRAP for aide-domicile', () => {
      const trainings = svc.getRequiredTrainings('aide-domicile');
      expect(trainings.some((t) => t.id === 'prap')).toBe(true);
    });

    it('should include habilitation electrique for electricien', () => {
      const trainings = svc.getRequiredTrainings('electricien');
      expect(trainings.some((t) => t.id === 'habilitation-electrique')).toBe(true);
    });

    it('should return at least 5 trainings for BTP', () => {
      const trainings = svc.getRequiredTrainings('btp-general');
      expect(trainings.length).toBeGreaterThanOrEqual(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. Extended sectors (E7)
  // ═══════════════════════════════════════════════════════════════

  describe('Extended sectors', () => {
    it('should include espace confine for assainissement', () => {
      const trainings = svc.getRequiredTrainings('assainissement');
      expect(trainings.some((t) => t.id === 'espace-confine')).toBe(true);
    });

    it('should include FIMO for transport routier marchandises', () => {
      const trainings = svc.getRequiredTrainings('transport-routier-marchandises');
      expect(trainings.some((t) => t.id === 'fimo-marchandises')).toBe(true);
    });

    it('should include hygiene-tatouage for tatouage-piercing', () => {
      const trainings = svc.getRequiredTrainings('tatouage-piercing');
      expect(trainings.some((t) => t.id === 'hygiene-tatouage')).toBe(true);
    });

    it('should include CQP for agent-securite', () => {
      const trainings = svc.getRequiredTrainings('agent-securite');
      expect(trainings.some((t) => t.id === 'cqp-securite')).toBe(true);
    });

    it('should include DVA for moniteur-ski', () => {
      const trainings = svc.getRequiredTrainings('moniteur-ski');
      expect(trainings.some((t) => t.id === 'dva-secours-avalanche')).toBe(true);
    });

    it('should include BNSSA for piscine', () => {
      const trainings = svc.getRequiredTrainings('piscine-centre-aquatique');
      expect(trainings.some((t) => t.id === 'bnssa')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. Training records
  // ═══════════════════════════════════════════════════════════════

  describe('Training records', () => {
    it('should add a training record with auto-calculated expiry', () => {
      const record = svc.addRecord(TENANT, 'Jean Dupont', 'sst', new Date('2024-06-15'));
      expect(record.id).toBeDefined();
      expect(record.employeeName).toBe('Jean Dupont');
      expect(record.trainingId).toBe('sst');
      // SST has 2-year validity
      expect(record.expiresAt).not.toBeNull();
      expect(record.expiresAt!.getFullYear()).toBe(2026);
    });

    it('should set null expiry for trainings without validity period', () => {
      const record = svc.addRecord(TENANT, 'Marie Martin', 'haccp', new Date('2024-01-01'));
      expect(record.expiresAt).toBeNull(); // HACCP has no renewal
    });

    it('should list records by employee', () => {
      svc.addRecord(TENANT, 'Jean Dupont', 'sst', new Date());
      svc.addRecord(TENANT, 'Jean Dupont', 'caces', new Date());
      svc.addRecord(TENANT, 'Marie Martin', 'sst', new Date());

      const jeanRecords = svc.getRecordsByEmployee(TENANT, 'Jean Dupont');
      expect(jeanRecords.length).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. Expiration alerts
  // ═══════════════════════════════════════════════════════════════

  describe('Expiration alerts', () => {
    it('should detect expired training', () => {
      // Add SST that expired 30 days ago
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 3); // 3 years ago → expired (SST = 2y)
      svc.addRecord(TENANT, 'Jean Dupont', 'sst', pastDate);

      const expiring = svc.getExpiringTrainings(TENANT, 365);
      expect(expiring.length).toBe(1);
      expect(expiring[0]!.status).toBe('expired');
      expect(expiring[0]!.daysUntilExpiry).toBeLessThan(0);
    });

    it('should detect training expiring within 60 days', () => {
      // Add SST that expires in 30 days
      const almostExpiredDate = new Date();
      almostExpiredDate.setFullYear(almostExpiredDate.getFullYear() - 2);
      almostExpiredDate.setDate(almostExpiredDate.getDate() + 30); // Expires in ~30 days
      svc.addRecord(TENANT, 'Jean Dupont', 'sst', almostExpiredDate);

      const expiring = svc.getExpiringTrainings(TENANT, 90);
      expect(expiring.length).toBe(1);
      expect(expiring[0]!.status).toBe('expiring_soon');
    });

    it('should not flag valid trainings within range', () => {
      // Add SST completed today (valid for 2 years)
      svc.addRecord(TENANT, 'Jean Dupont', 'sst', new Date());
      const expiring = svc.getExpiringTrainings(TENANT, 90);
      expect(expiring.length).toBe(0);
    });

    it('should sort by closest expiry first', () => {
      // Training 1: expires soon
      const date1 = new Date();
      date1.setFullYear(date1.getFullYear() - 2);
      date1.setDate(date1.getDate() + 10);
      svc.addRecord(TENANT, 'Jean', 'sst', date1);

      // Training 2: expired long ago
      const date2 = new Date();
      date2.setFullYear(date2.getFullYear() - 4);
      svc.addRecord(TENANT, 'Marie', 'habilitation-electrique', date2);

      const expiring = svc.getExpiringTrainings(TENANT, 365);
      expect(expiring.length).toBe(2);
      expect(expiring[0]!.daysUntilExpiry).toBeLessThan(expiring[1]!.daysUntilExpiry);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. Training matrix
  // ═══════════════════════════════════════════════════════════════

  describe('Training matrix', () => {
    it('should build training matrix for employees', () => {
      svc.addRecord(TENANT, 'Jean Dupont', 'sst', new Date());
      svc.addRecord(TENANT, 'Jean Dupont', 'caces', new Date());
      svc.addRecord(TENANT, 'Marie Martin', 'sst', new Date());

      const matrix = svc.getTrainingMatrix(TENANT, 'btp-general');
      expect(matrix.requiredTrainings.length).toBeGreaterThanOrEqual(5);
      expect(matrix.employees.length).toBe(2);

      // Jean should have SST and CACES as 'ok'
      const jean = matrix.employees.find((e) => e.name === 'Jean Dupont')!;
      const jeanSst = jean.trainings.find((t) => t.trainingId === 'sst')!;
      expect(jeanSst.status).toBe('ok');
    });

    it('should mark missing trainings', () => {
      svc.addRecord(TENANT, 'Jean Dupont', 'sst', new Date());

      const matrix = svc.getTrainingMatrix(TENANT, 'btp-general');
      const jean = matrix.employees.find((e) => e.name === 'Jean Dupont')!;
      const missingTrainings = jean.trainings.filter((t) => t.status === 'missing');
      expect(missingTrainings.length).toBeGreaterThan(0);
    });

    it('should mark expired trainings', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 5);
      svc.addRecord(TENANT, 'Jean Dupont', 'sst', oldDate); // Expired SST

      const matrix = svc.getTrainingMatrix(TENANT, 'btp-general');
      const jean = matrix.employees.find((e) => e.name === 'Jean Dupont')!;
      const jeanSst = jean.trainings.find((t) => t.trainingId === 'sst')!;
      expect(jeanSst.status).toBe('expired');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. Multi-tenant
  // ═══════════════════════════════════════════════════════════════

  describe('Multi-tenant isolation', () => {
    it('should isolate records by tenant', () => {
      svc.addRecord('tenant-a', 'Jean', 'sst', new Date());
      svc.addRecord('tenant-b', 'Marie', 'sst', new Date());

      expect(svc.getRecordsByTenant('tenant-a').length).toBe(1);
      expect(svc.getRecordsByTenant('tenant-b').length).toBe(1);
    });
  });
});
