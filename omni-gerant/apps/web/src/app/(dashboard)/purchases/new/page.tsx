'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { PurchaseForm } from '@/components/purchase/purchase-form';

export default function NewPurchasePage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/purchases" className="text-sm text-gray-500 hover:text-gray-700 mb-1 block">
          ← Retour aux achats
        </Link>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Nouvelle facture d&apos;achat</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <PurchaseForm />
        </CardContent>
      </Card>
    </div>
  );
}
