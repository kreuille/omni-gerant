'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RiskMatrix } from '@/components/legal/risk-matrix';
import { DuerpPreview } from '@/components/legal/duerp-preview';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-2.4]: Vue DUERP actuel — charge depuis l'API

interface DuerpRisk {
  id: string;
  category: string;
  name: string;
  description: string | null;
  gravity: number;
  probability: number;
  risk_level: number;
  risk_label: string;
  preventive_actions: string[];
  existing_measures: string | null;
  responsible: string | null;
  deadline: string | null;
}

interface DuerpWorkUnit {
  id: string;
  name: string;
  type: string;
  description: string;
}

interface DuerpDocument {
  id: string;
  title: string;
  company_name: string;
  siret: string | null;
  naf_code: string | null;
  naf_label: string | null;
  sector_name: string | null;
  address: string | null;
  employee_count: number;
  evaluator_name: string;
  evaluation_date: string;
  convention_collective: string | null;
  code_idcc: string | null;
  work_units: DuerpWorkUnit[];
  risks: DuerpRisk[];
  version: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function DuerpPage() {
  const [duerp, setDuerp] = useState<DuerpDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await api.get<DuerpDocument>('/api/legal/duerp');
      if (!cancelled) {
        if (result.ok) {
          setDuerp(result.value);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDownloadPdf = async () => {
    if (!duerp) return;
    setPdfLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const apiBase = process.env['NEXT_PUBLIC_API_URL'] || 'https://omni-gerant-api.onrender.com';
      const response = await fetch(`${apiBase}/api/legal/duerp/${duerp.id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch {
      // silent
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Chargement du DUERP...</div>
      </div>
    );
  }

  // No DUERP yet — show creation prompt
  if (!duerp) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DUERP</h1>
            <p className="text-sm text-gray-500 mt-1">
              Document Unique d&apos;Evaluation des Risques Professionnels
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Aucun DUERP
            </h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Le Document Unique est obligatoire pour toutes les entreprises.
              Creez votre premier DUERP en quelques minutes grace au pre-remplissage automatique.
            </p>
            <a href="/legal/duerp/edit">
              <Button>Creer mon DUERP</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show existing DUERP
  const risks = duerp.risks;
  const critiques = risks.filter((r) => r.risk_label === 'critique').length;
  const eleves = risks.filter((r) => r.risk_label === 'eleve').length;
  const moderes = risks.filter((r) => r.risk_label === 'modere').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DUERP</h1>
          <p className="text-sm text-gray-500 mt-1">
            {duerp.title} — {duerp.company_name}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/legal/duerp/edit">
            <Button variant="outline">Nouveau DUERP</Button>
          </a>
          <Button onClick={handleDownloadPdf} disabled={pdfLoading}>
            {pdfLoading ? 'Generation...' : 'Telecharger PDF'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{risks.length}</p>
            <p className="text-xs text-gray-500">Risques identifies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{critiques}</p>
            <p className="text-xs text-gray-500">Critiques</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{eleves}</p>
            <p className="text-xs text-gray-500">Eleves</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{moderes}</p>
            <p className="text-xs text-gray-500">Moderes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Badge variant="info">Version {duerp.version}</Badge>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(duerp.created_at).toLocaleDateString('fr-FR')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Company info */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Informations entreprise</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Entreprise :</span>{' '}
              <span className="font-medium">{duerp.company_name}</span>
            </div>
            {duerp.siret && (
              <div>
                <span className="text-gray-500">SIRET :</span>{' '}
                <span className="font-medium">{duerp.siret}</span>
              </div>
            )}
            {duerp.naf_code && (
              <div>
                <span className="text-gray-500">NAF :</span>{' '}
                <span className="font-medium">{duerp.naf_code} {duerp.naf_label && `(${duerp.naf_label})`}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Effectif :</span>{' '}
              <span className="font-medium">{duerp.employee_count} salarie(s)</span>
            </div>
            <div>
              <span className="text-gray-500">Evaluateur :</span>{' '}
              <span className="font-medium">{duerp.evaluator_name}</span>
            </div>
            {duerp.convention_collective && (
              <div>
                <span className="text-gray-500">Convention :</span>{' '}
                <span className="font-medium">{duerp.convention_collective}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Work units */}
      {duerp.work_units.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Unites de travail ({duerp.work_units.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {duerp.work_units.map((wu) => (
                <div key={wu.id} className="flex items-center gap-2 p-2 border rounded">
                  <Badge variant="default">{wu.type}</Badge>
                  <span className="font-medium text-sm">{wu.name}</span>
                  {wu.description && (
                    <span className="text-xs text-gray-400">— {wu.description}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk matrix */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Matrice des risques</h2>
          <RiskMatrix risks={risks} />
        </CardContent>
      </Card>

      {/* Risk details */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail des risques</h2>
          <DuerpPreview risks={risks} />
        </CardContent>
      </Card>

      {/* Notes */}
      {duerp.notes && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Notes</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{duerp.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
