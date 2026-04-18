'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' EUR';
}

export default function OverdueInvoicesPage() {
  // Placeholder - will fetch from API
  const invoices: Array<{
    id: string;
    number: string;
    client_name: string;
    due_date: string;
    days_overdue: number;
    remaining_cents: number;
    last_reminder_level: number | null;
  }> = [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Factures en retard</h1>
        <Link href="/invoices" className="text-sm text-primary-600 hover:underline">
          Toutes les factures
        </Link>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p className="text-lg mb-2">Aucune facture en retard</p>
            <p className="text-sm">Toutes vos factures sont a jour.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Facture</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Client</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Echeance</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Retard</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Reste a payer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Relance</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${inv.id}`} className="text-primary-600 hover:underline font-medium">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{inv.client_name}</td>
                    <td className="px-4 py-3 text-red-600">{inv.due_date}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">J+{inv.days_overdue}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCents(inv.remaining_cents)}</td>
                    <td className="px-4 py-3">
                      {inv.last_reminder_level && (
                        <Badge variant="warning">Niveau {inv.last_reminder_level}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
