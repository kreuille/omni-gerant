import { describe, it, expect, beforeEach } from 'vitest';
import { createPapripactV2Service, type ActionPlanV2 } from '../duerp-papripact-v2.service.js';
import { METIER_RISK_DATABASE, getRiskLevel } from '../risk-database-v2.js';
import type { MetierRisk } from '../risk-database-v2.js';

describe('E9 — PAPRIPACT V2 service', () => {
  let svc: ReturnType<typeof createPapripactV2Service>;
  const TENANT = 'tenant-1';
  const DUERP_ID = 'duerp-1';

  // Get a profile with known high/critical risks (BTP general has gravity 4 risks)
  const btpProfile = METIER_RISK_DATABASE.find((m) => m.metierSlug === 'btp-general')!;
  const btpRisks = btpProfile.risks;
  const btpWorkUnits = btpProfile.workUnits.map((wu) => ({ id: wu.id, name: wu.name }));

  beforeEach(() => {
    svc = createPapripactV2Service();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. Generation from DUERP
  // ═══════════════════════════════════════════════════════════════

  describe('Generation from DUERP risks', () => {
    it('should generate plan from DUERP risks', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      expect(plan.id).toBeDefined();
      expect(plan.duerpId).toBe(DUERP_ID);
      expect(plan.tenantId).toBe(TENANT);
      expect(plan.year).toBe(2025);
      expect(plan.status).toBe('draft');
      expect(plan.actions.length).toBeGreaterThan(0);
    });

    it('should only extract actions from high and critical risks', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);

      // Get all risk IDs referenced in the plan
      const planRiskIds = new Set(plan.actions.map((a) => a.riskId));

      // All referenced risks should be high or critical
      for (const riskId of planRiskIds) {
        const risk = btpRisks.find((r) => r.id === riskId)!;
        const score = risk.defaultGravity * risk.defaultFrequency;
        const level = getRiskLevel(score);
        expect(['high', 'critical']).toContain(level);
      }
    });

    it('should sort actions by priority (immediate first)', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      const priorities = plan.actions.map((a) => a.priority);
      const immediateIdx = priorities.indexOf('immediate');
      const shortTermIdx = priorities.indexOf('short_term');

      // If both exist, immediate should come before short_term
      if (immediateIdx >= 0 && shortTermIdx >= 0) {
        expect(immediateIdx).toBeLessThan(shortTermIdx);
      }
    });

    it('should calculate total budget', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      const manualSum = plan.actions.reduce((sum, a) => sum + a.estimatedCostCents, 0);
      expect(plan.totalBudgetCents).toBe(manualSum);
    });

    it('should assign critical risk actions as immediate priority', () => {
      // Find a critical risk (gravity 4, frequency 4 = 16)
      const criticalRisk = btpRisks.find((r) => {
        const score = r.defaultGravity * r.defaultFrequency;
        return getRiskLevel(score) === 'critical';
      });
      if (!criticalRisk) return; // Skip if no critical risk

      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, [criticalRisk], btpWorkUnits);
      for (const action of plan.actions) {
        expect(action.priority).toBe('immediate');
      }
    });

    it('should generate no actions from low-risk-only data', () => {
      const lowRisks: MetierRisk[] = [{
        id: 'test-low', name: 'Low risk', description: 'Test',
        workUnitId: '*', situations: ['A', 'B'],
        defaultGravity: 1, defaultFrequency: 1,
        existingMeasures: ['Measure'], proposedActions: ['Action'],
        category: 'physique',
      }];
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, lowRisks, []);
      expect(plan.actions.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. Validation workflow
  // ═══════════════════════════════════════════════════════════════

  describe('Validation workflow', () => {
    it('should validate a draft plan', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      expect(plan.status).toBe('draft');

      const validated = svc.validate(plan.id, TENANT);
      expect(validated).not.toBeNull();
      expect(validated!.status).toBe('validated');
      expect(validated!.validatedAt).not.toBeNull();
    });

    it('should not validate a non-draft plan', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      svc.validate(plan.id, TENANT); // Now validated
      const result = svc.validate(plan.id, TENANT); // Try again
      expect(result).toBeNull();
    });

    it('should not validate from another tenant', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      const result = svc.validate(plan.id, 'other-tenant');
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. Action workflow
  // ═══════════════════════════════════════════════════════════════

  describe('Action workflow', () => {
    it('should update action from todo to in_progress to done', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      const action = plan.actions[0]!;

      // todo → in_progress
      const updated = svc.updateActionStatus(plan.id, action.id, TENANT, 'in_progress');
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('in_progress');

      // in_progress → done
      const done = svc.updateActionStatus(plan.id, action.id, TENANT, 'done', 'Installation terminee');
      expect(done).not.toBeNull();
      expect(done!.status).toBe('done');
      expect(done!.completedAt).not.toBeNull();
      expect(done!.completionNotes).toBe('Installation terminee');
    });

    it('should cancel an action', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      const action = plan.actions[0]!;
      const cancelled = svc.updateActionStatus(plan.id, action.id, TENANT, 'cancelled');
      expect(cancelled).not.toBeNull();
      expect(cancelled!.status).toBe('cancelled');
    });

    it('should not update action from another tenant', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      const action = plan.actions[0]!;
      const result = svc.updateActionStatus(plan.id, action.id, 'other-tenant', 'done');
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. Progress
  // ═══════════════════════════════════════════════════════════════

  describe('Progress tracking', () => {
    it('should calculate progress correctly', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      const total = plan.actions.length;

      // Complete half the actions
      const halfCount = Math.floor(total / 2);
      for (let i = 0; i < halfCount; i++) {
        svc.updateActionStatus(plan.id, plan.actions[i]!.id, TENANT, 'done');
      }

      const progress = svc.getProgress(plan.id, TENANT);
      expect(progress).not.toBeNull();
      expect(progress!.totalActions).toBe(total);
      expect(progress!.done).toBe(halfCount);
      expect(progress!.completionPercent).toBe(Math.round((halfCount / total) * 100));
    });

    it('should detect overdue actions', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2020, btpRisks, btpWorkUnits); // Year 2020 = all deadlines in the past
      const progress = svc.getProgress(plan.id, TENANT);
      expect(progress).not.toBeNull();
      expect(progress!.overdueCount).toBeGreaterThan(0);
    });

    it('should return null for unknown plan', () => {
      const progress = svc.getProgress('nonexistent', TENANT);
      expect(progress).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. Budget
  // ═══════════════════════════════════════════════════════════════

  describe('Budget tracking', () => {
    it('should calculate budget by type and priority', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      const budget = svc.getBudget(plan.id, TENANT);
      expect(budget).not.toBeNull();
      expect(budget!.totalEstimatedCents).toBe(plan.totalBudgetCents);
      expect(budget!.totalEstimatedCents).toBeGreaterThan(0);

      // Sum of byType should equal total
      const typeSum = Object.values(budget!.byType).reduce((s, v) => s + v, 0);
      expect(typeSum).toBe(budget!.totalEstimatedCents);

      // Sum of byPriority should equal total
      const prioritySum = Object.values(budget!.byPriority).reduce((s, v) => s + v, 0);
      expect(prioritySum).toBe(budget!.totalEstimatedCents);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. Verification
  // ═══════════════════════════════════════════════════════════════

  describe('Action verification', () => {
    it('should verify a completed action', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      const action = plan.actions[0]!;

      svc.updateActionStatus(plan.id, action.id, TENANT, 'done');
      const verified = svc.verifyAction(plan.id, action.id, TENANT, 'inspector-1');
      expect(verified).not.toBeNull();
      expect(verified!.verifiedAt).not.toBeNull();
      expect(verified!.verifiedBy).toBe('inspector-1');
    });

    it('should not verify a non-completed action', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      const action = plan.actions[0]!;
      const result = svc.verifyAction(plan.id, action.id, TENANT, 'inspector-1');
      expect(result).toBeNull(); // Still 'todo'
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. Listing
  // ═══════════════════════════════════════════════════════════════

  describe('Listing', () => {
    it('should list plans by tenant', () => {
      svc.generateFromRisks('d1', TENANT, 1, 2025, btpRisks, btpWorkUnits);
      svc.generateFromRisks('d2', TENANT, 2, 2026, btpRisks, btpWorkUnits);
      svc.generateFromRisks('d3', 'other-tenant', 1, 2025, btpRisks, btpWorkUnits);

      const list = svc.listByTenant(TENANT);
      expect(list.length).toBe(2);
    });

    it('should get plan by id', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      const found = svc.getById(plan.id, TENANT);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(plan.id);
    });

    it('should not get plan from another tenant', () => {
      const plan = svc.generateFromRisks(DUERP_ID, TENANT, 1, 2025, btpRisks, btpWorkUnits);
      const found = svc.getById(plan.id, 'other-tenant');
      expect(found).toBeNull();
    });
  });
});
