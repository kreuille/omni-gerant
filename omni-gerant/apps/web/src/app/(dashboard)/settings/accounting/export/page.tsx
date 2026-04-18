'use client';

import { Button } from '@/components/ui/button';
import { FecExportForm } from '@/components/accounting/fec-export-form';

// BUSINESS RULE [CDC-3.2]: Page export FEC

export default function FecExportPage() {
  const handleExport = (from: string, to: string) => {
    // TODO: Call API GET /api/accounting/fec?from=...&to=...
    alert(`Export FEC du ${from} au ${to}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Export FEC</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fichier des Ecritures Comptables conforme au controle fiscal.
          </p>
        </div>
        <a href="/settings/accounting">
          <Button variant="outline">Retour</Button>
        </a>
      </div>

      <FecExportForm onExport={handleExport} />
    </div>
  );
}
