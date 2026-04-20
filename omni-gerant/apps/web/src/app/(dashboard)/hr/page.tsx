'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { HrNav } from '@/components/hr/hr-nav';

// ── Types ───────────────────────────────────────────────────────────

interface PositionTemplate {
  name: string;
  category: string;
  suggestedHeadcount: number;
  typicalEquipment: string[];
  typicalChemicalExposures: string[];
  requiredTrainings: string[];
  medicalSurveillanceLevel: 'standard' | 'enhanced';
}

interface TemplateResponse {
  metier: { slug: string; label: string } | null;
  positions: PositionTemplate[];
}

interface Position {
  id: string;
  name: string;
  category: string;
  headcount: number;
  equipmentUsed: string[];
  chemicalExposures: string[];
  mandatoryTrainings: Array<{ trainingName: string; legalBasis: string; priority: string; isObtained: boolean }>;
  medicalSurveillanceLevel: string;
  workUnitIds: string[];
  isFromTemplate: boolean;
}

interface Employee {
  id?: string;
  firstName: string;
  lastName: string;
  jobPositionId: string;
  hireDate: string;
  contractType: string;
  isPartTime: boolean;
}

interface TrainingAlert {
  employeeName: string;
  positionName: string;
  trainingName: string;
  priority: string;
}

// ── Steps ───────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Postes', description: 'Definir les postes de votre entreprise' },
  { id: 2, label: 'Employes', description: 'Renseigner vos salaries (optionnel)' },
  { id: 3, label: 'Formations', description: 'Suivi des formations et visites medicales' },
] as const;

// ── Component ───────────────────────────────────────────────────────

export default function HrPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nafCode, setNafCode] = useState('');
  const [effectif, setEffectif] = useState(5);
  const [metierLabel, setMetierLabel] = useState('');

  // Step 1 — Positions
  const [positions, setPositions] = useState<Position[]>([]);
  const [newPositionName, setNewPositionName] = useState('');

  // Step 2 — Employees
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({});

  // Step 3 — Training alerts
  const [missingTrainings, setMissingTrainings] = useState<TrainingAlert[]>([]);

  // Saved positions from API
  const [savedPositions, setSavedPositions] = useState<Array<{ id: string; name: string }>>([]);

  // ── Auto-fill from NAF code ─────────────────────────────────────
  const handleAutoFill = useCallback(async () => {
    if (!nafCode.trim()) return;
    setLoading(true);
    try {
      const result = await api.get<TemplateResponse>(
        `/api/hr/templates/${encodeURIComponent(nafCode.trim())}?effectif=${effectif}`,
      );
      if (result.ok && result.value.metier) {
        setMetierLabel(result.value.metier.label);
        const templatePositions: Position[] = result.value.positions.map((p) => ({
          id: crypto.randomUUID(),
          name: p.name,
          category: p.category,
          headcount: p.suggestedHeadcount,
          equipmentUsed: p.typicalEquipment,
          chemicalExposures: p.typicalChemicalExposures,
          mandatoryTrainings: p.requiredTrainings.map((t) => ({
            trainingName: t, legalBasis: '', priority: 'mandatory', isObtained: false,
          })),
          medicalSurveillanceLevel: p.medicalSurveillanceLevel,
          workUnitIds: [],
          isFromTemplate: true,
        }));
        setPositions(templatePositions);
      }
    } finally {
      setLoading(false);
    }
  }, [nafCode, effectif]);

  // ── Save positions to API ───────────────────────────────────────
  const handleSavePositions = async () => {
    setSaving(true);
    const saved: Array<{ id: string; name: string }> = [];
    try {
      for (const pos of positions) {
        const result = await api.post<{ id: string; name: string }>('/api/hr/positions', {
          name: pos.name,
          category: pos.category,
          headcount: pos.headcount,
          equipmentUsed: pos.equipmentUsed,
          chemicalExposures: pos.chemicalExposures,
          mandatoryTrainings: pos.mandatoryTrainings,
          medicalSurveillanceLevel: pos.medicalSurveillanceLevel,
        });
        if (result.ok) saved.push({ id: result.value.id, name: pos.name });
      }
      setSavedPositions(saved);
    } finally {
      setSaving(false);
    }
  };

  // ── Save employees ──────────────────────────────────────────────
  const handleSaveEmployees = async () => {
    setSaving(true);
    try {
      for (const emp of employees) {
        if (emp.id) continue; // already saved
        await api.post('/api/hr/employees', {
          firstName: emp.firstName,
          lastName: emp.lastName,
          jobPositionId: emp.jobPositionId,
          hireDate: new Date(emp.hireDate).toISOString(),
          contractType: emp.contractType,
          isPartTime: emp.isPartTime,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Load missing trainings ──────────────────────────────────────
  useEffect(() => {
    if (currentStep === 3) {
      api.get<TrainingAlert[]>('/api/hr/trainings/missing').then((result) => {
        if (result.ok) setMissingTrainings(result.value);
      });
    }
  }, [currentStep]);

  // ── Headcount helpers ───────────────────────────────────────────
  const updateHeadcount = (posId: string, delta: number) => {
    setPositions((prev) =>
      prev.map((p) => p.id === posId ? { ...p, headcount: Math.max(0, p.headcount + delta) } : p),
    );
  };

  const removePosition = (posId: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== posId));
  };

  const addPosition = () => {
    if (!newPositionName.trim()) return;
    setPositions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: newPositionName.trim(),
        category: 'employe',
        headcount: 1,
        equipmentUsed: [],
        chemicalExposures: [],
        mandatoryTrainings: [],
        medicalSurveillanceLevel: 'standard',
        workUnitIds: [],
        isFromTemplate: false,
      },
    ]);
    setNewPositionName('');
  };

  const totalHeadcount = positions.reduce((acc, p) => acc + p.headcount, 0);

  const stepCompletion = [
    positions.length > 0,
    true, // step 2 is optional
    true, // step 3 is informational
  ];

  const categoryLabels: Record<string, string> = {
    ouvrier: 'Ouvrier',
    employe: 'Employe',
    technicien: 'Technicien',
    cadre: 'Cadre',
    apprenti: 'Apprenti',
    stagiaire: 'Stagiaire',
    interimaire: 'Interimaire',
    dirigeant: 'Dirigeant',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <HrNav />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Effectif & Postes</h1>
        <p className="text-gray-500 mt-1">Gerez les postes, employes et formations de votre entreprise</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => setCurrentStep(step.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentStep === step.id
                  ? 'bg-blue-600 text-white'
                  : stepCompletion[i]
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <span className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold border">
                {stepCompletion[i] && currentStep !== step.id ? '\u2713' : step.id}
              </span>
              {step.label}
            </button>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Postes ──────────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          {/* Auto-fill section */}
          <div className="bg-white border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Pre-remplissage automatique</h2>
            <p className="text-sm text-gray-500">
              Entrez votre code NAF et effectif pour pré-remplir les postes types de votre metier.
            </p>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Code NAF</label>
                <input
                  type="text"
                  value={nafCode}
                  onChange={(e) => setNafCode(e.target.value)}
                  placeholder="ex: 43.22A, 56.10A, 96.02A"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">Effectif</label>
                <input
                  type="number"
                  value={effectif}
                  onChange={(e) => setEffectif(parseInt(e.target.value, 10) || 1)}
                  min={1}
                  max={500}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleAutoFill}
                disabled={loading || !nafCode.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Chargement...' : 'Pre-remplir'}
              </button>
            </div>
            {metierLabel && (
              <p className="text-sm text-green-600 font-medium">
                Metier detecte : {metierLabel}
              </p>
            )}
          </div>

          {/* Positions list */}
          <div className="bg-white border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Postes ({positions.length}) — Effectif total : {totalHeadcount}
              </h2>
            </div>

            {positions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">Aucun poste defini</p>
                <p className="text-sm mt-1">Utilisez le pre-remplissage ci-dessus ou ajoutez des postes manuellement.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map((pos) => (
                  <div key={pos.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{pos.name}</span>
                        {pos.isFromTemplate && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">auto</span>
                        )}
                        <span className="text-xs text-gray-500">{categoryLabels[pos.category] ?? pos.category}</span>
                        {pos.medicalSurveillanceLevel === 'enhanced' && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">SMR</span>
                        )}
                      </div>
                      {pos.equipmentUsed.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          Equipements : {pos.equipmentUsed.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateHeadcount(pos.id, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 text-sm font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-semibold text-sm">{pos.headcount}</span>
                      <button
                        onClick={() => updateHeadcount(pos.id, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 text-sm font-bold"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removePosition(pos.id)}
                        className="ml-2 text-red-400 hover:text-red-600 text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add custom position */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <input
                type="text"
                value={newPositionName}
                onChange={(e) => setNewPositionName(e.target.value)}
                placeholder="Nom du poste"
                className="flex-1 border rounded-md px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addPosition()}
              />
              <button
                onClick={addPosition}
                disabled={!newPositionName.trim()}
                className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                Ajouter un poste
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-end gap-3">
            <button
              onClick={async () => { await handleSavePositions(); setCurrentStep(2); }}
              disabled={saving || positions.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer et continuer'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Employes ────────────────────────────────────── */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Employes</h2>
                <p className="text-sm text-gray-500">Renseignez vos salaries (optionnel — vous pourrez completer plus tard)</p>
              </div>
            </div>

            {employees.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-2">Prénom</th>
                    <th className="px-2 py-2">Nom</th>
                    <th className="px-2 py-2">Poste</th>
                    <th className="px-2 py-2">Contrat</th>
                    <th className="px-2 py-2">Embauche</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-2 py-2">{emp.firstName}</td>
                      <td className="px-2 py-2">{emp.lastName}</td>
                      <td className="px-2 py-2">{savedPositions.find((p) => p.id === emp.jobPositionId)?.name ?? '—'}</td>
                      <td className="px-2 py-2 uppercase text-xs">{emp.contractType}</td>
                      <td className="px-2 py-2">{emp.hireDate}</td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => setEmployees((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >
                          Retirer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Add employee form */}
            <div className="grid grid-cols-5 gap-2 pt-4 border-t">
              <input
                type="text"
                placeholder="Prénom"
                value={newEmployee.firstName ?? ''}
                onChange={(e) => setNewEmployee((p) => ({ ...p, firstName: e.target.value }))}
                className="border rounded px-2 py-1.5 text-sm"
              />
              <input
                type="text"
                placeholder="Nom"
                value={newEmployee.lastName ?? ''}
                onChange={(e) => setNewEmployee((p) => ({ ...p, lastName: e.target.value }))}
                className="border rounded px-2 py-1.5 text-sm"
              />
              <select
                value={newEmployee.jobPositionId ?? ''}
                onChange={(e) => setNewEmployee((p) => ({ ...p, jobPositionId: e.target.value }))}
                className="border rounded px-2 py-1.5 text-sm"
              >
                <option value="">-- Poste --</option>
                {savedPositions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={newEmployee.contractType ?? 'cdi'}
                onChange={(e) => setNewEmployee((p) => ({ ...p, contractType: e.target.value }))}
                className="border rounded px-2 py-1.5 text-sm"
              >
                <option value="cdi">CDI</option>
                <option value="cdd">CDD</option>
                <option value="interim">Interim</option>
                <option value="apprentice">Apprenti</option>
                <option value="intern">Stage</option>
                <option value="seasonal">Saisonnier</option>
              </select>
              <input
                type="date"
                value={newEmployee.hireDate ?? ''}
                onChange={(e) => setNewEmployee((p) => ({ ...p, hireDate: e.target.value }))}
                className="border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={() => {
                if (newEmployee.firstName && newEmployee.lastName && newEmployee.jobPositionId) {
                  setEmployees((prev) => [
                    ...prev,
                    {
                      firstName: newEmployee.firstName!,
                      lastName: newEmployee.lastName!,
                      jobPositionId: newEmployee.jobPositionId!,
                      hireDate: newEmployee.hireDate ?? new Date().toISOString().slice(0, 10),
                      contractType: newEmployee.contractType ?? 'cdi',
                      isPartTime: false,
                    },
                  ]);
                  setNewEmployee({});
                }
              }}
              disabled={!newEmployee.firstName || !newEmployee.lastName || !newEmployee.jobPositionId}
              className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
            >
              Retour
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 border rounded-md text-sm text-gray-600 hover:bg-gray-50"
              >
                Passer cette etape
              </button>
              <button
                onClick={async () => { await handleSaveEmployees(); setCurrentStep(3); }}
                disabled={saving || employees.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer et continuer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Formations & suivi medical ─────────────────── */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Formations obligatoires</h2>
            <p className="text-sm text-gray-500">
              Liste des formations requises par poste. Les formations manquantes sont affichees en rouge.
            </p>

            {positions.length > 0 ? (
              <div className="space-y-4">
                {positions.map((pos) => {
                  const posTrainings = pos.mandatoryTrainings;
                  if (posTrainings.length === 0) return null;
                  return (
                    <div key={pos.id} className="border rounded-lg p-4">
                      <h3 className="font-medium text-sm mb-2">{pos.name}</h3>
                      <div className="space-y-1">
                        {posTrainings.map((t, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className={`w-2 h-2 rounded-full ${t.isObtained ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className={t.isObtained ? 'text-gray-600' : 'text-red-600 font-medium'}>
                              {t.trainingName}
                            </span>
                            {t.priority === 'mandatory' && (
                              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">obligatoire</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Aucun poste defini — retournez a l&apos;etape 1
              </div>
            )}

            {missingTrainings.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-sm text-red-600 mb-2">
                  Formations manquantes ({missingTrainings.length})
                </h3>
                <div className="space-y-1">
                  {missingTrainings.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-red-50 rounded px-3 py-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="font-medium">{t.employeeName}</span>
                      <span className="text-gray-400">—</span>
                      <span>{t.trainingName}</span>
                      <span className="text-gray-400 text-xs">({t.positionName})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
            >
              Retour
            </button>
            <button
              onClick={() => window.location.href = '/legal/duerp'}
              className="px-6 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
            >
              Terminer — Generer le DUERP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
