import { describe, it, expect, beforeEach } from 'vitest';
import { createTriggerService } from '../duerp-trigger.service.js';

describe('E8 — Trigger service', () => {
  let svc: ReturnType<typeof createTriggerService>;
  const TENANT = 'tenant-1';

  beforeEach(() => {
    svc = createTriggerService();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. Annual trigger
  // ═══════════════════════════════════════════════════════════════

  describe('Annual review trigger', () => {
    it('should create critical trigger when DUERP > 365 days for >= 11 employees', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400); // 400 days ago
      const trigger = svc.checkAnnualReview(TENANT, oldDate, 15);
      expect(trigger).not.toBeNull();
      expect(trigger!.type).toBe('annual_deadline');
      expect(trigger!.severity).toBe('critical');
    });

    it('should NOT create trigger when DUERP <= 365 days', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 100); // 100 days ago
      const trigger = svc.checkAnnualReview(TENANT, recentDate, 15);
      expect(trigger).toBeNull();
    });

    it('should NOT create trigger for < 11 employees (even if > 365 days)', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 500);
      const trigger = svc.checkAnnualReview(TENANT, oldDate, 5);
      expect(trigger).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. Chemical detection
  // ═══════════════════════════════════════════════════════════════

  describe('Chemical detection from purchase', () => {
    it('should detect chemical product in purchase description', () => {
      const trigger = svc.detectChemicalFromPurchase(TENANT, 'p-1', 'Achat de solvant de nettoyage industriel');
      expect(trigger).not.toBeNull();
      expect(trigger!.type).toBe('new_chemical_product');
      expect(trigger!.severity).toBe('warning');
      expect(trigger!.sourceModule).toBe('purchase');
    });

    it('should detect pesticide', () => {
      const trigger = svc.detectChemicalFromPurchase(TENANT, 'p-2', 'Pesticide pour traitement des cultures');
      expect(trigger).not.toBeNull();
    });

    it('should detect javel', () => {
      const trigger = svc.detectChemicalFromPurchase(TENANT, 'p-3', 'Eau de javel 5L');
      expect(trigger).not.toBeNull();
    });

    it('should NOT trigger for non-chemical purchase', () => {
      const trigger = svc.detectChemicalFromPurchase(TENANT, 'p-4', 'Achat de chaises de bureau');
      expect(trigger).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. Equipment detection
  // ═══════════════════════════════════════════════════════════════

  describe('Equipment detection from purchase', () => {
    it('should detect dangerous equipment in purchase description', () => {
      const trigger = svc.detectEquipmentFromPurchase(TENANT, 'p-5', 'Achat chariot elevateur Toyota');
      expect(trigger).not.toBeNull();
      expect(trigger!.type).toBe('new_equipment');
      expect(trigger!.severity).toBe('info');
    });

    it('should detect machinery', () => {
      const trigger = svc.detectEquipmentFromPurchase(TENANT, 'p-6', 'Location nacelle elevatrice');
      expect(trigger).not.toBeNull();
    });

    it('should NOT trigger for non-equipment purchase', () => {
      const trigger = svc.detectEquipmentFromPurchase(TENANT, 'p-7', 'Achat de fournitures de bureau');
      expect(trigger).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. Resolution
  // ═══════════════════════════════════════════════════════════════

  describe('Trigger resolution', () => {
    it('should resolve a trigger and link to new DUERP version', () => {
      const trigger = svc.reportWorkplaceAccident(TENANT, 'Chute depuis echafaudage');
      expect(trigger).not.toBeNull();

      const resolved = svc.resolve(trigger!.id, TENANT, 'user-1', 3);
      expect(resolved).not.toBeNull();
      expect(resolved!.acknowledged).toBe(true);
      expect(resolved!.resolvedAt).not.toBeNull();
      expect(resolved!.resolvedBy).toBe('user-1');
      expect(resolved!.duerpVersionAfter).toBe(3);
      expect(resolved!.resultingUpdateId).toBe('duerp-v3');
    });

    it('should not resolve trigger from another tenant', () => {
      const trigger = svc.reportWorkplaceAccident(TENANT, 'Accident');
      const resolved = svc.resolve(trigger!.id, 'other-tenant', 'user-2');
      expect(resolved).toBeNull();
    });

    it('should remove resolved triggers from unresolved list', () => {
      const trigger = svc.reportWorkplaceAccident(TENANT, 'Accident');
      expect(svc.getUnresolved(TENANT).length).toBe(1);

      svc.resolve(trigger!.id, TENANT, 'user-1');
      expect(svc.getUnresolved(TENANT).length).toBe(0);
    });

    it('should keep resolved triggers in history', () => {
      const trigger = svc.reportWorkplaceAccident(TENANT, 'Accident');
      svc.resolve(trigger!.id, TENANT, 'user-1');
      expect(svc.getHistory(TENANT).length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. Update status
  // ═══════════════════════════════════════════════════════════════

  describe('Update status', () => {
    it('should return up_to_date when no triggers', () => {
      const status = svc.getUpdateStatus(TENANT, new Date(), 15);
      expect(status.status).toBe('up_to_date');
      expect(status.unresolvedCount).toBe(0);
    });

    it('should return update_required when critical triggers exist', () => {
      svc.reportWorkplaceAccident(TENANT, 'Accident grave');
      const status = svc.getUpdateStatus(TENANT, new Date(), 15);
      expect(status.status).toBe('update_required');
      expect(status.criticalCount).toBe(1);
    });

    it('should return update_recommended when non-critical triggers exist', () => {
      svc.detectEquipmentFromPurchase(TENANT, 'p-1', 'Nouvelle machine CNC');
      const status = svc.getUpdateStatus(TENANT, new Date(), 15);
      expect(status.status).toBe('update_recommended');
      expect(status.unresolvedCount).toBe(1);
    });

    it('should report days since last update', () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const status = svc.getUpdateStatus(TENANT, fiveDaysAgo, 1);
      expect(status.lastUpdateDaysAgo).toBe(5);
    });

    it('should handle null last update date', () => {
      const status = svc.getUpdateStatus(TENANT, null, 1);
      expect(status.lastUpdateDaysAgo).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. No duplicates
  // ═══════════════════════════════════════════════════════════════

  describe('Duplicate prevention', () => {
    it('should not create duplicate trigger for same source entity', () => {
      const t1 = svc.detectChemicalFromPurchase(TENANT, 'p-1', 'Achat de solvant');
      const t2 = svc.detectChemicalFromPurchase(TENANT, 'p-1', 'Achat de solvant');
      expect(t1).not.toBeNull();
      expect(t2).toBeNull(); // duplicate
    });

    it('should allow trigger for different source entities', () => {
      const t1 = svc.detectChemicalFromPurchase(TENANT, 'p-1', 'Achat de solvant');
      const t2 = svc.detectChemicalFromPurchase(TENANT, 'p-2', 'Achat de peinture');
      expect(t1).not.toBeNull();
      expect(t2).not.toBeNull();
    });

    it('should allow same source after resolution', () => {
      const t1 = svc.detectChemicalFromPurchase(TENANT, 'p-1', 'Achat de solvant');
      svc.resolve(t1!.id, TENANT, 'user-1');
      const t2 = svc.detectChemicalFromPurchase(TENANT, 'p-1', 'Achat de solvant');
      expect(t2).not.toBeNull(); // Not duplicate anymore after resolution
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. Workplace accident
  // ═══════════════════════════════════════════════════════════════

  describe('Workplace accident trigger', () => {
    it('should create critical trigger for workplace accident', () => {
      const trigger = svc.reportWorkplaceAccident(TENANT, 'Chute depuis echafaudage');
      expect(trigger).not.toBeNull();
      expect(trigger!.type).toBe('accident_travail');
      expect(trigger!.severity).toBe('critical');
      expect(trigger!.sourceModule).toBe('duerp');
      expect(trigger!.description).toContain('Chute depuis echafaudage');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. Multi-tenant isolation
  // ═══════════════════════════════════════════════════════════════

  describe('Multi-tenant isolation', () => {
    it('should isolate triggers by tenant', () => {
      svc.reportWorkplaceAccident('tenant-a', 'Accident A');
      svc.reportWorkplaceAccident('tenant-b', 'Accident B');

      expect(svc.getUnresolved('tenant-a').length).toBe(1);
      expect(svc.getUnresolved('tenant-b').length).toBe(1);
      expect(svc.getUnresolved('tenant-a')[0]!.description).toContain('Accident A');
      expect(svc.getUnresolved('tenant-b')[0]!.description).toContain('Accident B');
    });
  });
});
