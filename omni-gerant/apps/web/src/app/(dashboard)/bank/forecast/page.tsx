'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ForecastChart } from '@/components/bank/forecast-chart';
import { ForecastAlert } from '@/components/bank/forecast-alert';
import { CashFlowTable } from '@/components/bank/cash-flow-table';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-2.3]: Vue previsionnel de tresorerie

interface ForecastEntry {
  date: string;
  balance_cents: number;
  incoming_cents: number;
  outgoing_cents: number;
  recurring_cents: number;
}

interface ForecastAlertData {
  type: 'warning' | 'danger';
  message: string;
  date: string;
  projected_balance_cents: number;
}

interface RecurringCharge {
  label: string;
  amount_cents: number;
  frequency: string;
  category: string;
  confidence: number;
  next_occurrences: string[];
}

interface ForecastResult {
  current_balance_cents: number;
  entries: ForecastEntry[];
  alerts: ForecastAlertData[];
  recurring_charges: RecurringCharge[];
  summary: {
    total_incoming_cents: number;
    total_outgoing_cents: number;
    total_recurring_cents: number;
    end_balance_cents: number;
  };
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export default function ForecastPage() {
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await api.get<ForecastResult>('/api/bank/forecast?days=90');

    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setForecast(result.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Chargement des previsions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 font-medium mb-2">Erreur de chargement</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={fetchForecast}>Reessayer</Button>
              <a href="/bank"><Button variant="outline">Retour</Button></a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!forecast) {
    return null;
  }

  const { entries, alerts, recurring_charges, summary, current_balance_cents } = forecast;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Previsionnel de tresorerie</h1>
          <p className="text-sm text-gray-500 mt-1">
            Projection sur 90 jours basee sur vos factures, achats et charges recurrentes.
          </p>
        </div>
        <a href="/bank">
          <Button variant="outline">Retour</Button>
        </a>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <ForecastAlert alerts={alerts} />
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Solde actuel</p>
            <p className="text-xl font-bold text-gray-900">{formatAmount(current_balance_cents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Encaissements prevus</p>
            <p className="text-xl font-bold text-green-600">+{formatAmount(summary.total_incoming_cents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Decaissements prevus</p>
            <p className="text-xl font-bold text-red-600">-{formatAmount(summary.total_outgoing_cents + summary.total_recurring_cents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Solde a J+90</p>
            <p className={`text-xl font-bold ${summary.end_balance_cents >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatAmount(summary.end_balance_cents)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique */}
      {entries.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolution du solde previsionnel</h2>
            <ForecastChart entries={entries} currency="EUR" />
          </CardContent>
        </Card>
      )}

      {/* Charges recurrentes detectees */}
      {recurring_charges.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Charges recurrentes detectees</h2>
            <div className="divide-y divide-gray-100">
              {recurring_charges.map((charge, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{charge.label}</p>
                    <p className="text-xs text-gray-400">
                      {charge.frequency} — {charge.category} — {charge.confidence}% confiance
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{formatAmount(charge.amount_cents)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state for recurring charges */}
      {recurring_charges.length === 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Charges recurrentes detectees</h2>
            <p className="text-sm text-gray-400 text-center py-4">
              Aucune charge recurrente detectee. Les charges seront detectees automatiquement au fil des transactions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tableau flux */}
      {entries.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Flux de tresorerie par semaine</h2>
            <CashFlowTable entries={entries} currency="EUR" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
