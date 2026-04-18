'use client';

import { ConnectorCard } from '@/components/settings/connector-card';

// BUSINESS RULE [CDC-2.2]: Configuration connecteurs fournisseurs

const AVAILABLE_CONNECTORS = [
  {
    type: 'amazon',
    displayName: 'Amazon Business',
    description: 'Recuperation automatique des factures Amazon Business',
    enabled: false,
  },
  {
    type: 'edf',
    displayName: 'EDF',
    description: 'Recuperation automatique des factures EDF',
    enabled: false,
  },
  {
    type: 'orange',
    displayName: 'Orange',
    description: 'Recuperation automatique des factures Orange',
    enabled: false,
  },
  {
    type: 'generic',
    displayName: 'Portail generique',
    description: 'Connecteur configurable pour tout portail fournisseur',
    enabled: false,
  },
];

export default function ConnectorsSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Connecteurs fournisseurs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configurez les connecteurs pour recuperer automatiquement vos factures.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABLE_CONNECTORS.map((connector) => (
          <ConnectorCard
            key={connector.type}
            type={connector.type}
            displayName={connector.displayName}
            description={connector.description}
            enabled={connector.enabled}
          />
        ))}
      </div>
    </div>
  );
}
