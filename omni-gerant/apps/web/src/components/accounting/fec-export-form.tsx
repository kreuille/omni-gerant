'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// BUSINESS RULE [CDC-3.2]: Formulaire export FEC

interface FecExportFormProps {
  onExport: (from: string, to: string) => void;
}

export function FecExportForm({ onExport }: FecExportFormProps) {
  const currentYear = new Date().getFullYear();
  const [from, setFrom] = useState(`${currentYear}-01-01`);
  const [to, setTo] = useState(`${currentYear}-12-31`);

  return (
    <Card>
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
          <Button onClick={() => onExport(from, to)}>
            Telecharger le FEC
          </Button>
          <Button variant="outline" onClick={() => alert('Validation en cours...')}>
            Valider la conformite
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
