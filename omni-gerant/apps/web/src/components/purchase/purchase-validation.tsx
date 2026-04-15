'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// BUSINESS RULE [CDC-2.2]: Workflow de validation achat
// pending -> validated -> paid

interface PurchaseValidationProps {
  purchaseId: string;
  currentStatus: string;
}

export function PurchaseValidation({ purchaseId: _purchaseId, currentStatus }: PurchaseValidationProps) {
  const canValidate = currentStatus === 'pending';
  const canDispute = currentStatus === 'pending' || currentStatus === 'validated';
  const canPay = currentStatus === 'validated';
  const canRevert = currentStatus === 'validated' || currentStatus === 'disputed';

  if (currentStatus === 'paid') {
    return (
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-2">Actions</h2>
          <p className="text-sm text-green-600 font-medium">Facture payee</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>
        <div className="space-y-2">
          {canValidate && (
            <Button className="w-full" size="sm">
              Valider la facture
            </Button>
          )}
          {canPay && (
            <Button className="w-full" size="sm" variant="outline">
              Enregistrer un paiement
            </Button>
          )}
          {canDispute && (
            <Button className="w-full" size="sm" variant="outline">
              Signaler un litige
            </Button>
          )}
          {canRevert && (
            <Button className="w-full" size="sm" variant="outline">
              Remettre en attente
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
