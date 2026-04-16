// BUSINESS RULE [CDC-2.4]: PAPRIPACT — Programme Annuel de Prevention
// Obligatoire pour les entreprises de 50+ salaries (Art. L4121-3-1 du Code du travail)

export interface Papripact {
  id: string;
  duerpId: string;
  tenantId: string;
  year: number;
  actions: PapripactAction[];
  cseConsultationDate: string | null;
  cseAvisRendu: 'favorable' | 'defavorable' | 'reserve' | null;
  totalBudgetCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PapripactAction {
  id: string;
  priority: 1 | 2 | 3;
  riskReference: string;
  actionDescription: string;
  responsibleName: string;
  startDate: string;
  endDate: string;
  budgetCents: number;
  successIndicator: string;
  status: 'planned' | 'in_progress' | 'completed';
}

// BUSINESS RULE [CDC-2.4]: Seuils PAPRIPACT
export function isPapripactRequired(effectif: number): boolean {
  return effectif >= 50;
}

export function createPapripactService() {
  const papripacts = new Map<string, Papripact>();

  return {
    generate(duerpId: string, tenantId: string, year: number, actions: Omit<PapripactAction, 'id'>[]): Papripact {
      const id = crypto.randomUUID();
      const papripact: Papripact = {
        id,
        duerpId,
        tenantId,
        year,
        actions: actions.map((a) => ({ ...a, id: crypto.randomUUID() })),
        cseConsultationDate: null,
        cseAvisRendu: null,
        totalBudgetCents: actions.reduce((sum, a) => sum + a.budgetCents, 0),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      papripacts.set(id, papripact);
      return papripact;
    },

    getByDuerp(duerpId: string): Papripact | undefined {
      return [...papripacts.values()].find((p) => p.duerpId === duerpId);
    },

    recordCseConsultation(id: string, date: string, avis: 'favorable' | 'defavorable' | 'reserve'): Papripact | null {
      const p = papripacts.get(id);
      if (!p) return null;
      p.cseConsultationDate = date;
      p.cseAvisRendu = avis;
      p.updatedAt = new Date();
      return p;
    },

    updateActionStatus(papripactId: string, actionId: string, status: PapripactAction['status']): Papripact | null {
      const p = papripacts.get(papripactId);
      if (!p) return null;
      const action = p.actions.find((a) => a.id === actionId);
      if (!action) return null;
      action.status = status;
      p.updatedAt = new Date();
      return p;
    },
  };
}
