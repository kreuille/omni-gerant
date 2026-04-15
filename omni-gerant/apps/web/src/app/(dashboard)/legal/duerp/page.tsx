'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RiskMatrix } from '@/components/legal/risk-matrix';
import { DuerpPreview } from '@/components/legal/duerp-preview';

// BUSINESS RULE [CDC-2.4]: Vue DUERP actuel

// Demo data - BTP risks
const DEMO_RISKS = [
  { id: '1', category: 'Chute', name: 'Chute de hauteur', description: 'Travaux en hauteur', gravity: 4, probability: 3, risk_level: 12, risk_label: 'critique', preventive_actions: ['Harnais de securite', 'Verification echafaudages'], responsible: 'Chef de chantier' },
  { id: '2', category: 'Chute', name: 'Chute de plain-pied', description: 'Sol glissant ou encombre', gravity: 2, probability: 3, risk_level: 6, risk_label: 'modere', preventive_actions: ['Rangement chantier', 'Chaussures antiderapantes'], responsible: null },
  { id: '3', category: 'Chimique', name: 'Exposition amiante', description: 'Travaux de renovation', gravity: 4, probability: 2, risk_level: 8, risk_label: 'eleve', preventive_actions: ['Diagnostic amiante', 'Formation SS3/SS4', 'EPI respiratoire'], responsible: 'Responsable securite' },
  { id: '4', category: 'Physique', name: 'Exposition au bruit', description: 'Machines et outils', gravity: 3, probability: 3, risk_level: 9, risk_label: 'eleve', preventive_actions: ['Protections auditives', 'Rotation postes'], responsible: null },
  { id: '5', category: 'Ergonomique', name: 'Port de charges', description: 'Manutention charges lourdes', gravity: 3, probability: 4, risk_level: 12, risk_label: 'critique', preventive_actions: ['Aides manutention', 'Formation gestes'], responsible: 'Chef d\'equipe' },
  { id: '6', category: 'Routier', name: 'Risque routier', description: 'Deplacements professionnels', gravity: 4, probability: 2, risk_level: 8, risk_label: 'eleve', preventive_actions: ['Entretien vehicules', 'Planification trajets'], responsible: null },
];

export default function DuerpPage() {
  const [risks] = useState(DEMO_RISKS);

  const critiques = risks.filter((r) => r.risk_label === 'critique').length;
  const eleves = risks.filter((r) => r.risk_label === 'eleve').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DUERP</h1>
          <p className="text-sm text-gray-500 mt-1">
            Document Unique d'Evaluation des Risques Professionnels
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/legal/duerp/edit">
            <Button variant="outline">Modifier</Button>
          </a>
          <Button>Telecharger PDF</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
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
            <Badge variant="info">Version 1</Badge>
            <p className="text-xs text-gray-500 mt-1">14/04/2026</p>
          </CardContent>
        </Card>
      </div>

      {/* Matrice */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Matrice des risques</h2>
          <RiskMatrix risks={risks} />
        </CardContent>
      </Card>

      {/* Detail risques */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail des risques</h2>
          <DuerpPreview risks={risks} />
        </CardContent>
      </Card>
    </div>
  );
}
