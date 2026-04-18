'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InsuranceCard } from '@/components/legal/insurance-card';
import { ExpiryAlert } from '@/components/legal/expiry-alert';

// BUSINESS RULE [CDC-2.4]: Page liste assurances

interface Insurance {
  id: string;
  type: string;
  insurer: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  premium_cents: number;
  document_url: string | null;
}

export default function InsurancePage() {
  const [insurances, setInsurances] = useState<Insurance[]>([
    {
      id: '1',
      type: 'rc_pro',
      insurer: 'AXA Assurances',
      contract_number: 'RC-2026-001',
      start_date: '2026-01-01',
      end_date: '2027-01-01',
      premium_cents: 120000,
      document_url: '/uploads/rc-pro.pdf',
    },
    {
      id: '2',
      type: 'decennale',
      insurer: 'MAAF Pro',
      contract_number: 'DEC-2026-042',
      start_date: '2026-04-01',
      end_date: '2026-05-15',
      premium_cents: 350000,
      document_url: null,
    },
  ]);

  const alerts = insurances
    .map((ins) => {
      const days = Math.floor(
        (new Date(ins.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (days < 0 || days > 60) return null;
      const level = days <= 7 ? 'urgent' as const : days <= 30 ? 'warning' as const : 'info' as const;
      return {
        id: ins.id,
        type: ins.type,
        insurer: ins.insurer,
        endDate: ins.end_date,
        daysUntil: days,
        level,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  const handleDelete = (id: string) => {
    setInsurances((prev) => prev.filter((i) => i.id !== id));
  };

  const totalPremium = insurances.reduce((sum, i) => sum + i.premium_cents, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Coffre-Fort Assurances</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerez vos contrats d'assurance et attestations.
          </p>
        </div>
        <a href="/legal/insurance/upload">
          <Button>Ajouter une assurance</Button>
        </a>
      </div>

      {/* Alertes echeance */}
      <ExpiryAlert alerts={alerts} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{insurances.length}</p>
            <p className="text-sm text-gray-500">Contrats actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {insurances.filter((i) => i.document_url).length}
            </p>
            <p className="text-sm text-gray-500">Attestations jointes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-700">
              {(totalPremium / 100).toFixed(2).replace('.', ',')} EUR
            </p>
            <p className="text-sm text-gray-500">Total primes annuelles</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste */}
      <div className="space-y-4">
        {insurances.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-400">
              Aucune assurance enregistree. Ajoutez votre premiere assurance.
            </CardContent>
          </Card>
        ) : (
          insurances.map((ins) => (
            <InsuranceCard
              key={ins.id}
              id={ins.id}
              type={ins.type}
              insurer={ins.insurer}
              contractNumber={ins.contract_number}
              startDate={ins.start_date}
              endDate={ins.end_date}
              premiumCents={ins.premium_cents}
              documentUrl={ins.document_url}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
