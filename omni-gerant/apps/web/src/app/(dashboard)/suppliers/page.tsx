'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-2.2]: Liste fournisseurs connectee a l'API

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  category: string | null;
  iban: string | null;
  payment_terms: number;
  siret: string | null;
}

interface SupplierListResponse {
  items: Supplier[];
  next_cursor: string | null;
  has_more: boolean;
}

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // New supplier form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSiret, setFormSiret] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('30');

  const fetchSuppliers = useCallback(async (searchQuery?: string) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: '100', sort_by: 'name', sort_dir: 'asc' });
    if (searchQuery) params.set('search', searchQuery);
    const result = await api.get<SupplierListResponse>(`/api/suppliers?${params.toString()}`);
    if (result.ok) {
      setSuppliers(result.value.items);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers(search || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchSuppliers]);

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormSiret('');
    setFormCategory('');
    setFormPaymentTerms('30');
  };

  const handleCreateSupplier = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      name: formName.trim(),
      payment_terms: parseInt(formPaymentTerms) || 30,
    };
    if (formEmail.trim()) body['email'] = formEmail.trim();
    if (formPhone.trim()) body['phone'] = formPhone.trim();
    if (formSiret.trim()) body['siret'] = formSiret.trim();
    if (formCategory.trim()) body['category'] = formCategory.trim();

    const result = await api.post<Supplier>('/api/suppliers', body);
    if (result.ok) {
      setShowForm(false);
      resetForm();
      fetchSuppliers(search || undefined);
    } else {
      alert(result.error.message);
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
        <Button onClick={() => setShowForm(true)}>Nouveau fournisseur</Button>
      </div>

      {/* Create supplier form */}
      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Nouveau fournisseur</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nom du fournisseur" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="01 23 45 67 89" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                <Input value={formSiret} onChange={(e) => setFormSiret(e.target.value)} placeholder="14 chiffres" maxLength={14} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
                <Input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="Ex: Materiaux, Services..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delai paiement (jours)</label>
                <Input type="number" value={formPaymentTerms} onChange={(e) => setFormPaymentTerms(e.target.value)} min={0} max={365} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Annuler</Button>
              <Button onClick={handleCreateSupplier} disabled={saving || !formName.trim()}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4">
        <Input
          placeholder="Rechercher un fournisseur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>Chargement des fournisseurs...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-red-500">
            <p className="text-lg mb-2">Erreur de chargement</p>
            <p className="text-sm">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => fetchSuppliers()}>Reessayer</Button>
          </CardContent>
        </Card>
      ) : suppliers.length === 0 ? (
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
