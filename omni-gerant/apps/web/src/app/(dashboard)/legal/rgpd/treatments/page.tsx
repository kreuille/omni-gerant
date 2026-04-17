'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TreatmentForm } from '@/components/legal/treatment-form';
import { TreatmentList } from '@/components/legal/treatment-list';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-2.4]: Gestion des traitements RGPD

interface Treatment {
  id: string;
  name: string;
  purpose: string;
  legal_basis: string;
  data_categories: string[];
  data_subjects: string;
  recipients: string[];
  retention_period: string;
  security_measures: string[];
  transfer_outside_eu: boolean;
  transfer_details: string | null;
}

interface RgpdRegistry {
  id: string;
  treatments: Treatment[];
}

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadTreatments = useCallback(async () => {
    const result = await api.get<RgpdRegistry>('/api/legal/rgpd');
    if (result.ok) {
      setTreatments(result.value.treatments);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTreatments();
  }, [loadTreatments]);

  const handleAddTreatment = async (data: {
    name: string;
    purpose: string;
    legal_basis: string;
    data_categories: string[];
    data_subjects: string;
    recipients: string[];
    retention_period: string;
    security_measures: string[];
    transfer_outside_eu: boolean;
    transfer_details: string;
  }) => {
    const result = await api.post<Treatment>('/api/legal/rgpd/treatments', {
      ...data,
      transfer_details: data.transfer_details || null,
    });
    if (result.ok) {
      setTreatments((prev) => [...prev, result.value]);
      setShowForm(false);
    } else {
      alert(result.error.message ?? 'Erreur');
    }
  };

  const handleDeleteTreatment = async (id: string) => {
    const result = await api.delete(`/api/legal/rgpd/treatments/${id}`);
    if (result.ok) {
      setTreatments((prev) => prev.filter((t) => t.id !== id));
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Traitements RGPD</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">Traitements RGPD</h1>
          <p className="text-sm text-gray-500 mt-1">
            {treatments.length} traitement{treatments.length > 1 ? 's' : ''} enregistre{treatments.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/legal/rgpd">
            <Button variant="outline">Retour au registre</Button>
          </a>
          <Button onClick={() => setShowForm(true)}>Ajouter un traitement</Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nouveau traitement</h2>
            <TreatmentForm onSubmit={handleAddTreatment} onCancel={() => setShowForm(false)} />
          </CardContent>
        </Card>
      )}

      <TreatmentList
        treatments={treatments}
        onDelete={handleDeleteTreatment}
      />
    </div>
  );
}
