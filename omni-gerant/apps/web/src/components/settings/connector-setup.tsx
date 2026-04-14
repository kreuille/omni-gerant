'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ConnectorSetupProps {
  type: string;
  displayName: string;
  onClose: () => void;
}

export function ConnectorSetup({ type, displayName, onClose }: ConnectorSetupProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [syncInterval, setSyncInterval] = useState('24');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Call API to save connector config
    // POST /api/settings/connectors with encrypted credentials
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Configurer {displayName}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Identifiant
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Email ou identifiant"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe du portail"
            />
            <p className="text-xs text-gray-400 mt-1">
              Vos identifiants sont chiffres AES-256 et jamais stockes en clair.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequence de synchronisation (heures)
            </label>
            <Input
              type="number"
              value={syncInterval}
              onChange={(e) => setSyncInterval(e.target.value)}
              min="1"
              max="168"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !username || !password}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
