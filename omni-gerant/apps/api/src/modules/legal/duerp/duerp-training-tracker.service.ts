// BUSINESS RULE [CDC-2.4]: E11 — Suivi des formations obligatoires
// Arts. L4141-1 a L4141-4, R4141-1 a R4141-21 du Code du travail

import { MANDATORY_TRAININGS, getMandatoryTrainingsForSector, type MandatoryTraining } from './mandatory-training.js';

// ── Extended trainings for new sectors (E7) ─────────────────────

const EXTENDED_TRAININGS: MandatoryTraining[] = [
  // Agriculture
  { id: 'conduite-tracteur', name: 'Formation conduite tracteur', description: 'Conduite securisee de tracteur agricole', sectors: ['elevage-bovin', 'elevage-porcin', 'cereales', 'viticulture', 'maraichage', 'paysagiste'], frequency: 'Initiale', duration: '14-21h', legalBasis: 'Art. R4323-55', certifyingBody: 'CFPPA', validityYears: null },
  { id: 'espace-confine', name: 'Intervention en espace confine (CATEC)', description: 'Travail en espace confine (cuves, silos, fosses)', sectors: ['assainissement', 'nettoyage-industriel', 'elevage-porcin', 'viticulture', 'brasserie-artisanale'], frequency: 'Initiale + recyclage tous les 3 ans', duration: '14h', legalBasis: 'Art. R4222-1', certifyingBody: 'INRS', validityYears: 3 },
  { id: 'atex', name: 'Formation ATEX', description: 'Risque d\'explosion en atmosphere explosive', sectors: ['cereales', 'meunerie', 'boulangerie', 'station-service', 'imprimerie'], frequency: 'Initiale + recyclage tous les 3 ans', duration: '7h', legalBasis: 'Decret 2002-1553', certifyingBody: null, validityYears: 3 },
  // Transport
  { id: 'fimo-marchandises', name: 'FIMO marchandises', description: 'Formation initiale minimale obligatoire transport marchandises', sectors: ['transport-routier-marchandises', 'transport-frigorifique', 'demenagement'], frequency: 'Initiale + FCO tous les 5 ans', duration: '140h initiale, 35h FCO', legalBasis: 'Decret 2007-1340', certifyingBody: 'Organisme agree', validityYears: 5 },
  { id: 'fimo-voyageurs', name: 'FIMO voyageurs', description: 'Formation initiale minimale obligatoire transport voyageurs', sectors: ['transport-routier-voyageurs'], frequency: 'Initiale + FCO tous les 5 ans', duration: '140h initiale, 35h FCO', legalBasis: 'Decret 2007-1340', certifyingBody: 'Organisme agree', validityYears: 5 },
  { id: 'adr-tmd', name: 'ADR / Transport matieres dangereuses', description: 'Formation transport de matieres dangereuses', sectors: ['transport-routier-marchandises', 'collecte-dechets'], frequency: 'Initiale + recyclage tous les 5 ans', duration: '18h base', legalBasis: 'Accord ADR', certifyingBody: 'CIFMD', validityYears: 5 },
  // Proprete
  { id: 'haute-pression', name: 'Utilisation nettoyeur haute pression', description: 'Formation securite haute pression industrielle', sectors: ['nettoyage-industriel', 'nettoyage-vitrerie', 'assainissement'], frequency: 'Initiale', duration: '7h', legalBasis: 'Art. R4323-1', certifyingBody: null, validityYears: null },
  // Beaute
  { id: 'hygiene-tatouage', name: 'Hygiene et salubrite (tatouage/piercing)', description: 'Formation obligatoire 21h pour les tatoueurs et perceurs', sectors: ['tatouage-piercing'], frequency: 'Initiale obligatoire', duration: '21h', legalBasis: 'Arrete 12/12/2008', certifyingBody: 'ARS', validityYears: null },
  // Securite
  { id: 'cqp-securite', name: 'CQP/TFP Agent de prevention et securite', description: 'Titre requis pour exercer dans la securite privee', sectors: ['agent-securite', 'gardiennage', 'agent-cynophile'], frequency: 'Initiale + MAC tous les 5 ans', duration: '175h initiale', legalBasis: 'Livre VI CSI', certifyingBody: 'CNAPS', validityYears: 5 },
  { id: 'ssiap1', name: 'SSIAP 1 (Service securite incendie)', description: 'Formation incendie obligatoire pour agents de securite en ERP/IGH', sectors: ['agent-securite', 'hotel'], frequency: 'Initiale + recyclage tous les 3 ans', duration: '70h', legalBasis: 'Arrete 02/05/2005', certifyingBody: 'Prefecture', validityYears: 3 },
  // Education
  { id: 'ppms', name: 'Formation PPMS (Plan de mise en surete)', description: 'Formation plan de mise en surete dans les etablissements scolaires', sectors: ['ecole-maternelle-primaire', 'college-lycee', 'formation-professionnelle', 'formation-adultes'], frequency: 'Exercice annuel', duration: '2h (exercice)', legalBasis: 'Circulaire 2015-205', certifyingBody: null, validityYears: 1 },
  // Sport
  { id: 'bnssa', name: 'BNSSA (Brevet national securite sauvetage aquatique)', description: 'Brevet obligatoire pour la surveillance des piscines et baignades', sectors: ['piscine-centre-aquatique', 'camping'], frequency: 'Initiale + recyclage tous les 5 ans', duration: 'Variable', legalBasis: 'Art. D322-11', certifyingBody: 'SDIS/Prefet', validityYears: 5 },
  { id: 'dva-secours-avalanche', name: 'DVA / Secours avalanche', description: 'Formation detection victimes avalanche et secours en montagne', sectors: ['moniteur-ski'], frequency: 'Initiale + recyclage annuel', duration: '7h', legalBasis: 'Art. L212-1', certifyingBody: 'ESF/ENSA', validityYears: 1 },
  // Pompiers
  { id: 'fiae', name: 'Formation initiale sapeur-pompier (FIA)', description: 'Formation initiale d\'application engagement', sectors: ['sapeurs-pompiers'], frequency: 'Initiale', duration: 'Variable (300-600h)', legalBasis: 'CGCT + GNR', certifyingBody: 'SDIS', validityYears: null },
  // Collectivites
  { id: 'accueil-public', name: 'Accueil du public en situation difficile', description: 'Gestion de l\'accueil du public agressif ou en detresse', sectors: ['mairie-administration', 'banque', 'pharmacie'], frequency: 'Recommande tous les 3 ans', duration: '14h', legalBasis: 'Circulaire FP 2017', certifyingBody: null, validityYears: 3 },
];

// Merge all trainings
export const ALL_TRAININGS: MandatoryTraining[] = [
  ...MANDATORY_TRAININGS,
  ...EXTENDED_TRAININGS,
];

// ── Training record tracking ──────────────────────────────────

export interface TrainingRecord {
  id: string;
  tenantId: string;
  employeeName: string;
  trainingId: string;
  completedAt: Date;
  expiresAt: Date | null;
  certificate: string | null;
  provider: string | null;
}

export interface ExpiringTraining {
  record: TrainingRecord;
  training: MandatoryTraining;
  daysUntilExpiry: number;
  status: 'valid' | 'expiring_soon' | 'expired';
}

export function createTrainingTrackerService() {
  const records = new Map<string, TrainingRecord>();

  function addRecord(
    tenantId: string,
    employeeName: string,
    trainingId: string,
    completedAt: Date,
    certificate?: string,
    provider?: string,
  ): TrainingRecord {
    const training = ALL_TRAININGS.find((t) => t.id === trainingId);
    let expiresAt: Date | null = null;
    if (training?.validityYears) {
      expiresAt = new Date(completedAt);
      expiresAt.setFullYear(expiresAt.getFullYear() + training.validityYears);
    }

    const record: TrainingRecord = {
      id: crypto.randomUUID(),
      tenantId,
      employeeName,
      trainingId,
      completedAt,
      expiresAt,
      certificate: certificate ?? null,
      provider: provider ?? null,
    };
    records.set(record.id, record);
    return record;
  }

  function getRecordsByTenant(tenantId: string): TrainingRecord[] {
    return [...records.values()].filter((r) => r.tenantId === tenantId);
  }

  function getRecordsByEmployee(tenantId: string, employeeName: string): TrainingRecord[] {
    return [...records.values()].filter(
      (r) => r.tenantId === tenantId && r.employeeName === employeeName,
    );
  }

  // BUSINESS RULE [CDC-2.4]: Formations requises basees sur le code NAF
  function getRequiredTrainings(metierSlug: string): MandatoryTraining[] {
    return ALL_TRAININGS.filter(
      (t) => t.sectors.includes('*') || t.sectors.includes(metierSlug),
    );
  }

  // BUSINESS RULE [CDC-2.4]: Alertes quand une formation expire (M-2, M-1, J-7)
  function getExpiringTrainings(tenantId: string, withinDays: number = 90): ExpiringTraining[] {
    const now = new Date();
    const results: ExpiringTraining[] = [];

    for (const record of records.values()) {
      if (record.tenantId !== tenantId || !record.expiresAt) continue;

      const daysUntilExpiry = Math.floor((record.expiresAt.getTime() - now.getTime()) / 86400000);
      if (daysUntilExpiry > withinDays) continue;

      const training = ALL_TRAININGS.find((t) => t.id === record.trainingId);
      if (!training) continue;

      let status: ExpiringTraining['status'] = 'valid';
      if (daysUntilExpiry < 0) status = 'expired';
      else if (daysUntilExpiry <= 60) status = 'expiring_soon';

      results.push({ record, training, daysUntilExpiry, status });
    }

    return results.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }

  // BUSINESS RULE [CDC-2.4]: Matrice formations/employes
  function getTrainingMatrix(tenantId: string, metierSlug: string): {
    requiredTrainings: MandatoryTraining[];
    employees: Array<{
      name: string;
      trainings: Array<{
        trainingId: string;
        status: 'ok' | 'expiring' | 'expired' | 'missing';
        expiresAt: Date | null;
      }>;
    }>;
  } {
    const required = getRequiredTrainings(metierSlug);
    const tenantRecords = getRecordsByTenant(tenantId);
    const now = new Date();

    // Get unique employee names
    const employeeNames = [...new Set(tenantRecords.map((r) => r.employeeName))];

    const employees = employeeNames.map((name) => {
      const empRecords = tenantRecords.filter((r) => r.employeeName === name);
      const trainings = required.map((t) => {
        const record = empRecords
          .filter((r) => r.trainingId === t.id)
          .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0];

        if (!record) return { trainingId: t.id, status: 'missing' as const, expiresAt: null };
        if (!record.expiresAt) return { trainingId: t.id, status: 'ok' as const, expiresAt: null };

        const daysUntilExpiry = Math.floor((record.expiresAt.getTime() - now.getTime()) / 86400000);
        if (daysUntilExpiry < 0) return { trainingId: t.id, status: 'expired' as const, expiresAt: record.expiresAt };
        if (daysUntilExpiry <= 60) return { trainingId: t.id, status: 'expiring' as const, expiresAt: record.expiresAt };
        return { trainingId: t.id, status: 'ok' as const, expiresAt: record.expiresAt };
      });

      return { name, trainings };
    });

    return { requiredTrainings: required, employees };
  }

  return {
    addRecord,
    getRecordsByTenant,
    getRecordsByEmployee,
    getRequiredTrainings,
    getExpiringTrainings,
    getTrainingMatrix,
  };
}

export type TrainingTrackerService = ReturnType<typeof createTrainingTrackerService>;
