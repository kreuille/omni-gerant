import { describe, it, expect } from 'vitest';
import {
  METIER_RISK_DATABASE, UNIVERSAL_RISKS,
  findMetierByNaf, findMetierBySlug, getRisksForMetier, getRisksForNaf,
  calculateRiskScore, getRiskLevel, getRiskLevelLabel,
} from '../risk-database-v2.js';
import { createActionPlanService } from '../action-plan.js';
import { isPapripactRequired, createPapripactService } from '../papripact.js';
import { OCCUPATIONAL_DISEASE_TABLES, getApplicableDiseaseTables } from '../occupational-diseases.js';
import { MANDATORY_TRAININGS, getMandatoryTrainingsForSector } from '../mandatory-training.js';
import { PPE_DATABASE, getPPEForRisk, getPPEForSector } from '../ppe-database.js';
import {
  getUpdateFrequency, calculateNextMandatoryDate, generateReminders,
  getDuerpConformityStatus, isDepotDematerialiseRequired, DUERP_PENALTIES,
  DUERP_LEGAL_REFERENCES, SECTOR_LEGAL_REFERENCES,
  type DuerpUpdateSchedule,
} from '../duerp-update-engine.js';
import { WORK_UNIT_TEMPLATES, getWorkUnitTemplates, createEstablishmentWorkUnit } from '../work-units-database.js';

// ═══════════════════════════════════════════════════════════════════
// 1. Base de risques V2
// ═══════════════════════════════════════════════════════════════════

describe('Base de risques V2', () => {
  it('should have at least 8 metier profiles', () => {
    expect(METIER_RISK_DATABASE.length).toBeGreaterThanOrEqual(8);
  });

  it('should have 6 universal risks', () => {
    expect(UNIVERSAL_RISKS.length).toBe(6);
  });

  it.each(METIER_RISK_DATABASE.map((m) => [m.metierSlug, m] as const))(
    '%s should have 6-13 specific risks',
    (_slug, profile) => {
      expect(profile.risks.length).toBeGreaterThanOrEqual(6);
      expect(profile.risks.length).toBeLessThanOrEqual(13);
    },
  );

  it.each(METIER_RISK_DATABASE.map((m) => [m.metierSlug, m] as const))(
    '%s should have work units defined',
    (_slug, profile) => {
      expect(profile.workUnits.length).toBeGreaterThanOrEqual(4);
    },
  );

  it.each(METIER_RISK_DATABASE.map((m) => [m.metierSlug, m] as const))(
    '%s should have existing measures AND proposed actions for each risk',
    (_slug, profile) => {
      for (const risk of profile.risks) {
        expect(risk.existingMeasures.length, `${risk.name} should have existing measures`).toBeGreaterThanOrEqual(1);
        expect(risk.proposedActions.length, `${risk.name} should have proposed actions`).toBeGreaterThanOrEqual(2);
      }
    },
  );

  it.each(METIER_RISK_DATABASE.map((m) => [m.metierSlug, m] as const))(
    '%s risks should reference valid work unit IDs',
    (_slug, profile) => {
      const validIds = new Set(profile.workUnits.map((wu) => wu.id));
      for (const risk of profile.risks) {
        expect(
          risk.workUnitId === '*' || validIds.has(risk.workUnitId),
          `${risk.name} references invalid workUnitId: ${risk.workUnitId}`,
        ).toBe(true);
      }
    },
  );

  it('should find plombier by NAF code 43.22A (specific metier)', () => {
    const profile = findMetierByNaf('43.22A');
    expect(profile).toBeDefined();
    expect(profile!.metierSlug).toBe('plombier');
  });

  it('should find BTP general by NAF prefix 41', () => {
    const profile = findMetierByNaf('41.20A');
    expect(profile).toBeDefined();
    expect(profile!.metierSlug).toBe('btp-general');
  });

  it('should find restaurant by NAF code 56.10A', () => {
    const profile = findMetierByNaf('56.10A');
    expect(profile).toBeDefined();
    expect(profile!.metierSlug).toBe('restaurant');
  });

  it('should return universal risks + metier risks', () => {
    const risks = getRisksForMetier('btp-general');
    expect(risks.length).toBeGreaterThan(UNIVERSAL_RISKS.length);
    const hasUniversal = UNIVERSAL_RISKS.every((ur) => risks.some((r) => r.id === ur.id));
    expect(hasUniversal).toBe(true);
  });

  it('should return only universal risks for unknown metier', () => {
    const risks = getRisksForMetier('unknown-metier');
    expect(risks.length).toBe(UNIVERSAL_RISKS.length);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. Matrice 4x4
// ═══════════════════════════════════════════════════════════════════

describe('Matrice 4x4', () => {
  it('should calculate score as gravity x frequency', () => {
    expect(calculateRiskScore(1, 1)).toBe(1);
    expect(calculateRiskScore(4, 4)).toBe(16);
    expect(calculateRiskScore(3, 2)).toBe(6);
  });

  it('should categorize risk levels correctly', () => {
    expect(getRiskLevel(1)).toBe('low');
    expect(getRiskLevel(4)).toBe('low');
    expect(getRiskLevel(5)).toBe('medium');
    expect(getRiskLevel(8)).toBe('medium');
    expect(getRiskLevel(9)).toBe('high');
    expect(getRiskLevel(12)).toBe('high');
    expect(getRiskLevel(13)).toBe('critical');
    expect(getRiskLevel(16)).toBe('critical');
  });

  it('should have labels for all levels', () => {
    expect(getRiskLevelLabel('low')).toBe('Faible');
    expect(getRiskLevelLabel('medium')).toBe('Moyen');
    expect(getRiskLevelLabel('high')).toBe('Eleve');
    expect(getRiskLevelLabel('critical')).toBe('Critique');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. Plan d'actions
// ═══════════════════════════════════════════════════════════════════

describe('Plan d\'actions', () => {
  it('should create and retrieve actions', () => {
    const svc = createActionPlanService();
    const action = svc.addAction('duerp-1', {
      duerpId: 'duerp-1',
      riskId: 'btp-chute-hauteur',
      description: 'Installer garde-corps',
      responsibleName: 'Jean Dupont',
      responsibleRole: 'Chef de chantier',
      deadline: '2025-06-30T00:00:00.000Z',
      budgetCents: 500000,
      status: 'planned',
      progressIndicator: null,
      completedAt: null,
      evidence: null,
    });

    expect(action.id).toBeDefined();
    const actions = svc.getActionsByDuerp('duerp-1');
    expect(actions.length).toBe(1);
  });

  it('should update action status', () => {
    const svc = createActionPlanService();
    const action = svc.addAction('duerp-1', {
      duerpId: 'duerp-1', riskId: 'r1', description: 'Test',
      responsibleName: 'A', responsibleRole: 'B', deadline: '2025-12-31T00:00:00.000Z',
      budgetCents: 0, status: 'planned', progressIndicator: null, completedAt: null, evidence: null,
    });

    const updated = svc.updateAction(action.id, { status: 'completed' });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('completed');
    expect(updated!.completedAt).toBeDefined();
  });

  it('should calculate summary correctly', () => {
    const svc = createActionPlanService();
    svc.addAction('d1', { duerpId: 'd1', riskId: 'r1', description: 'A', responsibleName: 'X', responsibleRole: 'Y', deadline: '2025-12-31T00:00:00.000Z', budgetCents: 100000, status: 'planned', progressIndicator: null, completedAt: null, evidence: null });
    svc.addAction('d1', { duerpId: 'd1', riskId: 'r2', description: 'B', responsibleName: 'X', responsibleRole: 'Y', deadline: '2025-12-31T00:00:00.000Z', budgetCents: 200000, status: 'completed', progressIndicator: null, completedAt: '2025-01-01T00:00:00.000Z', evidence: null });

    const summary = svc.getSummary('d1');
    expect(summary.totalActions).toBe(2);
    expect(summary.planned).toBe(1);
    expect(summary.completed).toBe(1);
    expect(summary.totalBudgetCents).toBe(300000);
    expect(summary.completionRate).toBe(50);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. PAPRIPACT
// ═══════════════════════════════════════════════════════════════════

describe('PAPRIPACT', () => {
  it('should be required for 50+ employees', () => {
    expect(isPapripactRequired(50)).toBe(true);
    expect(isPapripactRequired(100)).toBe(true);
    expect(isPapripactRequired(49)).toBe(false);
    expect(isPapripactRequired(10)).toBe(false);
  });

  it('should generate PAPRIPACT from DUERP', () => {
    const svc = createPapripactService();
    const papripact = svc.generate('duerp-1', 'tenant-1', 2025, [
      { priority: 1, riskReference: 'r1', actionDescription: 'Action 1', responsibleName: 'A', startDate: '2025-01-01', endDate: '2025-06-30', budgetCents: 500000, successIndicator: 'Reduction accidents', status: 'planned' },
    ]);

    expect(papripact.id).toBeDefined();
    expect(papripact.actions.length).toBe(1);
    expect(papripact.totalBudgetCents).toBe(500000);
  });

  it('should record CSE consultation', () => {
    const svc = createPapripactService();
    const papripact = svc.generate('duerp-1', 'tenant-1', 2025, []);
    const updated = svc.recordCseConsultation(papripact.id, '2025-03-15', 'favorable');
    expect(updated).not.toBeNull();
    expect(updated!.cseAvisRendu).toBe('favorable');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. Conservation 40 ans
// ═══════════════════════════════════════════════════════════════════

describe('Conservation 40 ans et depot dematerialise', () => {
  it('should require depot for all enterprises from 2026', () => {
    expect(isDepotDematerialiseRequired(5, 2026)).toBe(true);
    expect(isDepotDematerialiseRequired(1, 2026)).toBe(true);
  });

  it('should require depot for 50+ from 2025', () => {
    expect(isDepotDematerialiseRequired(50, 2025)).toBe(true);
    expect(isDepotDematerialiseRequired(49, 2025)).toBe(false);
  });

  it('should require depot for 150+ from 2024', () => {
    expect(isDepotDematerialiseRequired(150, 2024)).toBe(true);
    expect(isDepotDematerialiseRequired(149, 2024)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. Lookup SIRET / Auto-fill (tested in existing test files)
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// 9. Generation UT par metier
// ═══════════════════════════════════════════════════════════════════

describe('Generation unites de travail', () => {
  it.each(Object.keys(WORK_UNIT_TEMPLATES))(
    '%s should have at least 4 work unit templates',
    (metierSlug) => {
      const templates = getWorkUnitTemplates(metierSlug);
      expect(templates.length).toBeGreaterThanOrEqual(4);
    },
  );

  it('should generate UT from Pappers establishment', () => {
    const ut = createEstablishmentWorkUnit({
      siret: '12345678900028',
      nom: 'Succursale Paris',
      adresse: '10 rue de la Paix, 75001 Paris',
    });
    expect(ut.name).toBe('Succursale Paris');
    expect(ut.sourceType).toBe('pappers_establishment');
  });

  it('should return empty for unknown metier', () => {
    const templates = getWorkUnitTemplates('unknown');
    expect(templates.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. Detection metier depuis NAF
// ═══════════════════════════════════════════════════════════════════

describe('Detection metier depuis NAF', () => {
  const testCases = [
    ['43.22A', 'plombier'],
    ['43.21A', 'electricien'],
    ['56.10A', 'restaurant'],
    ['96.02A', 'coiffure'],
    ['47.11F', 'commerce'],
    ['10.71C', 'boulangerie'],
    ['45.20A', 'garage-auto'],
    ['88.10A', 'aide-domicile'],
    ['62.01Z', 'bureau'],
    ['47.73Z', 'pharmacie'],
  ] as const;

  it.each(testCases)('NAF %s should map to metier %s', (naf, expectedSlug) => {
    const profile = findMetierByNaf(naf);
    expect(profile).toBeDefined();
    expect(profile!.metierSlug).toBe(expectedSlug);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 11. References legales
// ═══════════════════════════════════════════════════════════════════

describe('References legales', () => {
  it('should have general DUERP legal references', () => {
    expect(DUERP_LEGAL_REFERENCES.length).toBeGreaterThanOrEqual(4);
  });

  it('should have sector-specific references', () => {
    expect(SECTOR_LEGAL_REFERENCES['btp-general']).toBeDefined();
    expect(SECTOR_LEGAL_REFERENCES['btp-general']!.length).toBeGreaterThan(0);
    expect(SECTOR_LEGAL_REFERENCES['restaurant']).toBeDefined();
    expect(SECTOR_LEGAL_REFERENCES['coiffure']).toBeDefined();
  });

  it('should include PPSPS reference for BTP', () => {
    const btpRefs = SECTOR_LEGAL_REFERENCES['btp-general']!;
    expect(btpRefs.some((r) => r.includes('PPSPS'))).toBe(true);
  });

  it('should include HACCP reference for restaurant', () => {
    const restRefs = SECTOR_LEGAL_REFERENCES['restaurant']!;
    expect(restRefs.some((r) => r.includes('HACCP'))).toBe(true);
  });

  it.each(METIER_RISK_DATABASE.map((m) => [m.metierSlug, m] as const))(
    '%s should have legal references in profile',
    (_slug, profile) => {
      expect(profile.legalReferences.length).toBeGreaterThan(0);
    },
  );
});

// ═══════════════════════════════════════════════════════════════════
// 12. Alertes conformite
// ═══════════════════════════════════════════════════════════════════

describe('Alertes conformite', () => {
  it('should require annual update for 11+ employees', () => {
    expect(getUpdateFrequency(11)).toBe('annual');
    expect(getUpdateFrequency(50)).toBe('annual');
  });

  it('should require on_change for < 11 employees', () => {
    expect(getUpdateFrequency(10)).toBe('on_change');
    expect(getUpdateFrequency(1)).toBe('on_change');
  });

  it('should calculate next mandatory date', () => {
    const lastUpdate = new Date('2024-01-15');
    const next = calculateNextMandatoryDate(lastUpdate, 15);
    expect(next.getFullYear()).toBe(2025);
    expect(next.getMonth()).toBe(0); // January
    expect(next.getDate()).toBe(15);
  });

  it('should detect overdue DUERP', () => {
    const schedule: DuerpUpdateSchedule = {
      duerpId: 'd1', tenantId: 't1',
      lastUpdateDate: new Date('2023-01-01'),
      nextMandatoryDate: new Date('2024-01-01'),
      updateFrequency: 'annual', effectif: 15,
      reminders: [], triggers: [],
      cseRequired: true, papripactRequired: false,
    };
    const status = getDuerpConformityStatus(schedule);
    expect(status.status).toBe('overdue');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 13. Maladies professionnelles
// ═══════════════════════════════════════════════════════════════════

describe('Maladies professionnelles', () => {
  it('should have at least 8 disease tables', () => {
    expect(OCCUPATIONAL_DISEASE_TABLES.length).toBeGreaterThanOrEqual(8);
  });

  it('should detect RG 66 for boulangerie (farine)', () => {
    const tables = getApplicableDiseaseTables(['chimique', 'poussieres'], 'boulangerie');
    const rg66 = tables.find((t) => t.tableNumber === 'RG 66');
    expect(rg66).toBeDefined();
  });

  it('should detect RG 65 for coiffure (eczema)', () => {
    const tables = getApplicableDiseaseTables(['chimique', 'dermatose'], 'coiffure');
    const rg65 = tables.find((t) => t.tableNumber === 'RG 65');
    expect(rg65).toBeDefined();
  });

  it('should detect RG 42 for BTP (surdite)', () => {
    const tables = getApplicableDiseaseTables(['bruit'], 'btp-general');
    const rg42 = tables.find((t) => t.tableNumber === 'RG 42');
    expect(rg42).toBeDefined();
  });

  it('should detect RG 98 for aide domicile (lombalgies)', () => {
    const tables = getApplicableDiseaseTables(['manutention'], 'aide-domicile');
    const rg98 = tables.find((t) => t.tableNumber === 'RG 98');
    expect(rg98).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// 15. Formations obligatoires
// ═══════════════════════════════════════════════════════════════════

describe('Formations obligatoires', () => {
  it('should have at least 12 mandatory trainings', () => {
    expect(MANDATORY_TRAININGS.length).toBeGreaterThanOrEqual(12);
  });

  it('should return SST for all sectors', () => {
    const trainings = getMandatoryTrainingsForSector('btp-general');
    expect(trainings.some((t) => t.id === 'sst')).toBe(true);
  });

  it('should return HACCP for restaurant', () => {
    const trainings = getMandatoryTrainingsForSector('restaurant');
    expect(trainings.some((t) => t.id === 'haccp')).toBe(true);
  });

  it('should return CACES for BTP', () => {
    const trainings = getMandatoryTrainingsForSector('btp-general');
    expect(trainings.some((t) => t.id === 'caces')).toBe(true);
  });

  it('should return PRAP for aide domicile', () => {
    const trainings = getMandatoryTrainingsForSector('aide-domicile');
    expect(trainings.some((t) => t.id === 'prap')).toBe(true);
  });

  it('should return habilitation electrique for electricien', () => {
    const trainings = getMandatoryTrainingsForSector('electricien');
    expect(trainings.some((t) => t.id === 'habilitation-electrique')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 16. EPI par risque
// ═══════════════════════════════════════════════════════════════════

describe('EPI par risque', () => {
  it('should have at least 10 PPE entries', () => {
    expect(PPE_DATABASE.length).toBeGreaterThanOrEqual(10);
  });

  it('should find PPE for bruit', () => {
    const ppe = getPPEForRisk('bruit');
    expect(ppe.length).toBeGreaterThan(0);
    expect(ppe[0]!.norm).toContain('EN 352');
  });

  it('should find PPE for chimique', () => {
    const ppe = getPPEForRisk('chimique');
    expect(ppe.length).toBeGreaterThan(0);
  });

  it('should find PPE for BTP sector', () => {
    const ppe = getPPEForSector('btp-general');
    expect(ppe.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 19. Rappels automatiques
// ═══════════════════════════════════════════════════════════════════

describe('Rappels automatiques', () => {
  it('should generate 7 reminder types', () => {
    const nextDate = new Date('2025-06-15');
    const reminders = generateReminders(nextDate);
    expect(reminders.length).toBe(7);
    expect(reminders.map((r) => r.type)).toContain('J-60');
    expect(reminders.map((r) => r.type)).toContain('J-DAY');
    expect(reminders.map((r) => r.type)).toContain('J+30_OVERDUE');
  });

  it('should calculate correct reminder dates', () => {
    const nextDate = new Date('2025-06-15');
    const reminders = generateReminders(nextDate);
    const j30 = reminders.find((r) => r.type === 'J-30');
    expect(j30).toBeDefined();
    expect(j30!.scheduledDate.getMonth()).toBe(4); // May (0-indexed)
    expect(j30!.scheduledDate.getDate()).toBe(16);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 19b. Penalites et conformite
// ═══════════════════════════════════════════════════════════════════

describe('Penalites et conformite', () => {
  it('should define penalty amounts', () => {
    expect(DUERP_PENALTIES.absence.amount).toBe(150000);
    expect(DUERP_PENALTIES.recidive.amount).toBe(300000);
    expect(DUERP_PENALTIES.accident_sans_duerp.amount).toBe(375000);
  });
});
