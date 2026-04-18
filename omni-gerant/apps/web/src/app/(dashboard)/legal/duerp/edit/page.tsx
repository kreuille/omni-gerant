'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RiskMatrix } from '@/components/legal/risk-matrix';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-2.4]: Wizard DUERP 5 etapes avec auto-fill intelligent
// Etape 1: Identification (SIRET lookup + auto-fill)
// Etape 2: Unites de travail (auto-generees, modifiables)
// Etape 3: Evaluation des risques (pre-remplis NAF/IDCC, ajustables)
// Etape 4: Mesures de prevention (actions correctives par risque)
// Etape 5: Generation et signature (preview + sauvegarde)

type WorkUnitType = 'chantier' | 'atelier' | 'bureau' | 'vehicule' | 'stockage' | 'exterieur';

interface WorkUnit {
  id: string;
  name: string;
  type: WorkUnitType;
  description: string;
  source?: 'naf' | 'etablissement' | 'default';
  is_auto?: boolean;
}

interface RiskTemplate {
  id: string;
  category: string;
  name: string;
  description: string;
  default_gravity: number;
  default_probability: number;
  preventive_actions: string[];
}

interface WizardRisk {
  id: string;
  risk_id: string | null;
  category: string;
  name: string;
  description: string;
  gravity: number;
  probability: number;
  preventive_actions: string[];
  existing_measures: string;
  responsible: string;
  deadline: string;
  source?: string;
  is_auto?: boolean;
}

interface AutoFillResult {
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
  work_units: WorkUnit[];
  risks: RiskTemplate[];
  risk_sources: Array<{ risk_id: string; source: string; label: string }>;
  existing_insurances: Array<{ id: string; type: string; provider: string; description: string | null }>;
  purchase_risks: Array<{ purchase_description: string; detected_risks: string[]; supplier: string | null }>;
  sources_used: string[];
  confidence_score: number;
  previous_duerp_id: string | null;
}

const STEPS = [
  { id: 1, label: 'Identification', icon: '1' },
  { id: 2, label: 'Unites de travail', icon: '2' },
  { id: 3, label: 'Risques', icon: '3' },
  { id: 4, label: 'Prevention', icon: '4' },
  { id: 5, label: 'Generation', icon: '5' },
] as const;

const WORK_UNIT_TYPES: Array<{ value: WorkUnitType; label: string }> = [
  { value: 'chantier', label: 'Chantier' },
  { value: 'atelier', label: 'Atelier' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'vehicule', label: 'Vehicule' },
  { value: 'stockage', label: 'Stockage' },
  { value: 'exterieur', label: 'Exterieur / Site client' },
];

function calculateLevel(g: number, p: number): { score: number; label: string } {
  const score = g * p;
  if (score <= 3) return { score, label: 'faible' };
  if (score <= 6) return { score, label: 'modere' };
  if (score <= 9) return { score, label: 'eleve' };
  return { score, label: 'critique' };
}

function levelBadgeVariant(label: string): 'error' | 'default' | 'info' | 'success' | 'warning' {
  const map: Record<string, 'error' | 'default' | 'info' | 'success' | 'warning'> = {
    critique: 'error',
    eleve: 'warning',
    modere: 'info',
    faible: 'success',
  };
  return map[label] || 'default';
}

// BUSINESS RULE [CDC-2.4]: Pre-remplissage intelligent des mesures existantes
// Deduit les mesures courantes selon la categorie du risque
const DEFAULT_EXISTING_MEASURES: Record<string, string> = {
  'Chute': 'EPI fournis (casque, chaussures de securite). Verification periodique des equipements.',
  'Chimique': 'Fiches de Donnees de Securite (FDS) a disposition. EPI stockes sur site.',
  'Physique': 'Protections auditives mises a disposition. Mesures de bruit effectuees.',
  'Ergonomique': 'Sensibilisation gestes et postures effectuee. Aides a la manutention disponibles.',
  'Routier': 'Vehicules entretenus regulierement. Carnet de suivi a jour.',
  'Psychosocial': 'Entretiens individuels annuels. Droit a la deconnexion communique.',
  'Biologique': 'Gel hydroalcoolique disponible. Protocole sanitaire affiche.',
  'Incendie': 'Extincteurs verifies. Plan d\'evacuation affiche. Exercice annuel realise.',
  'Electrique': 'Habilitations electriques a jour. Verification annuelle des installations.',
  'Thermique': 'EPI thermiques disponibles. Signalisation des surfaces chaudes.',
  'Achats': 'Verification des FDS a reception. Stockage conforme des produits.',
};

// Echeance automatique selon le niveau de risque
function autoDeadline(gravity: number, probability: number): string {
  const score = gravity * probability;
  const now = new Date();
  if (score >= 12) {
    // Critique → 1 mois
    now.setMonth(now.getMonth() + 1);
  } else if (score >= 8) {
    // Eleve → 3 mois
    now.setMonth(now.getMonth() + 3);
  } else if (score >= 4) {
    // Modere → 6 mois
    now.setMonth(now.getMonth() + 6);
  } else {
    // Faible → 12 mois
    now.setMonth(now.getMonth() + 12);
  }
  return now.toISOString().split('T')[0]!;
}

function getDefaultMeasures(category: string): string {
  // Try exact match first, then partial match
  if (DEFAULT_EXISTING_MEASURES[category]) return DEFAULT_EXISTING_MEASURES[category];
  const key = Object.keys(DEFAULT_EXISTING_MEASURES).find(
    (k) => category.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? DEFAULT_EXISTING_MEASURES[key]! : '';
}

export default function EditDuerpPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [autoFillData, setAutoFillData] = useState<AutoFillResult | null>(null);

  // Step 1: Identification
  const [companyName, setCompanyName] = useState('');
  const [siret, setSiret] = useState('');
  const [nafCode, setNafCode] = useState('');
  const [nafLabel, setNafLabel] = useState('');
  const [address, setAddress] = useState('');
  const [employeeCount, setEmployeeCount] = useState(1);
  const [evaluator, setEvaluator] = useState('');
  const [conventionCollective, setConventionCollective] = useState('');
  const [codeIdcc, setCodeIdcc] = useState('');
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [sourcesUsed, setSourcesUsed] = useState<string[]>([]);

  // Step 2: Work units
  const [workUnits, setWorkUnits] = useState<WorkUnit[]>([]);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitType, setNewUnitType] = useState<WorkUnitType>('bureau');
  const [newUnitDesc, setNewUnitDesc] = useState('');

  // Step 3 & 4: Risks
  const [risks, setRisks] = useState<WizardRisk[]>([]);
  const [showAddRisk, setShowAddRisk] = useState(false);

  // Step 5
  const [notes, setNotes] = useState('');

  // Completion tracking per step
  const stepCompletion = [
    companyName.trim() !== '' && evaluator.trim() !== '',
    workUnits.length > 0,
    risks.length > 0,
    risks.length > 0 && risks.every((r) => r.preventive_actions.length > 0),
    true, // Generation step is always "ready"
  ];

  // Auto-fill: call API with SIRET
  const handleAutoFill = useCallback(async () => {
    setAutoFillLoading(true);
    try {
      const result = await api.post<AutoFillResult>('/api/legal/duerp/autofill', {
        siret: siret.replace(/\s/g, '').trim() || undefined,
        naf_code: nafCode.trim() || undefined,
        company_name: companyName.trim() || undefined,
        employee_count: employeeCount,
      });

      if (result.ok) {
        const data = result.value;
        setAutoFillData(data);
        // Populate step 1
        if (data.company_name) setCompanyName(data.company_name);
        if (data.siret && !siret.trim()) setSiret(data.siret);
        if (data.naf_code) setNafCode(data.naf_code);
        if (data.naf_label) setNafLabel(data.naf_label);
        if (data.address) setAddress(data.address);
        if (data.employee_count > 0) setEmployeeCount(data.employee_count);
        if (data.evaluator_name) setEvaluator(data.evaluator_name);
        if (data.convention_collective) setConventionCollective(data.convention_collective);
        if (data.code_idcc) setCodeIdcc(data.code_idcc);
        setConfidenceScore(data.confidence_score);
        setSourcesUsed(data.sources_used);

        // Populate step 2: work units
        if (data.work_units.length > 0) {
          setWorkUnits(data.work_units);
        }

        // Populate step 3: risks — responsible defaults to evaluator/dirigeant
        const defaultResponsible = data.evaluator_name
          || (data.dirigeants.length > 0 ? `${data.dirigeants[0]!.prenom} ${data.dirigeants[0]!.nom}`.trim() : '');

        if (data.risks.length > 0) {
          const wizardRisks: WizardRisk[] = data.risks.map((r) => ({
            id: crypto.randomUUID(),
            risk_id: r.id,
            category: r.category,
            name: r.name,
            description: r.description,
            gravity: r.default_gravity,
            probability: r.default_probability,
            preventive_actions: r.preventive_actions,
            existing_measures: getDefaultMeasures(r.category),
            responsible: defaultResponsible,
            deadline: autoDeadline(r.default_gravity, r.default_probability),
            source: data.risk_sources.find((s) => s.risk_id === r.id)?.source ?? 'naf',
            is_auto: true,
          }));
          setRisks(wizardRisks);
        }
      }
    } catch {
      // Auto-fill failed silently — user can fill manually
    } finally {
      setAutoFillLoading(false);
    }
  }, [siret, nafCode, companyName, employeeCount]);

  // Load risks by NAF code (fallback if auto-fill not used)
  const handleLoadNafRisks = async () => {
    if (!nafCode.trim()) return;
    setLoading(true);
    try {
      const result = await api.get<{
        naf_prefix: string;
        sector_name: string;
        risks: RiskTemplate[];
      }>(`/api/legal/duerp/risks/${encodeURIComponent(nafCode.trim())}`);

      if (result.ok) {
        setNafLabel(result.value.sector_name);
        const wizardRisks: WizardRisk[] = result.value.risks.map((r) => ({
          id: crypto.randomUUID(),
          risk_id: r.id,
          category: r.category,
          name: r.name,
          description: r.description,
          gravity: r.default_gravity,
          probability: r.default_probability,
          preventive_actions: r.preventive_actions,
          existing_measures: getDefaultMeasures(r.category),
          responsible: evaluator,
          deadline: autoDeadline(r.default_gravity, r.default_probability),
          source: 'naf',
          is_auto: true,
        }));
        setRisks(wizardRisks);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // Save DUERP
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        title: `DUERP - ${companyName}`,
        company_name: companyName,
        siret: siret.replace(/\s/g, '').trim() || undefined,
        naf_code: nafCode || undefined,
        naf_label: nafLabel || undefined,
        address: address || undefined,
        employee_count: employeeCount,
        evaluator_name: evaluator,
        convention_collective: conventionCollective || undefined,
        code_idcc: codeIdcc || undefined,
        work_units: workUnits.map((wu) => ({
          id: wu.id,
          name: wu.name,
          type: wu.type,
          description: wu.description,
        })),
        risks: risks.map((r) => ({
          risk_id: r.risk_id || undefined,
          category: r.category,
          name: r.name,
          description: r.description || undefined,
          gravity: r.gravity,
          probability: r.probability,
          preventive_actions: r.preventive_actions,
          existing_measures: r.existing_measures || undefined,
          responsible: r.responsible || undefined,
          deadline: r.deadline || undefined,
        })),
        notes: notes || undefined,
      };

      const result = await api.post('/api/legal/duerp', payload);
      if (result.ok) {
        router.push('/legal/duerp');
      } else {
        alert('Erreur lors de la sauvegarde du DUERP');
      }
    } catch {
      alert('Erreur reseau');
    } finally {
      setSaving(false);
    }
  };

  // Add work unit
  const handleAddWorkUnit = () => {
    if (!newUnitName.trim()) return;
    setWorkUnits((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: newUnitName.trim(),
        type: newUnitType,
        description: newUnitDesc.trim(),
        source: 'default' as const,
        is_auto: false,
      },
    ]);
    setNewUnitName('');
    setNewUnitDesc('');
    setShowAddUnit(false);
  };

  const handleRemoveWorkUnit = (id: string) => {
    setWorkUnits((prev) => prev.filter((wu) => wu.id !== id));
  };

  // Add manual risk
  const handleAddManualRisk = () => {
    setRisks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        risk_id: null,
        category: '',
        name: '',
        description: '',
        gravity: 2,
        probability: 2,
        preventive_actions: [],
        existing_measures: '',
        responsible: '',
        deadline: '',
        is_auto: false,
      },
    ]);
  };

  const handleRemoveRisk = (id: string) => {
    setRisks((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRisk = (id: string, field: keyof WizardRisk, value: unknown) => {
    setRisks((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  // Navigation
  const goNext = () => setCurrentStep((s) => Math.min(5, s + 1));
  const goPrev = () => setCurrentStep((s) => Math.max(1, s - 1));

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Nouveau DUERP</h1>
          <p className="text-sm text-gray-500 mt-1">
            Assistant de creation du Document Unique
          </p>
        </div>
        <a href="/legal/duerp">
          <Button variant="outline">Annuler</Button>
        </a>
      </div>

      {/* Step indicator */}
      <div className="flex items-center mb-8 gap-1">
        {STEPS.map((step, i) => {
          const isActive = step.id === currentStep;
          const isCompleted = stepCompletion[i];
          const isPast = step.id < currentStep;
          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full
                  ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : ''}
                  ${!isActive && isPast && isCompleted ? 'text-green-700 bg-green-50' : ''}
                  ${!isActive && !isPast ? 'text-gray-400 hover:text-gray-600' : ''}
                  ${!isActive && isPast && !isCompleted ? 'text-orange-600' : ''}
                `}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${isActive ? 'bg-blue-600 text-white' : ''}
                    ${!isActive && isPast && isCompleted ? 'bg-green-500 text-white' : ''}
                    ${!isActive && !isPast ? 'bg-gray-200 text-gray-500' : ''}
                    ${!isActive && isPast && !isCompleted ? 'bg-orange-400 text-white' : ''}
                  `}
                >
                  {isPast && isCompleted ? '\u2713' : step.icon}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-shrink-0 w-4 ${isPast ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Confidence score bar (if auto-fill was used) */}
      {confidenceScore > 0 && (
        <div className="mb-4 flex items-center gap-3 text-sm text-gray-600">
          <span>Pre-remplissage :</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
            <div
              className={`h-2 rounded-full transition-all ${
                confidenceScore >= 70 ? 'bg-green-500' : confidenceScore >= 40 ? 'bg-yellow-500' : 'bg-orange-500'
              }`}
              style={{ width: `${confidenceScore}%` }}
            />
          </div>
          <span className="font-medium">{confidenceScore}%</span>
          {sourcesUsed.length > 0 && (
            <span className="text-xs text-gray-400">
              Sources : {sourcesUsed.join(', ')}
            </span>
          )}
        </div>
      )}

      {/* ========== STEP 1: Identification ========== */}
      {currentStep === 1 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Identification de l&apos;entreprise</h2>
              <Button
                variant="outline"
                onClick={handleAutoFill}
                disabled={autoFillLoading}
              >
                {autoFillLoading ? 'Chargement...' : 'Pre-remplir automatiquement'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SIRET
                  {autoFillData?.siret && <Badge variant="info" className="ml-2 text-[10px]">auto</Badge>}
                </label>
                <Input
                  value={siret}
                  onChange={(e) => setSiret(e.target.value)}
                  placeholder="123 456 789 00001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l&apos;entreprise *
                  {autoFillData?.company_name && <Badge variant="info" className="ml-2 text-[10px]">auto</Badge>}
                </label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Mon Entreprise"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code NAF
                  {autoFillData?.naf_code && <Badge variant="info" className="ml-2 text-[10px]">auto</Badge>}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={nafCode}
                    onChange={(e) => setNafCode(e.target.value)}
                    placeholder="43.21A"
                  />
                  {nafLabel && (
                    <span className="text-sm text-gray-500 self-center whitespace-nowrap">{nafLabel}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                  {autoFillData?.address && <Badge variant="info" className="ml-2 text-[10px]">auto</Badge>}
                </label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="1 rue du Commerce, 75015 Paris"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de salaries
                  {autoFillData && autoFillData.employee_count > 0 && <Badge variant="info" className="ml-2 text-[10px]">auto</Badge>}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Evaluateur (dirigeant) *
                  {autoFillData?.evaluator_name && <Badge variant="info" className="ml-2 text-[10px]">auto</Badge>}
                </label>
                <Input
                  value={evaluator}
                  onChange={(e) => setEvaluator(e.target.value)}
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Convention collective
                  {autoFillData?.convention_collective && <Badge variant="info" className="ml-2 text-[10px]">auto</Badge>}
                </label>
                <Input
                  value={conventionCollective}
                  onChange={(e) => setConventionCollective(e.target.value)}
                  placeholder="Convention du Batiment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code IDCC
                  {autoFillData?.code_idcc && <Badge variant="info" className="ml-2 text-[10px]">auto</Badge>}
                </label>
                <Input
                  value={codeIdcc}
                  onChange={(e) => setCodeIdcc(e.target.value)}
                  placeholder="1596"
                />
              </div>
            </div>

            {/* Dirigeants from auto-fill */}
            {autoFillData && autoFillData.dirigeants.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-1">Dirigeants detectes :</p>
                {autoFillData.dirigeants.map((d, i) => (
                  <p key={i} className="text-sm text-blue-700">
                    {d.prenom} {d.nom} — {d.fonction}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========== STEP 2: Work Units ========== */}
      {currentStep === 2 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Unites de travail</h2>
                <p className="text-sm text-gray-500">
                  Identifiez les differents lieux et postes de travail de votre entreprise.
                </p>
              </div>
              <Button onClick={() => setShowAddUnit(true)}>Ajouter</Button>
            </div>

            {workUnits.length === 0 && !showAddUnit && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg mb-2">Aucune unite de travail</p>
                <p className="text-sm mb-4">
                  {nafCode
                    ? 'Utilisez le pre-remplissage automatique (etape 1) pour generer les unites de travail.'
                    : 'Renseignez votre code NAF a l\'etape 1 pour generer automatiquement vos unites de travail.'
                  }
                </p>
                <Button variant="outline" onClick={() => setShowAddUnit(true)}>Ajouter manuellement</Button>
              </div>
            )}

            {workUnits.length > 0 && (
              <div className="space-y-3">
                {workUnits.map((wu) => (
                  <div
                    key={wu.id}
                    className="flex items-start justify-between border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{wu.name}</span>
                        <Badge variant="default">
                          {WORK_UNIT_TYPES.find((t) => t.value === wu.type)?.label ?? wu.type}
                        </Badge>
                        {wu.is_auto && <Badge variant="info" className="text-[10px]">auto</Badge>}
                        {wu.source === 'etablissement' && <Badge variant="success" className="text-[10px]">Pappers</Badge>}
                      </div>
                      <p className="text-sm text-gray-500">{wu.description}</p>
                    </div>
                    <button
                      className="text-xs text-red-600 hover:underline ml-2"
                      onClick={() => handleRemoveWorkUnit(wu.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showAddUnit && (
              <div className="mt-4 border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Nouvelle unite de travail</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <Input
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    placeholder="Nom de l'unite"
                  />
                  <select
                    className="border rounded-md p-2 text-sm"
                    value={newUnitType}
                    onChange={(e) => setNewUnitType(e.target.value as WorkUnitType)}
                  >
                    {WORK_UNIT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <Input
                    value={newUnitDesc}
                    onChange={(e) => setNewUnitDesc(e.target.value)}
                    placeholder="Description"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddUnit(false)}>Annuler</Button>
                  <Button onClick={handleAddWorkUnit} disabled={!newUnitName.trim()}>Ajouter</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========== STEP 3: Risk Evaluation ========== */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Risk matrix overview */}
          {risks.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Matrice des risques</h3>
                <RiskMatrix risks={risks.map((r) => ({ gravity: r.gravity, probability: r.probability, name: r.name }))} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Evaluation des risques ({risks.length})
                  </h2>
                  <p className="text-sm text-gray-500">
                    Ajustez la gravite et la probabilite de chaque risque.
                  </p>
                </div>
                <div className="flex gap-2">
                  {nafCode && risks.length === 0 && (
                    <Button variant="outline" onClick={handleLoadNafRisks} disabled={loading}>
                      {loading ? 'Chargement...' : 'Charger risques NAF'}
                    </Button>
                  )}
                  <Button onClick={handleAddManualRisk}>Ajouter un risque</Button>
                </div>
              </div>

              {risks.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg mb-2">Aucun risque identifie</p>
                  <p className="text-sm">
                    Utilisez le pre-remplissage (etape 1) ou chargez les risques par code NAF.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {risks.map((risk) => {
                  const level = calculateLevel(risk.gravity, risk.probability);
                  return (
                    <div key={risk.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          {risk.is_auto ? (
                            <>
                              <span className="font-medium text-gray-900">{risk.name}</span>
                              <Badge variant="info" className="text-[10px]">auto</Badge>
                              {risk.source && (
                                <span className="text-[10px] text-gray-400">{risk.source}</span>
                              )}
                            </>
                          ) : (
                            <Input
                              value={risk.name}
                              onChange={(e) => updateRisk(risk.id, 'name', e.target.value)}
                              placeholder="Nom du risque"
                              className="max-w-xs"
                            />
                          )}
                          <Badge variant={levelBadgeVariant(level.label)}>
                            {level.label} ({level.score})
                          </Badge>
                        </div>
                        <button
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => handleRemoveRisk(risk.id)}
                        >
                          Supprimer
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {!risk.is_auto && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Categorie</label>
                            <Input
                              value={risk.category}
                              onChange={(e) => updateRisk(risk.id, 'category', e.target.value)}
                              placeholder="Chimique, Physique..."
                            />
                          </div>
                        )}
                        {risk.is_auto && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Categorie</label>
                            <p className="text-sm text-gray-700 mt-1">{risk.category}</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Gravite (1-4)</label>
                          <select
                            className="w-full border rounded-md p-2 text-sm"
                            value={risk.gravity}
                            onChange={(e) => updateRisk(risk.id, 'gravity', Number(e.target.value))}
                          >
                            <option value={1}>1 - Faible</option>
                            <option value={2}>2 - Moyen</option>
                            <option value={3}>3 - Grave</option>
                            <option value={4}>4 - Tres grave</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Probabilite (1-4)</label>
                          <select
                            className="w-full border rounded-md p-2 text-sm"
                            value={risk.probability}
                            onChange={(e) => updateRisk(risk.id, 'probability', Number(e.target.value))}
                          >
                            <option value={1}>1 - Rare</option>
                            <option value={2}>2 - Peu probable</option>
                            <option value={3}>3 - Probable</option>
                            <option value={4}>4 - Frequent</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Responsable</label>
                          <Input
                            value={risk.responsible}
                            onChange={(e) => updateRisk(risk.id, 'responsible', e.target.value)}
                            placeholder="Chef de chantier"
                          />
                        </div>
                      </div>

                      {risk.description && (
                        <p className="text-xs text-gray-500 mt-2">{risk.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== STEP 4: Prevention Measures ========== */}
      {currentStep === 4 && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Mesures de prevention</h2>
              <p className="text-sm text-gray-500">
                Pour chaque risque, definissez les actions preventives et mesures existantes.
              </p>
            </div>

            {risks.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>Aucun risque a traiter. Retournez a l&apos;etape 3.</p>
              </div>
            )}

            {/* Purchase risk alerts from auto-fill */}
            {autoFillData && autoFillData.purchase_risks.length > 0 && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="text-sm font-semibold text-orange-800 mb-2">
                  Risques detectes dans vos achats
                </h3>
                {autoFillData.purchase_risks.map((pr, i) => (
                  <div key={i} className="text-sm text-orange-700 mb-1">
                    <span className="font-medium">{pr.purchase_description}</span>
                    {pr.supplier && <span className="text-orange-500"> ({pr.supplier})</span>}
                    <span className="text-orange-600"> → {pr.detected_risks.join(', ')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Insurance indicators */}
            {autoFillData && autoFillData.existing_insurances.length > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-sm font-semibold text-green-800 mb-2">
                  Assurances existantes
                </h3>
                {autoFillData.existing_insurances.map((ins) => (
                  <div key={ins.id} className="text-sm text-green-700 mb-1">
                    <Badge variant="success" className="mr-2 text-[10px]">{ins.type}</Badge>
                    {ins.provider}
                    {ins.description && <span className="text-green-500"> — {ins.description}</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-6">
              {risks.map((risk) => {
                const level = calculateLevel(risk.gravity, risk.probability);
                return (
                  <div key={risk.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-medium text-gray-900">{risk.name || 'Risque sans nom'}</span>
                      <Badge variant={levelBadgeVariant(level.label)}>
                        {level.label}
                      </Badge>
                      <span className="text-xs text-gray-400">{risk.category}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Actions preventives (une par ligne)
                          {risk.is_auto && risk.preventive_actions.length > 0 && (
                            <Badge variant="info" className="ml-2 text-[10px]">auto</Badge>
                          )}
                        </label>
                        <textarea
                          className="w-full border rounded-md p-2 text-sm"
                          rows={4}
                          value={risk.preventive_actions.join('\n')}
                          onChange={(e) =>
                            updateRisk(risk.id, 'preventive_actions', e.target.value.split('\n').filter((a) => a.trim()))
                          }
                          placeholder="Port des EPI&#10;Formation obligatoire&#10;Verification periodique"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Mesures existantes
                          {risk.is_auto && risk.existing_measures && (
                            <Badge variant="info" className="ml-2 text-[10px]">auto</Badge>
                          )}
                        </label>
                        <textarea
                          className="w-full border rounded-md p-2 text-sm"
                          rows={2}
                          value={risk.existing_measures}
                          onChange={(e) => updateRisk(risk.id, 'existing_measures', e.target.value)}
                          placeholder="Mesures deja en place..."
                        />
                        <label className="block text-xs font-medium text-gray-600 mb-1 mt-3">
                          Echeance
                          {risk.is_auto && risk.deadline && (
                            <Badge variant="info" className="ml-2 text-[10px]">auto</Badge>
                          )}
                        </label>
                        <Input
                          type="date"
                          value={risk.deadline}
                          onChange={(e) => updateRisk(risk.id, 'deadline', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== STEP 5: Generation ========== */}
      {currentStep === 5 && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resume du DUERP</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{risks.length}</p>
                  <p className="text-xs text-gray-500">Risques</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {risks.filter((r) => calculateLevel(r.gravity, r.probability).label === 'critique').length}
                  </p>
                  <p className="text-xs text-gray-500">Critiques</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">
                    {risks.filter((r) => calculateLevel(r.gravity, r.probability).label === 'eleve').length}
                  </p>
                  <p className="text-xs text-gray-500">Eleves</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{workUnits.length}</p>
                  <p className="text-xs text-gray-500">Unites de travail</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Entreprise :</span>{' '}
                  <span className="font-medium">{companyName || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">SIRET :</span>{' '}
                  <span className="font-medium">{siret || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Code NAF :</span>{' '}
                  <span className="font-medium">{nafCode || '—'} {nafLabel && `(${nafLabel})`}</span>
                </div>
                <div>
                  <span className="text-gray-500">Evaluateur :</span>{' '}
                  <span className="font-medium">{evaluator || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Effectif :</span>{' '}
                  <span className="font-medium">{employeeCount} salarie(s)</span>
                </div>
                <div>
                  <span className="text-gray-500">Convention :</span>{' '}
                  <span className="font-medium">{conventionCollective || '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk matrix */}
          {risks.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Matrice des risques</h3>
                <RiskMatrix risks={risks.map((r) => ({ gravity: r.gravity, probability: r.probability, name: r.name }))} />
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes complementaires</h3>
              <textarea
                className="w-full border rounded-md p-2 text-sm"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observations complementaires, contexte particulier..."
              />
            </CardContent>
          </Card>

          {/* Validation warnings */}
          {(!companyName || !evaluator) && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
              Attention : le nom de l&apos;entreprise et le nom de l&apos;evaluateur sont obligatoires (etape 1).
            </div>
          )}
          {risks.length === 0 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
              Attention : aucun risque identifie. Ajoutez des risques a l&apos;etape 3.
            </div>
          )}
        </div>
      )}

      {/* Navigation footer */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={goPrev}>
              Precedent
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {currentStep < 5 && (
            <Button onClick={goNext}>
              Suivant
            </Button>
          )}
          {currentStep === 5 && (
            <Button
              onClick={handleSave}
              disabled={saving || !companyName.trim() || !evaluator.trim()}
            >
              {saving ? 'Enregistrement...' : 'Generer le DUERP'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
