import type { Result } from '@zenadmin/shared';
import { ok, err, appError } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';
import type { EnrichedSiretInfo } from '../../../lib/siret-lookup.js';
import { getRisksByNafCode, detectPurchaseRisks, type RiskTemplate } from './risk-database.js';
import { generateWorkUnits, type WorkUnit } from './work-units.generator.js';
import type { DuerpDocument } from './duerp.service.js';

// BUSINESS RULE [CDC-2.4]: Orchestrateur auto-fill DUERP — 3 couches de donnees
// Couche externe : Pappers/SIRENE (effectif, IDCC, etablissements)
// Couche interne : donnees tenant (profil, achats, assurances, equipe)
// Couche intelligence : deductions (NAF→risques, IDCC→risques branche, achats→risques)

export interface TenantProfile {
  id: string;
  name: string;
  siret: string | null;
  siren: string | null;
  naf_code: string | null;
  address: string | null;
  employee_count: number;
  dirigeant_name: string | null;
}

export interface PurchaseInfo {
  id: string;
  description: string;
  supplier_name: string | null;
  date: string;
}

export interface InsuranceInfo {
  id: string;
  type: string;
  provider: string;
  description: string | null;
}

export interface AutoFillResult {
  // Identification (etape 1)
  company_name: string;
  siret: string | null;
  siren: string | null;
  naf_code: string | null;
  naf_label: string | null;
  address: string | null;
  employee_count: number;
  evaluator_name: string | null;
  convention_collective: string | null;
  code_idcc: string | null;
  dirigeants: Array<{ nom: string; prenom: string; fonction: string }>;

  // Unites de travail (etape 2)
  work_units: WorkUnit[];

  // Risques pre-identifies (etape 3)
  risks: RiskTemplate[];
  risk_sources: RiskSource[];

  // Mesures existantes (etape 4)
  existing_insurances: InsuranceInfo[];
  purchase_risks: PurchaseRiskDetection[];

  // Metadata
  sources_used: string[];
  confidence_score: number; // 0-100
  previous_duerp_id: string | null;
}

export interface RiskSource {
  risk_id: string;
  source: 'naf' | 'idcc' | 'purchase' | 'insurance' | 'previous_duerp';
  label: string;
}

export interface PurchaseRiskDetection {
  purchase_description: string;
  detected_risks: string[];
  supplier: string | null;
}

// IDCC → risques supplementaires specifiques a la branche
// BUSINESS RULE [CDC-2.4]: Certaines conventions collectives imposent des risques specifiques
const IDCC_RISK_MAP: Record<string, RiskTemplate[]> = {
  '1596': [{ // Convention BTP ouvriers
    id: 'idcc-btp-amiante', category: 'Chimique', name: 'Exposition amiante (convention BTP)',
    description: 'Obligation de reperage amiante avant travaux selon convention BTP',
    default_gravity: 4, default_probability: 2,
    preventive_actions: ['Diagnostic amiante avant intervention', 'Formation SS3/SS4', 'Suivi medical renforce'],
  }],
  '1597': [{ // Convention BTP ETAM
    id: 'idcc-btp-ecran', category: 'Ergonomique', name: 'Travail sur ecran prolonge',
    description: 'Risques lies au travail administratif prolonge sur ecran (ETAM BTP)',
    default_gravity: 2, default_probability: 3,
    preventive_actions: ['Pause reguliere toutes les 2h', 'Ecran a hauteur des yeux', 'Siege ergonomique'],
  }],
  '3043': [{ // Convention propreté
    id: 'idcc-proprete-chimique', category: 'Chimique', name: 'Produits d\'entretien professionnels',
    description: 'Exposition aux produits chimiques de nettoyage professionnel',
    default_gravity: 3, default_probability: 3,
    preventive_actions: ['FDS a disposition', 'EPI adaptes (gants, masque)', 'Ventilation des locaux', 'Substitution produits dangereux'],
  }],
  '1501': [{ // Convention restauration
    id: 'idcc-resto-brulure', category: 'Thermique', name: 'Risque brulure (convention restauration)',
    description: 'Brulures liees a la manipulation d\'equipements chauds en cuisine',
    default_gravity: 3, default_probability: 3,
    preventive_actions: ['EPI cuisine (tablier, gants thermiques)', 'Signalisation surfaces chaudes', 'Protocole brulure affiche'],
  }],
};

// Insurance type → risque confirme
const INSURANCE_RISK_INDICATORS: Record<string, string> = {
  'rc_pro': 'Activite professionnelle avec risque de responsabilite civile',
  'decennale': 'Activite de construction/BTP confirmee',
  'multirisque': 'Local professionnel avec risques incendie/dommages',
  'auto_pro': 'Utilisation vehicule professionnel confirmee',
  'prevoyance': 'Emploi de salaries confirme',
  'cyber': 'Activite numerique avec risques informatiques',
};

export interface AutoFillDeps {
  lookupSiret: (siret: string) => Promise<Result<EnrichedSiretInfo, AppError>>;
  getTenantProfile: (tenantId: string) => Promise<TenantProfile | null>;
  getRecentPurchases: (tenantId: string, limit: number) => Promise<PurchaseInfo[]>;
  getInsurances: (tenantId: string) => Promise<InsuranceInfo[]>;
  getLatestDuerp: (tenantId: string) => Promise<DuerpDocument | null>;
}

export function createDuerpAutoFill(deps: AutoFillDeps) {
  return {
    async generateAutoFill(tenantId: string): Promise<Result<AutoFillResult, AppError>> {
      const sourcesUsed: string[] = [];
      let confidenceScore = 0;

      // === COUCHE INTERNE : Donnees tenant ===
      const tenant = await deps.getTenantProfile(tenantId);
      if (!tenant) {
        return err(appError('NOT_FOUND', 'Tenant profile not found'));
      }
      sourcesUsed.push('tenant_profile');
      confidenceScore += 10;

      let companyName = tenant.name;
      let siret = tenant.siret;
      let siren = tenant.siren;
      let nafCode = tenant.naf_code;
      let nafLabel: string | null = null;
      let address = tenant.address;
      let employeeCount = tenant.employee_count;
      let evaluatorName = tenant.dirigeant_name;
      let conventionCollective: string | null = null;
      let codeIdcc: string | null = null;
      let dirigeants: Array<{ nom: string; prenom: string; fonction: string }> = [];
      let etablissements: Array<{ siret: string; nom: string; adresse: string; is_active: boolean }> = [];

      // === COUCHE EXTERNE : Pappers/SIRENE ===
      if (siret) {
        const lookupResult = await deps.lookupSiret(siret);
        if (lookupResult.ok) {
          const info = lookupResult.value;
          sourcesUsed.push(`siret_${info.source}`);
          confidenceScore += info.source === 'pappers' ? 30 : info.source === 'sirene' ? 20 : 10;

          // Enrich with external data (priorite aux donnees externes plus fiables)
          if (info.company_name) companyName = info.company_name;
          siren = info.siren;
          if (info.naf_code) {
            nafCode = info.naf_code;
            nafLabel = info.naf_label || null;
          }
          if (info.address.line1) {
            address = [info.address.line1, info.address.zip_code, info.address.city]
              .filter(Boolean).join(', ');
          }
          if (info.effectif_reel !== null && info.effectif_reel > 0) {
            employeeCount = info.effectif_reel;
          }
          conventionCollective = info.convention_collective;
          codeIdcc = info.code_idcc;
          dirigeants = info.dirigeants;
          etablissements = info.etablissements;

          // Evaluateur = premier dirigeant si pas deja defini
          if (!evaluatorName && dirigeants.length > 0) {
            const d = dirigeants[0]!;
            evaluatorName = `${d.prenom} ${d.nom}`.trim();
          }
        }
      }

      // === COUCHE INTELLIGENCE : Deductions ===

      // 1. NAF → risques
      const allRisks: RiskTemplate[] = [];
      const riskSources: RiskSource[] = [];

      if (nafCode) {
        const nafProfile = getRisksByNafCode(nafCode);
        nafLabel = nafLabel || nafProfile.sector_name;
        for (const risk of nafProfile.risks) {
          allRisks.push(risk);
          riskSources.push({ risk_id: risk.id, source: 'naf', label: `Code NAF ${nafCode}` });
        }
        confidenceScore += 20;
      }

      // 2. IDCC → risques branche
      if (codeIdcc && IDCC_RISK_MAP[codeIdcc]) {
        for (const risk of IDCC_RISK_MAP[codeIdcc]!) {
          // Avoid duplicates
          if (!allRisks.some((r) => r.id === risk.id)) {
            allRisks.push(risk);
            riskSources.push({ risk_id: risk.id, source: 'idcc', label: `Convention ${codeIdcc}` });
          }
        }
        confidenceScore += 10;
      }

      // 3. Achats recents → risques supplementaires
      const purchases = await deps.getRecentPurchases(tenantId, 50);
      const purchaseRisks: PurchaseRiskDetection[] = [];

      if (purchases.length > 0) {
        sourcesUsed.push('purchases');
        for (const purchase of purchases) {
          const detected = detectPurchaseRisks(purchase.description);
          if (detected.length > 0) {
            purchaseRisks.push({
              purchase_description: purchase.description,
              detected_risks: detected,
              supplier: purchase.supplier_name,
            });
            // Add detected risks that aren't already present
            for (const riskName of detected) {
              if (!allRisks.some((r) => r.name === riskName)) {
                allRisks.push({
                  id: `purchase-${crypto.randomUUID().substring(0, 8)}`,
                  category: 'Achats',
                  name: riskName,
                  description: `Risque detecte dans l'achat: ${purchase.description}`,
                  default_gravity: 3,
                  default_probability: 2,
                  preventive_actions: ['Verifier les FDS', 'Former le personnel', 'EPI adaptes'],
                });
                riskSources.push({
                  risk_id: allRisks[allRisks.length - 1]!.id,
                  source: 'purchase',
                  label: `Achat: ${purchase.description.substring(0, 50)}`,
                });
              }
            }
          }
        }
        if (purchaseRisks.length > 0) confidenceScore += 10;
      }

      // 4. Assurances → confirmation metier
      const insurances = await deps.getInsurances(tenantId);
      if (insurances.length > 0) {
        sourcesUsed.push('insurances');
        for (const insurance of insurances) {
          const indicator = INSURANCE_RISK_INDICATORS[insurance.type];
          if (indicator) {
            riskSources.push({
              risk_id: `insurance-${insurance.type}`,
              source: 'insurance',
              label: indicator,
            });
          }
        }
        confidenceScore += 5;
      }

      // 5. DUERP precedent → pre-remplir risques personnalises
      const previousDuerp = await deps.getLatestDuerp(tenantId);
      let previousDuerpId: string | null = null;
      if (previousDuerp) {
        sourcesUsed.push('previous_duerp');
        previousDuerpId = previousDuerp.id;
        confidenceScore += 15;
        // Note: les risques du DUERP precedent seront presentes a l'etape 3 du wizard
        // pour que l'artisan puisse reprendre ses ajustements
      }

      // === GENERATION UNITES DE TRAVAIL ===
      const workUnits = generateWorkUnits(nafCode ?? '', etablissements);

      // Cap confidence at 100
      confidenceScore = Math.min(100, confidenceScore);

      return ok({
        company_name: companyName,
        siret,
        siren,
        naf_code: nafCode,
        naf_label: nafLabel,
        address,
        employee_count: employeeCount,
        evaluator_name: evaluatorName,
        convention_collective: conventionCollective,
        code_idcc: codeIdcc,
        dirigeants,
        work_units: workUnits,
        risks: allRisks,
        risk_sources: riskSources,
        existing_insurances: insurances,
        purchase_risks: purchaseRisks,
        sources_used: sourcesUsed,
        confidence_score: confidenceScore,
        previous_duerp_id: previousDuerpId,
      });
    },
  };
}
