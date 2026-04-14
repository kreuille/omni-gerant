'use client';

import { Card, CardContent } from '@/components/ui/card';

// BUSINESS RULE [CDC-3.2]: Plan comptable simplifie TPE

const ACCOUNTS = [
  { code: '411xxx', label: 'Clients', description: 'Comptes clients (creances)' },
  { code: '401xxx', label: 'Fournisseurs', description: 'Comptes fournisseurs (dettes)' },
  { code: '512xxx', label: 'Banque', description: 'Comptes bancaires' },
  { code: '706000', label: 'Prestations de services', description: 'Produits (CA)' },
  { code: '606000', label: 'Achats non stockes', description: 'Charges (achats)' },
  { code: '445710', label: 'TVA collectee', description: 'TVA sur ventes' },
  { code: '445660', label: 'TVA deductible', description: 'TVA sur achats' },
];

const JOURNALS = [
  { code: 'VE', label: 'Ventes', description: 'Factures emises' },
  { code: 'AC', label: 'Achats', description: 'Factures fournisseurs' },
  { code: 'BQ', label: 'Banque', description: 'Encaissements et paiements' },
];

export function PlanComptable() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Journaux comptables</h3>
          <div className="space-y-2">
            {JOURNALS.map((j) => (
              <div key={j.code} className="flex items-center gap-3 text-sm">
                <span className="font-mono font-medium text-blue-600 w-8">{j.code}</span>
                <span className="font-medium text-gray-700 w-24">{j.label}</span>
                <span className="text-gray-500">{j.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Plan comptable simplifie</h3>
          <div className="space-y-2">
            {ACCOUNTS.map((a) => (
              <div key={a.code} className="flex items-center gap-3 text-sm">
                <span className="font-mono font-medium text-gray-600 w-16">{a.code}</span>
                <span className="font-medium text-gray-700 w-40">{a.label}</span>
                <span className="text-gray-500">{a.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
