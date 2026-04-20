'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { HrNav } from '@/components/hr/hr-nav';
import { openAuthenticatedDocument } from '@/lib/download';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  contractType: string;
  hireDate: string;
  socialSecurityNumber?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  dpae_declared_at?: string | null;
  contract_signed_at?: string | null;
}

export default function HrDocumentsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  async function load() {
    const r = await api.get<{ items: Employee[] }>('/api/hr/employees?limit=100');
    if (r.ok) setEmployees(r.value.items);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function generateDpae(empId: string) {
    setGenerating(empId + ':dpae');
    setMessage(null);
    const r = await api.post<{ reference: string; generatedAt: string; depositUrl: string }>(`/api/hr/employees/${empId}/dpae/generate`, {});
    if (r.ok) {
      setMessage(`DPAE générée — Référence : ${r.value.reference}. Déposez sur ${r.value.depositUrl}`);
      await load();
    } else setMessage('Erreur : ' + r.error.message);
    setGenerating(null);
  }

  async function downloadDpae(empId: string, name: string) {
    const r = await openAuthenticatedDocument(`/api/hr/employees/${empId}/dpae/download`, `DPAE-${name}.pdf`);
    if (!r.ok) setMessage('Erreur : ' + r.error);
  }

  async function downloadContract(empId: string, name: string) {
    const r = await openAuthenticatedDocument(`/api/hr/employees/${empId}/contract/generate`, `contrat-${name}.pdf`);
    if (!r.ok) setMessage('Erreur : ' + r.error);
  }

  async function markContractSigned(empId: string) {
    setGenerating(empId + ':sign');
    const r = await api.post<{ signedAt: string }>(`/api/hr/employees/${empId}/contract/sign`, {});
    if (r.ok) {
      setMessage(`Contrat marqué comme signé le ${new Date(r.value.signedAt).toLocaleDateString('fr-FR')}`);
      await load();
    } else setMessage('Erreur : ' + r.error.message);
    setGenerating(null);
  }

  async function sendPortalLink(empId: string, name: string) {
    setGenerating(empId + ':portal');
    const r = await api.post<{ token: string; expiresAt: string; portalUrl: string }>(`/api/hr/employees/${empId}/portal-link`, {});
    if (r.ok) {
      // Copier le lien dans le clipboard
      try { await navigator.clipboard.writeText(r.value.portalUrl); } catch { /* ok */ }
      setMessage(`Lien portail copié ! ${name} peut accéder à ses bulletins pendant 24h via : ${r.value.portalUrl}`);
    } else setMessage('Erreur : ' + r.error.message);
    setGenerating(null);
  }

  async function initSignature(empId: string, name: string) {
    setGenerating(empId + ':esign');
    const r = await api.post<{ id: string; documentHash: string }>(`/api/hr/employees/${empId}/signature`, {});
    if (r.ok) {
      const url = `${window.location.origin}/sign/${r.value.id}`;
      try { await navigator.clipboard.writeText(url); } catch { /* ok */ }
      setMessage(`Signature électronique initialisée pour ${name}. Lien copié : ${url} (hash document : ${r.value.documentHash.slice(0, 16)}…)`);
    } else setMessage('Erreur : ' + r.error.message);
    setGenerating(null);
  }

  return (
    <div>
      <HrNav />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documents RH</h1>
        <p className="text-sm text-gray-600 mt-1">
          DPAE, contrats de travail, signature électronique, portail salarié.
        </p>
      </div>

      {message && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">{message}</div>}

      {loading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : employees.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          Aucun employé. Créez-en un depuis l'onglet Setup.
        </div>
      ) : (
        <div className="space-y-4">
          {employees.map((e) => {
            const fullName = `${e.lastName}-${e.firstName}`;
            const missingForDpae = !e.socialSecurityNumber || !e.birthDate || !e.birthPlace;
            return (
              <div key={e.id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{e.lastName} {e.firstName}</h3>
                    <p className="text-xs text-gray-500">
                      Contrat : <span className="uppercase">{e.contractType}</span> ·
                      Embauche : {new Date(e.hireDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    {e.dpae_declared_at && <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded">DPAE ✓</span>}
                    {e.contract_signed_at && <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded">Contrat signé ✓</span>}
                  </div>
                </div>

                {missingForDpae && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    ⚠ Pour générer la DPAE, renseigner NIR + date de naissance + lieu de naissance du salarié.
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {/* DPAE */}
                  <button
                    onClick={() => generateDpae(e.id)}
                    disabled={missingForDpae || generating === e.id + ':dpae'}
                    className="px-3 py-1.5 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700 disabled:opacity-40"
                  >
                    {generating === e.id + ':dpae' ? 'Génération…' : (e.dpae_declared_at ? 'Regénérer DPAE' : 'Générer DPAE')}
                  </button>
                  <button
                    onClick={() => downloadDpae(e.id, fullName)}
                    disabled={missingForDpae}
                    className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium hover:bg-gray-50 disabled:opacity-40"
                  >
                    📄 Télécharger DPAE
                  </button>

                  {/* Contrat */}
                  <button
                    onClick={() => downloadContract(e.id, fullName)}
                    className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium hover:bg-gray-50"
                  >
                    📄 Contrat de travail
                  </button>
                  <button
                    onClick={() => initSignature(e.id, fullName)}
                    disabled={generating === e.id + ':esign'}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-40"
                  >
                    ✍ Signer électroniquement
                  </button>
                  {!e.contract_signed_at && (
                    <button
                      onClick={() => markContractSigned(e.id)}
                      disabled={generating === e.id + ':sign'}
                      className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium hover:bg-gray-50"
                    >
                      Marquer signé (papier)
                    </button>
                  )}

                  {/* Portail */}
                  <button
                    onClick={() => sendPortalLink(e.id, fullName)}
                    disabled={generating === e.id + ':portal'}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-40 ml-auto"
                  >
                    🔗 Lien portail (24h)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
