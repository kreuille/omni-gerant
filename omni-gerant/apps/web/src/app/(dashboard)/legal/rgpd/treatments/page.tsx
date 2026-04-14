'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TreatmentForm } from '@/components/legal/treatment-form';
import { TreatmentList } from '@/components/legal/treatment-list';

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

// Default treatments for demo
const DEFAULT_TREATMENTS: Treatment[] = [
  {
    id: '1',
    name: 'Gestion de la relation client',
    purpose: 'Gestion du fichier clients, suivi des commandes, SAV',
    legal_basis: 'contrat',
    data_categories: ['Identite', 'Coordonnees', 'Donnees de facturation', 'Historique commandes'],
    data_subjects: 'Clients et prospects',
    recipients: ['Personnel habilite', 'Prestataire hebergement'],
    retention_period: '3 ans apres fin de relation commerciale',
    security_measures: ['Mot de passe', 'Chiffrement TLS', 'Sauvegardes'],
    transfer_outside_eu: false,
    transfer_details: null,
  },
  {
    id: '2',
    name: 'Facturation et comptabilite',
    purpose: 'Emission factures, gestion comptable, declarations fiscales',
    legal_basis: 'obligation_legale',
    data_categories: ['Identite', 'Coordonnees', 'Donnees bancaires', 'Montants'],
    data_subjects: 'Clients et fournisseurs',
    recipients: ['Personnel comptable', 'Expert-comptable', 'Administration fiscale'],
    retention_period: '10 ans (obligation legale)',
    security_measures: ['Acces restreint', 'Archivage securise', 'Piste d\'audit'],
    transfer_outside_eu: false,
    transfer_details: null,
  },
  {
    id: '3',
    name: 'Gestion des fournisseurs',
    purpose: 'Suivi commandes fournisseurs, contrats, paiements',
    legal_basis: 'contrat',
    data_categories: ['Identite contact', 'Coordonnees pro', 'Donnees entreprise', 'RIB'],
    data_subjects: 'Fournisseurs et sous-traitants',
    recipients: ['Personnel habilite', 'Banque'],
    retention_period: '5 ans apres fin du contrat',
    security_measures: ['Acces par profil', 'Chiffrement bancaire', 'Journalisation'],
    transfer_outside_eu: false,
    transfer_details: null,
  },
  {
    id: '4',
    name: 'Gestion du personnel',
    purpose: 'Administration salaries, paie, conges, formation',
    legal_basis: 'obligation_legale',
    data_categories: ['Identite', 'N° securite sociale', 'Coordonnees', 'Donnees bancaires', 'Paie'],
    data_subjects: 'Salaries et stagiaires',
    recipients: ['Service RH', 'Expert-comptable', 'Organismes sociaux'],
    retention_period: '5 ans apres depart (50 ans bulletins de paie)',
    security_measures: ['Acces limite RH', 'Chiffrement', 'Coffre-fort numerique', 'Journalisation'],
    transfer_outside_eu: false,
    transfer_details: null,
  },
  {
    id: '5',
    name: 'Prospection commerciale',
    purpose: 'Communications commerciales, newsletters, offres',
    legal_basis: 'interet_legitime',
    data_categories: ['Identite', 'Coordonnees', 'Historique interactions'],
    data_subjects: 'Prospects et anciens clients',
    recipients: ['Personnel commercial', 'Prestataire emailing'],
    retention_period: '3 ans apres dernier contact',
    security_measures: ['Lien desinscription', 'Base separee', 'Consentement trace'],
    transfer_outside_eu: false,
    transfer_details: null,
  },
];

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>(DEFAULT_TREATMENTS);
  const [showForm, setShowForm] = useState(false);

  const handleAddTreatment = (data: {
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
    const treatment: Treatment = {
      id: crypto.randomUUID(),
      ...data,
      transfer_details: data.transfer_details || null,
    };
    setTreatments((prev) => [...prev, treatment]);
    setShowForm(false);
  };

  const handleDeleteTreatment = (id: string) => {
    setTreatments((prev) => prev.filter((t) => t.id !== id));
  };

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
