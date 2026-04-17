'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InsuranceCard } from '@/components/legal/insurance-card';
import { ExpiryAlert } from '@/components/legal/expiry-alert';
import { api } from '@/lib/api-client';

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
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInsurances = useCallback(async () => {
    const result = await api.get<Insurance[]>('/api/legal/insurance');
    if (result.ok) {
      setInsurances(result.value);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInsurances();
  }, [loadInsurances]);

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

  const handleDelete = async (id: string) => {
    const result = await api.delete(`/api/legal/insurance/${id}`);
    if (result.ok) {
      setInsurances((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const totalPremium = insurances.reduce((sum, i) => sum + i.premium_cents, 0);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Coffre-Fort Assurances</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-gray-400">Chargement...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coffre-Fort Assurances</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerez vos contrats d&apos;assurance et attestations.
          </p>
        </div>
        <a href="/legal/insurance/upload">
          <Button>Ajouter une assurance</Button>
        </a>
      </div>

      <ExpiryAlert alerts={alerts} />

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
