// BUSINESS RULE [CDC-2.4]: E8 — Service de gestion des triggers de mise a jour DUERP
// Art. R4121-2 : mise a jour obligatoire lors de changements significatifs

import type { DuerpUpdateTrigger, DuerpUpdateTriggerType } from './duerp-update-engine.js';

export interface TriggerCreateInput {
  type: DuerpUpdateTriggerType;
  sourceModule: string;
  sourceEntityId?: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface StoredTrigger extends DuerpUpdateTrigger {
  tenantId: string;
  severity: 'info' | 'warning' | 'critical';
  sourceEntityId: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  duerpVersionBefore: number | null;
  duerpVersionAfter: number | null;
}

// BUSINESS RULE [CDC-2.4]: Mots-cles pour detection de produits chimiques dans les achats
const CHEMICAL_KEYWORDS = [
  'acide', 'soude', 'solvant', 'peinture', 'vernis', 'colle', 'resine',
  'diluant', 'acetone', 'trichloroethylene', 'perchloroethylene', 'javel',
  'ammoniac', 'formaldehyde', 'formol', 'isocyanate', 'amiante', 'plomb',
  'chrome', 'nickel', 'benzene', 'toluene', 'xylene', 'styrene',
  'detergent', 'desinfectant', 'biocide', 'pesticide', 'herbicide',
  'fongicide', 'insecticide', 'cmr', 'cancerogene', 'mutagene',
  'produit chimique', 'produit dangereux', 'fds', 'fiche donnees securite',
];

// BUSINESS RULE [CDC-2.4]: Mots-cles pour detection d'equipements dangereux
const EQUIPMENT_KEYWORDS = [
  'machine', 'presse', 'scie', 'tour', 'fraiseuse', 'ponceuse', 'meuleuse',
  'compresseur', 'chariot elevateur', 'nacelle', 'echafaudage', 'grue',
  'treuil', 'palan', 'pont roulant', 'centrifugeuse', 'autoclave',
  'four industriel', 'chaudiere', 'generateur', 'transformateur',
  'robot', 'convoyeur', 'broyeur', 'concasseur', 'malaxeur',
  'laser', 'rayon x', 'source radioactive',
];

export function createTriggerService() {
  const triggers = new Map<string, StoredTrigger>();

  // BUSINESS RULE [CDC-2.4]: Pas de doublons — meme source ne cree pas 2 triggers identiques
  function isDuplicate(tenantId: string, type: DuerpUpdateTriggerType, sourceEntityId?: string): boolean {
    for (const t of triggers.values()) {
      if (
        t.tenantId === tenantId &&
        t.type === type &&
        !t.acknowledged &&
        sourceEntityId &&
        t.sourceEntityId === sourceEntityId
      ) {
        return true;
      }
    }
    return false;
  }

  function createTrigger(tenantId: string, input: TriggerCreateInput): StoredTrigger | null {
    if (isDuplicate(tenantId, input.type, input.sourceEntityId)) {
      return null; // No duplicate
    }

    const trigger: StoredTrigger = {
      id: crypto.randomUUID(),
      tenantId,
      type: input.type,
      detectedAt: new Date(),
      sourceModule: input.sourceModule,
      sourceEntityId: input.sourceEntityId ?? null,
      description: input.description,
      severity: input.severity,
      acknowledged: false,
      resultingUpdateId: null,
      resolvedAt: null,
      resolvedBy: null,
      duerpVersionBefore: null,
      duerpVersionAfter: null,
    };

    triggers.set(trigger.id, trigger);
    return trigger;
  }

  function getUnresolved(tenantId: string): StoredTrigger[] {
    return [...triggers.values()]
      .filter((t) => t.tenantId === tenantId && !t.acknowledged)
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  function getHistory(tenantId: string): StoredTrigger[] {
    return [...triggers.values()]
      .filter((t) => t.tenantId === tenantId)
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  function resolve(
    triggerId: string,
    tenantId: string,
    resolvedBy: string,
    duerpVersionAfter?: number,
  ): StoredTrigger | null {
    const trigger = triggers.get(triggerId);
    if (!trigger || trigger.tenantId !== tenantId) return null;

    trigger.acknowledged = true;
    trigger.resolvedAt = new Date();
    trigger.resolvedBy = resolvedBy;
    if (duerpVersionAfter !== undefined) {
      trigger.duerpVersionAfter = duerpVersionAfter;
    }
    trigger.resultingUpdateId = duerpVersionAfter ? `duerp-v${duerpVersionAfter}` : null;
    return trigger;
  }

  // BUSINESS RULE [CDC-2.4]: Detection automatique de produit chimique dans un achat
  function detectChemicalFromPurchase(
    tenantId: string,
    purchaseId: string,
    purchaseDescription: string,
  ): StoredTrigger | null {
    const lowerDesc = purchaseDescription.toLowerCase();
    const found = CHEMICAL_KEYWORDS.some((kw) => lowerDesc.includes(kw));
    if (!found) return null;

    return createTrigger(tenantId, {
      type: 'new_chemical_product',
      sourceModule: 'purchase',
      sourceEntityId: purchaseId,
      description: `Nouveau produit chimique detecte dans l'achat : "${purchaseDescription.slice(0, 100)}"`,
      severity: 'warning',
    });
  }

  // BUSINESS RULE [CDC-2.4]: Detection automatique d'equipement dangereux dans un achat
  function detectEquipmentFromPurchase(
    tenantId: string,
    purchaseId: string,
    purchaseDescription: string,
  ): StoredTrigger | null {
    const lowerDesc = purchaseDescription.toLowerCase();
    const found = EQUIPMENT_KEYWORDS.some((kw) => lowerDesc.includes(kw));
    if (!found) return null;

    return createTrigger(tenantId, {
      type: 'new_equipment',
      sourceModule: 'purchase',
      sourceEntityId: purchaseId,
      description: `Nouvel equipement detecte dans l'achat : "${purchaseDescription.slice(0, 100)}"`,
      severity: 'info',
    });
  }

  // BUSINESS RULE [CDC-2.4]: Trigger annuel — DUERP > 365 jours
  function checkAnnualReview(
    tenantId: string,
    lastUpdateDate: Date,
    employeeCount: number,
  ): StoredTrigger | null {
    if (employeeCount < 11) return null; // Only for >= 11 employees

    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdateDate.getTime()) / 86400000);

    if (daysSinceUpdate <= 365) return null;

    return createTrigger(tenantId, {
      type: 'annual_deadline',
      sourceModule: 'system',
      description: `DUERP non mis a jour depuis ${daysSinceUpdate} jours (obligation annuelle pour >= 11 salaries)`,
      severity: 'critical',
    });
  }

  // BUSINESS RULE [CDC-2.4]: Trigger accident du travail
  function reportWorkplaceAccident(
    tenantId: string,
    accidentDescription: string,
  ): StoredTrigger | null {
    return createTrigger(tenantId, {
      type: 'accident_travail',
      sourceModule: 'duerp',
      description: `Accident du travail signale : "${accidentDescription.slice(0, 200)}" — mise a jour DUERP obligatoire`,
      severity: 'critical',
    });
  }

  // BUSINESS RULE [CDC-2.4]: Statut de conformite
  function getUpdateStatus(tenantId: string, lastUpdateDate: Date | null, employeeCount: number): {
    status: 'up_to_date' | 'update_recommended' | 'update_required';
    label: string;
    unresolvedCount: number;
    criticalCount: number;
    lastUpdateDaysAgo: number | null;
  } {
    const unresolved = getUnresolved(tenantId);
    const criticalCount = unresolved.filter((t) => t.severity === 'critical').length;
    const lastUpdateDaysAgo = lastUpdateDate
      ? Math.floor((new Date().getTime() - lastUpdateDate.getTime()) / 86400000)
      : null;

    if (criticalCount > 0) {
      return {
        status: 'update_required',
        label: `${criticalCount} alerte(s) critique(s) — mise a jour obligatoire`,
        unresolvedCount: unresolved.length,
        criticalCount,
        lastUpdateDaysAgo,
      };
    }

    if (unresolved.length > 0) {
      return {
        status: 'update_recommended',
        label: `${unresolved.length} declencheur(s) en attente`,
        unresolvedCount: unresolved.length,
        criticalCount: 0,
        lastUpdateDaysAgo,
      };
    }

    return {
      status: 'up_to_date',
      label: 'DUERP a jour',
      unresolvedCount: 0,
      criticalCount: 0,
      lastUpdateDaysAgo,
    };
  }

  return {
    createTrigger,
    getUnresolved,
    getHistory,
    resolve,
    detectChemicalFromPurchase,
    detectEquipmentFromPurchase,
    checkAnnualReview,
    reportWorkplaceAccident,
    getUpdateStatus,
  };
}

export type TriggerService = ReturnType<typeof createTriggerService>;
