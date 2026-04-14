'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConnectorSetup } from './connector-setup';

interface ConnectorCardProps {
  type: string;
  displayName: string;
  description: string;
  enabled: boolean;
  lastSyncAt?: string;
}

export function ConnectorCard({ type, displayName, description, enabled, lastSyncAt }: ConnectorCardProps) {
  const [showSetup, setShowSetup] = useState(false);

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{displayName}</h3>
                <Badge variant={enabled ? 'success' : 'default'}>
                  {enabled ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">{description}</p>
              {lastSyncAt && (
                <p className="text-xs text-gray-400 mt-2">
                  Derniere sync: {new Date(lastSyncAt).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSetup(true)}
            >
              {enabled ? 'Configurer' : 'Activer'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showSetup && (
        <ConnectorSetup
          type={type}
          displayName={displayName}
          onClose={() => setShowSetup(false)}
        />
      )}
    </>
  );
}
