'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// BUSINESS RULE [CDC-2.4]: Formulaire traitement RGPD

interface TreatmentFormProps {
  onSubmit: (data: {
    name: string;
    purpose: string;
    legal_basis: string;
    data_categories: string[];
    data_subjects: string;
    recipients: string[];
    retention_period: string;
    security_measures: string[];
    transfer_outside_eu: boolean;
    transfer_details: string;
  }) => void;
  onCancel: () => void;
  initial?: {
    name: string;
    purpose: string;
    legal_basis: string;
    data_categories: string[];
    data_subjects: string;
    recipients: string[];
    retention_period: string;
    security_measures: string[];
    transfer_outside_eu: boolean;
    transfer_details: string | null;
  };
}

const LEGAL_BASES = [
  { value: 'contrat', label: 'Execution d\'un contrat' },
  { value: 'obligation_legale', label: 'Obligation legale' },
  { value: 'interet_legitime', label: 'Interet legitime' },
  { value: 'consentement', label: 'Consentement' },
];

export function TreatmentForm({ onSubmit, onCancel, initial }: TreatmentFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [purpose, setPurpose] = useState(initial?.purpose ?? '');
  const [legalBasis, setLegalBasis] = useState(initial?.legal_basis ?? 'contrat');
  const [dataCategories, setDataCategories] = useState(initial?.data_categories.join(', ') ?? '');
  const [dataSubjects, setDataSubjects] = useState(initial?.data_subjects ?? '');
  const [recipients, setRecipients] = useState(initial?.recipients.join(', ') ?? '');
  const [retentionPeriod, setRetentionPeriod] = useState(initial?.retention_period ?? '');
  const [securityMeasures, setSecurityMeasures] = useState(initial?.security_measures.join(', ') ?? '');
  const [transferOutsideEu, setTransferOutsideEu] = useState(initial?.transfer_outside_eu ?? false);
  const [transferDetails, setTransferDetails] = useState(initial?.transfer_details ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      purpose,
      legal_basis: legalBasis,
      data_categories: dataCategories.split(',').map((s) => s.trim()).filter(Boolean),
      data_subjects: dataSubjects,
      recipients: recipients.split(',').map((s) => s.trim()).filter(Boolean),
      retention_period: retentionPeriod,
      security_measures: securityMeasures.split(',').map((s) => s.trim()).filter(Boolean),
      transfer_outside_eu: transferOutsideEu,
      transfer_details: transferDetails,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom du traitement *
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Base legale *
          </label>
          <select
            value={legalBasis}
            onChange={(e) => setLegalBasis(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {LEGAL_BASES.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Finalite *
        </label>
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          rows={2}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categories de donnees (separees par virgule) *
          </label>
          <Input value={dataCategories} onChange={(e) => setDataCategories(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Personnes concernees *
          </label>
          <Input value={dataSubjects} onChange={(e) => setDataSubjects(e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destinataires (separes par virgule)
          </label>
          <Input value={recipients} onChange={(e) => setRecipients(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duree de conservation *
          </label>
          <Input value={retentionPeriod} onChange={(e) => setRetentionPeriod(e.target.value)} required />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mesures de securite (separees par virgule)
        </label>
        <Input value={securityMeasures} onChange={(e) => setSecurityMeasures(e.target.value)} />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={transferOutsideEu}
            onChange={(e) => setTransferOutsideEu(e.target.checked)}
            className="rounded border-gray-300"
          />
          Transfert hors UE
        </label>
        {transferOutsideEu && (
          <div className="flex-1">
            <Input
              value={transferDetails}
              onChange={(e) => setTransferDetails(e.target.value)}
              placeholder="Details du transfert (pays, garanties...)"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit">Enregistrer</Button>
      </div>
    </form>
  );
}
