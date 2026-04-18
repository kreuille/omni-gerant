// BUSINESS RULE [CDC-2.4]: E9 — PAPRIPACT V2 (Plan d'action annuel de prevention)
// Art. L4121-3-1 : obligatoire >= 50 salaries, recommande pour TPE
// Generation automatique depuis les risques high/critical du DUERP

import type { MetierRisk } from './risk-database-v2.js';
import { getRiskLevel } from './risk-database-v2.js';

// ── Interfaces ────────────────────────────────────────────────────

export interface ActionPlanV2 {
  id: string;
  duerpId: string;
  tenantId: string;
  duerpVersion: number;
  year: number;
  status: 'draft' | 'validated' | 'in_progress' | 'completed' | 'archived';
  createdAt: Date;
  validatedAt: Date | null;
  actions: PreventionActionV2[];
  totalBudgetCents: number;
}

export interface PreventionActionV2 {
  id: string;
  planId: string;
  riskId: string;
  riskName: string;
  workUnitId: string;
  description: string;
  type: 'organizational' | 'technical' | 'human' | 'ppe';
  principleLevel: number;
  priority: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  responsibleRole: string;
  deadline: string; // ISO date
  estimatedCostCents: number;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  completedAt: Date | null;
  completionNotes: string | null;
  verificationMethod: string;
  verifiedAt: Date | null;
  verifiedBy: string | null;
}

export interface ActionPlanProgress {
  totalActions: number;
  todo: number;
  inProgress: number;
  done: number;
  cancelled: number;
  completionPercent: number;
  overdueCount: number;
}

export interface ActionPlanBudget {
  totalEstimatedCents: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

// ── Service ───────────────────────────────────────────────────────

export function createPapripactV2Service() {
  const plans = new Map<string, ActionPlanV2>();

  // BUSINESS RULE [CDC-2.4]: Generation automatique depuis les risques DUERP
  // Extrait toutes les mesures de prevention des risques high et critical
  function generateFromRisks(
    duerpId: string,
    tenantId: string,
    duerpVersion: number,
    year: number,
    risks: MetierRisk[],
    workUnits: Array<{ id: string; name: string }>,
  ): ActionPlanV2 {
    const planId = crypto.randomUUID();
    const actions: PreventionActionV2[] = [];

    const wuMap = new Map(workUnits.map((wu) => [wu.id, wu.name]));

    for (const risk of risks) {
      const score = risk.defaultGravity * risk.defaultFrequency;
      const level = getRiskLevel(score);

      // Only extract actions for high and critical risks
      if (level !== 'high' && level !== 'critical') continue;

      // Convert proposed actions into prevention actions
      for (const proposedAction of risk.proposedActions) {
        const priority = level === 'critical' ? 'immediate' as const : 'short_term' as const;
        const monthOffset = priority === 'immediate' ? 1 : priority === 'short_term' ? 3 : 6;
        const deadline = new Date(year, monthOffset - 1, 28);

        actions.push({
          id: crypto.randomUUID(),
          planId,
          riskId: risk.id,
          riskName: risk.name,
          workUnitId: risk.workUnitId,
          description: proposedAction,
          type: categorizeAction(proposedAction),
          principleLevel: guessPrincipleLevel(proposedAction),
          priority,
          responsibleRole: guessResponsibleRole(proposedAction),
          deadline: deadline.toISOString(),
          estimatedCostCents: estimateCost(proposedAction),
          status: 'todo',
          completedAt: null,
          completionNotes: null,
          verificationMethod: `Verification de la mise en oeuvre : ${proposedAction.slice(0, 50)}`,
          verifiedAt: null,
          verifiedBy: null,
        });
      }
    }

    // Sort by priority: immediate > short_term > medium_term > long_term
    const priorityOrder = { immediate: 0, short_term: 1, medium_term: 2, long_term: 3 };
    actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const plan: ActionPlanV2 = {
      id: planId,
      duerpId,
      tenantId,
      duerpVersion,
      year,
      status: 'draft',
      createdAt: new Date(),
      validatedAt: null,
      actions,
      totalBudgetCents: actions.reduce((sum, a) => sum + a.estimatedCostCents, 0),
    };

    plans.set(planId, plan);
    return plan;
  }

  function getById(planId: string, tenantId: string): ActionPlanV2 | null {
    const plan = plans.get(planId);
    if (!plan || plan.tenantId !== tenantId) return null;
    return plan;
  }

  function listByTenant(tenantId: string): ActionPlanV2[] {
    return [...plans.values()]
      .filter((p) => p.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  function validate(planId: string, tenantId: string): ActionPlanV2 | null {
    const plan = plans.get(planId);
    if (!plan || plan.tenantId !== tenantId || plan.status !== 'draft') return null;
    plan.status = 'validated';
    plan.validatedAt = new Date();
    return plan;
  }

  function updateActionStatus(
    planId: string,
    actionId: string,
    tenantId: string,
    status: PreventionActionV2['status'],
    notes?: string,
  ): PreventionActionV2 | null {
    const plan = plans.get(planId);
    if (!plan || plan.tenantId !== tenantId) return null;

    const action = plan.actions.find((a) => a.id === actionId);
    if (!action) return null;

    action.status = status;
    if (status === 'done') {
      action.completedAt = new Date();
      if (notes) action.completionNotes = notes;
    }
    return action;
  }

  function verifyAction(
    planId: string,
    actionId: string,
    tenantId: string,
    verifiedBy: string,
  ): PreventionActionV2 | null {
    const plan = plans.get(planId);
    if (!plan || plan.tenantId !== tenantId) return null;

    const action = plan.actions.find((a) => a.id === actionId);
    if (!action || action.status !== 'done') return null;

    action.verifiedAt = new Date();
    action.verifiedBy = verifiedBy;
    return action;
  }

  function getProgress(planId: string, tenantId: string): ActionPlanProgress | null {
    const plan = plans.get(planId);
    if (!plan || plan.tenantId !== tenantId) return null;

    const now = new Date();
    const overdue = plan.actions.filter(
      (a) => a.status !== 'done' && a.status !== 'cancelled' && new Date(a.deadline) < now,
    );

    const done = plan.actions.filter((a) => a.status === 'done').length;
    const total = plan.actions.length;

    return {
      totalActions: total,
      todo: plan.actions.filter((a) => a.status === 'todo').length,
      inProgress: plan.actions.filter((a) => a.status === 'in_progress').length,
      done,
      cancelled: plan.actions.filter((a) => a.status === 'cancelled').length,
      completionPercent: total > 0 ? Math.round((done / total) * 100) : 0,
      overdueCount: overdue.length,
    };
  }

  function getBudget(planId: string, tenantId: string): ActionPlanBudget | null {
    const plan = plans.get(planId);
    if (!plan || plan.tenantId !== tenantId) return null;

    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const action of plan.actions) {
      byType[action.type] = (byType[action.type] ?? 0) + action.estimatedCostCents;
      byPriority[action.priority] = (byPriority[action.priority] ?? 0) + action.estimatedCostCents;
    }

    return {
      totalEstimatedCents: plan.totalBudgetCents,
      byType,
      byPriority,
    };
  }

  return {
    generateFromRisks,
    getById,
    listByTenant,
    validate,
    updateActionStatus,
    verifyAction,
    getProgress,
    getBudget,
  };
}

// ── Helpers for auto-generation ─────────────────────────────────

function categorizeAction(desc: string): 'organizational' | 'technical' | 'human' | 'ppe' {
  const lower = desc.toLowerCase();
  if (lower.includes('epi') || lower.includes('casque') || lower.includes('gant') || lower.includes('masque') || lower.includes('harnais') || lower.includes('lunettes') || lower.includes('chaussures')) return 'ppe';
  if (lower.includes('formation') || lower.includes('sensibilisation') || lower.includes('recyclage') || lower.includes('habilitation')) return 'human';
  if (lower.includes('installation') || lower.includes('equipement') || lower.includes('ventilation') || lower.includes('detecteur') || lower.includes('garde-corps') || lower.includes('carter')) return 'technical';
  return 'organizational';
}

function guessPrincipleLevel(desc: string): number {
  const lower = desc.toLowerCase();
  if (lower.includes('supprimer') || lower.includes('eliminer') || lower.includes('eviter')) return 1;
  if (lower.includes('substituer') || lower.includes('remplacer')) return 6;
  if (lower.includes('collecti') || lower.includes('ventilation') || lower.includes('garde-corps') || lower.includes('carter')) return 8;
  if (lower.includes('formation') || lower.includes('instruction') || lower.includes('consigne')) return 9;
  if (lower.includes('epi') || lower.includes('casque') || lower.includes('gant') || lower.includes('masque')) return 9;
  return 7; // Default: Planifier la prevention
}

function guessResponsibleRole(desc: string): string {
  const lower = desc.toLowerCase();
  if (lower.includes('formation') || lower.includes('habilitation')) return 'Responsable RH / Formation';
  if (lower.includes('installation') || lower.includes('ventilation') || lower.includes('electrique')) return 'Responsable technique';
  if (lower.includes('epi')) return 'Responsable securite';
  return 'Dirigeant / Responsable';
}

function estimateCost(desc: string): number {
  const lower = desc.toLowerCase();
  if (lower.includes('formation')) return 50000; // 500 EUR
  if (lower.includes('epi') || lower.includes('gant') || lower.includes('masque') || lower.includes('lunettes')) return 5000; // 50 EUR
  if (lower.includes('harnais') || lower.includes('casque')) return 15000; // 150 EUR
  if (lower.includes('installation') || lower.includes('ventilation')) return 200000; // 2000 EUR
  if (lower.includes('detecteur') || lower.includes('alarme')) return 30000; // 300 EUR
  if (lower.includes('garde-corps')) return 100000; // 1000 EUR
  return 10000; // Default: 100 EUR
}

export type PapripactV2Service = ReturnType<typeof createPapripactV2Service>;
