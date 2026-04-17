'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// BUSINESS RULE [CDC-3.2]: Page export FEC

export default function FecExportPage() {
  const currentYear = new Date().getFullYear();
  const [from, setFrom] = useState(`${currentYear}-01-01`);
  const [to, setTo] = useState(`${currentYear}-12-31`);
  const [exporting, setExporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);

  const handleExport = async () => {
    setExporting(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
    try {
      const res = await fetch(`${baseUrl}/api/accounting/fec?from=${from}&to=${to}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const blob = await res.blob();
        const disposition = res.headers.get('Content-Disposition');
        const filenameMatch = disposition?.match(/filename="(.+)"/);
        const filename = filenameMatch?.[1] ?? `FEC_${from}_${to}.tsv`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const errorBody = await res.json().catch(() => null);
        alert(errorBody?.error?.message ?? `Erreur HTTP ${res.status}`);
      }
    } catch {
      alert('Erreur reseau');
    }
    setExporting(false);
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
    try {
      const res = await fetch(`${baseUrl}/api/accounting/fec/validate?from=${from}&to=${to}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setValidationResult(data);
      } else {
        alert('Erreur lors de la validation');
      }
    } catch {
      alert('Erreur reseau');
    }
    setValidating(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Export FEC</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fichier des Ecritures Comptables conforme au controle fiscal.
          </p>
        </div>
        <a href="/settings/accounting">
          <Button variant="outline">Retour</Button>
        </a>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">
            Export FEC (Fichier des Ecritures Comptables)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Generez le FEC conforme pour votre expert-comptable ou en cas de controle fiscal.
            Format texte tabule avec les 18 colonnes obligatoires.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de debut
              </label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin
              </label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? 'Telechargement...' : 'Telecharger le FEC'}
            </Button>
            <Button variant="outline" onClick={handleValidate} disabled={validating}>
              {validating ? 'Validation...' : 'Valider la conformite'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {validationResult && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Resultat de la validation</h3>
            {validationResult.valid ? (
              <p className="text-green-600 font-medium">FEC conforme - aucune erreur detectee</p>
            ) : (
              <div>
                <p className="text-red-600 font-medium mb-2">
                  {validationResult.errors.length} erreur{validationResult.errors.length > 1 ? 's' : ''} detectee{validationResult.errors.length > 1 ? 's' : ''}
                </p>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {validationResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
