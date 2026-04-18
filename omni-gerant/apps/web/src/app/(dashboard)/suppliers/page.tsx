'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SuppliersPage() {
  const [search, setSearch] = useState('');

  // Placeholder - sera connecte a l'API
  const suppliers: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    category: string | null;
    iban: string | null;
    payment_terms: number;
  }> = [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Fournisseurs</h1>
        <Button>Nouveau fournisseur</Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Rechercher un fournisseur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p className="text-lg mb-2">Aucun fournisseur pour le moment</p>
            <p className="text-sm">Ajoutez votre premier fournisseur pour commencer a gerer vos achats.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Nom</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Telephone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Categorie</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">IBAN</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Delai paiement</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/suppliers/${supplier.id}`} className="text-primary-600 hover:underline font-medium">
                        {supplier.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{supplier.email ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{supplier.phone ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{supplier.category ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {supplier.iban ? `${supplier.iban.slice(0, 4)}****${supplier.iban.slice(-4)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{supplier.payment_terms}j</td>
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
