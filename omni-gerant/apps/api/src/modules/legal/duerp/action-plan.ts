// BUSINESS RULE [CDC-2.4]: Plan d'actions structure du DUERP
// Chaque action de prevention est liee a un risque identifie, avec responsable, delai et budget.

export interface DuerpAction {
  id: string;
  duerpId: string;
  riskId: string;
  description: string;
  responsibleName: string;
  responsibleRole: string;
  deadline: string; // ISO date
  budgetCents: number | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  progressIndicator: string | null;
  completedAt: string | null;
  evidence: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionPlanSummary {
  totalActions: number;
  planned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  totalBudgetCents: number;
  completionRate: number;
  overdueActions: number;
}

export function createActionPlanService() {
  const actions = new Map<string, DuerpAction>();

  return {
    addAction(duerpId: string, data: Omit<DuerpAction, 'id' | 'createdAt' | 'updatedAt'>): DuerpAction {
      const id = crypto.randomUUID();
      const action: DuerpAction = { ...data, id, duerpId, createdAt: new Date(), updatedAt: new Date() };
      actions.set(id, action);
      return action;
    },

    updateAction(id: string, data: Partial<Pick<DuerpAction, 'status' | 'progressIndicator' | 'completedAt' | 'evidence' | 'description' | 'deadline' | 'budgetCents'>>): DuerpAction | null {
      const action = actions.get(id);
      if (!action) return null;
      const updated = { ...action, ...data, updatedAt: new Date() };
      if (data.status === 'completed' && !data.completedAt) {
        updated.completedAt = new Date().toISOString();
      }
      actions.set(id, updated);
      return updated;
    },

    getActionsByDuerp(duerpId: string): DuerpAction[] {
      return [...actions.values()].filter((a) => a.duerpId === duerpId);
    },

    getSummary(duerpId: string): ActionPlanSummary {
      const duerpActions = this.getActionsByDuerp(duerpId);
      const now = new Date();
      const overdue = duerpActions.filter((a) => a.status !== 'completed' && a.status !== 'cancelled' && new Date(a.deadline) < now);

      return {
        totalActions: duerpActions.length,
        planned: duerpActions.filter((a) => a.status === 'planned').length,
        inProgress: duerpActions.filter((a) => a.status === 'in_progress').length,
        completed: duerpActions.filter((a) => a.status === 'completed').length,
        cancelled: duerpActions.filter((a) => a.status === 'cancelled').length,
        totalBudgetCents: duerpActions.reduce((sum, a) => sum + (a.budgetCents ?? 0), 0),
        completionRate: duerpActions.length > 0 ? Math.round((duerpActions.filter((a) => a.status === 'completed').length / duerpActions.length) * 100) : 0,
        overdueActions: overdue.length,
      };
    },
  };
}
