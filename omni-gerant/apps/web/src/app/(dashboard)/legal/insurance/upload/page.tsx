'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InsuranceUpload } from '@/components/legal/insurance-upload';

// BUSINESS RULE [CDC-2.4]: Page ajout assurance

const INSURANCE_TYPES = [
  { value: 'rc_pro', label: 'Responsabilite Civile Professionnelle (RC Pro)' },
  { value: 'decennale', label: 'Decennale (obligatoire BTP)' },
  { value: 'multirisque', label: 'Multirisque professionnelle' },
  { value: 'protection_juridique', label: 'Protection juridique' },
  { value: 'prevoyance', label: 'Prevoyance' },
];

export default function UploadInsurancePage() {
  const [type, setType] = useState('rc_pro');
  const [insurer, setInsurer] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [premium, setPremium] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call API POST /api/legal/insurance
    alert(`Assurance ${type} cree : ${insurer} - ${contractNumber}`);
  };

  const handleUpload = (_id: string, file: File) => {
    // TODO: Call API POST /api/legal/insurance/:id/document
    alert(`Attestation ${file.name} enregistree`);
    setShowUpload(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Ajouter une assurance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enregistrez un nouveau contrat d'assurance dans votre coffre-fort.
          </p>
        </div>
        <a href="/legal/insurance">
          <Button variant="outline">Retour</Button>
        </a>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type d'assurance *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {INSURANCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assureur *
                </label>
                <Input value={insurer} onChange={(e) => setInsurer(e.target.value)} placeholder="AXA, MAAF, Allianz..." required />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° de contrat *
                </label>
                <Input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de debut *
                </label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin *
                </label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prime annuelle (EUR) *
              </label>
              <Input
                type="number"
                step="0.01"
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
                placeholder="1200.00"
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowUpload(true)}>
                Joindre attestation PDF
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {showUpload && (
        <InsuranceUpload
          insuranceId="new"
          onUpload={handleUpload}
          onCancel={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
