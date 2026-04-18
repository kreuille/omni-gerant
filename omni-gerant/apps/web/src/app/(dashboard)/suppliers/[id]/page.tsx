'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SupplierDetailPage() {

  // Placeholder - sera connecte a l'API
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/suppliers" className="text-sm text-gray-500 hover:text-gray-700 mb-1 block">
            ← Retour aux fournisseurs
          </Link>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Fournisseur</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Modifier</Button>
          <Button variant="destructive">Supprimer</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Informations</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Nom</span>
                <span className="font-medium">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SIRET</span>
                <span className="font-mono">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span>-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Telephone</span>
                <span>-</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Coordonnees bancaires</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">IBAN</span>
                <span className="font-mono">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">BIC</span>
                <span className="font-mono">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Delai paiement</span>
                <span>30 jours</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Factures recentes</h2>
          <p className="text-sm text-gray-500">Aucune facture pour ce fournisseur.</p>
        </CardContent>
      </Card>
    </div>
  );
}
