'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewInvoicePage() {
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [notes, setNotes] = useState('');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/invoices" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Retour aux factures
          </Link>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mt-1">Nouvelle facture</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Apercu PDF</Button>
          <Button>Enregistrer</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-500 text-sm">Selectionnez un client et ajoutez les lignes de facturation.</p>
              <p className="text-gray-400 text-xs mt-2">L'editeur sera connecte a l'API prochainement.</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delai de paiement (jours)</label>
                <Input
                  type="number"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(parseInt(e.target.value, 10) || 30)}
                  min={0}
                  max={365}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={4}
                  placeholder="Notes internes..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
