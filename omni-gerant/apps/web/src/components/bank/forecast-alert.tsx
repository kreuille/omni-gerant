'use client';

import { Card, CardContent } from '@/components/ui/card';

// BUSINESS RULE [CDC-2.3]: Alerte solde previsionnel negatif

interface Alert {
  type: 'warning' | 'danger';
  message: string;
  date: string;
  projected_balance_cents: number;
}

interface ForecastAlertProps {
  alerts: Alert[];
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function ForecastAlert({ alerts }: ForecastAlertProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <Card
          key={index}
          className={`border-l-4 ${
            alert.type === 'danger'
              ? 'border-l-red-500 bg-red-50'
              : 'border-l-orange-500 bg-orange-50'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-semibold ${
                  alert.type === 'danger' ? 'text-red-800' : 'text-orange-800'
                }`}>
                  {alert.type === 'danger' ? 'Alerte critique' : 'Attention'}
                </p>
                <p className={`text-sm mt-1 ${
                  alert.type === 'danger' ? 'text-red-700' : 'text-orange-700'
                }`}>
                  {alert.message}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-red-600">
                  {formatAmount(alert.projected_balance_cents)}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(alert.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
