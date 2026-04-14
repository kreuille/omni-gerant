'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// BUSINESS RULE [CDC-2.4]: Export registre RGPD format CNIL

interface RgpdExportProps {
  companyName: string;
  treatmentCount: number;
  onExport: () => void;
}

export function RgpdExport({ companyName, treatmentCount, onExport }: RgpdExportProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Export du registre</h3>
        <p className="text-sm text-gray-600 mb-3">
          Exportez votre registre des traitements au format TSV (Tab-Separated Values),
          compatible avec le modele de registre de la CNIL.
        </p>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">{companyName}</span>
            {' — '}
            {treatmentCount} traitement{treatmentCount > 1 ? 's' : ''} enregistre{treatmentCount > 1 ? 's' : ''}
          </div>
          <Button onClick={onExport} variant="outline">
            Telecharger (TSV)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
