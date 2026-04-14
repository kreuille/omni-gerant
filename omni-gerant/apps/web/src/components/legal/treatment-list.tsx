'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// BUSINESS RULE [CDC-2.4]: Liste des traitements RGPD

interface Treatment {
  id: string;
  name: string;
  purpose: string;
  legal_basis: string;
  data_categories: string[];
  data_subjects: string;
  recipients: string[];
  retention_period: string;
  security_measures: string[];
  transfer_outside_eu: boolean;
}

interface TreatmentListProps {
  treatments: Treatment[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const LEGAL_BASIS_LABELS: Record<string, string> = {
  contrat: 'Contrat',
  obligation_legale: 'Obligation legale',
  interet_legitime: 'Interet legitime',
  consentement: 'Consentement',
};

const LEGAL_BASIS_COLORS: Record<string, string> = {
  contrat: 'bg-blue-100 text-blue-800',
  obligation_legale: 'bg-purple-100 text-purple-800',
  interet_legitime: 'bg-green-100 text-green-800',
  consentement: 'bg-orange-100 text-orange-800',
};

export function TreatmentList({ treatments, onEdit, onDelete }: TreatmentListProps) {
  if (treatments.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8">
        Aucun traitement enregistre.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {treatments.map((t) => (
        <Card key={t.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEGAL_BASIS_COLORS[t.legal_basis] ?? 'bg-gray-100 text-gray-800'}`}>
                    {LEGAL_BASIS_LABELS[t.legal_basis] ?? t.legal_basis}
                  </span>
                  {t.transfer_outside_eu && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Transfert hors UE
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{t.purpose}</p>

                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div>
                    <span className="text-gray-500">Donnees : </span>
                    <span className="text-gray-700">{t.data_categories.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Personnes : </span>
                    <span className="text-gray-700">{t.data_subjects}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Destinataires : </span>
                    <span className="text-gray-700">{t.recipients.join(', ') || 'Aucun'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Conservation : </span>
                    <span className="text-gray-700">{t.retention_period}</span>
                  </div>
                </div>

                {t.security_measures.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-500">Mesures : </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.security_measures.map((m, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-1 ml-4">
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(t.id)}>
                    Modifier
                  </Button>
                )}
                {onDelete && (
                  <Button variant="outline" size="sm" onClick={() => onDelete(t.id)} className="text-red-600">
                    Supprimer
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
