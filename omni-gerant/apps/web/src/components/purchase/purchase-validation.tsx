'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-2.2]: Workflow de validation achat
// pending -> validated -> paid

interface PurchaseValidationProps {
  purchaseId: string;
  currentStatus: string;
  totalTtcCents?: number;
  paidCents?: number;
  onStatusChange?: () => void;
}

export function PurchaseValidation({
  purchaseId,
  currentStatus,
  totalTtcCents = 0,
  paidCents = 0,
  onStatusChange,
}: PurchaseValidationProps) {
  const [acting, setActing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  const canValidate = currentStatus === 'pending';
  const canDispute = currentStatus === 'pending' || currentStatus === 'validated';
  const canPay = currentStatus === 'validated';
  const canRevert = currentStatus === 'validated' || currentStatus === 'disputed';

  const handleValidate = async (status: 'validated' | 'disputed') => {
    setActing(true);
    const result = await api.post(`/api/purchases/${purchaseId}/validate`, { status });
    if (result.ok) {
      onStatusChange?.();
    } else {
      alert(result.error.message);
    }
    setActing(false);
  };

  const handleRevert = async () => {
    setActing(true);
    const result = await api.post(`/api/purchases/${purchaseId}/validate`, { status: 'pending' as never });
    if (result.ok) {
      onStatusChange?.();
    } else {
      alert(result.error.message);
    }
    setActing(false);
  };

  const handlePay = async () => {
    const cents = Math.round(parseFloat(paymentAmount) * 100);
    if (isNaN(cents) || cents <= 0) {
      alert('Montant invalide');
      return;
    }
    setActing(true);
    const result = await api.post(`/api/purchases/${purchaseId}/pay`, { amount_cents: cents });
    if (result.ok) {
      setShowPayment(false);
      setPaymentAmount('');
      onStatusChange?.();
    } else {
      alert(result.error.message);
    }
    setActing(false);
  };

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

  const remaining = totalTtcCents - paidCents;

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>
        <div className="space-y-2">
          {canValidate && (
            <Button className="w-full" size="sm" onClick={() => handleValidate('validated')} disabled={acting}>
              {acting ? 'En cours...' : 'Valider la facture'}
            </Button>
          )}
          {canPay && !showPayment && (
            <Button className="w-full" size="sm" variant="outline" onClick={() => {
              setPaymentAmount((remaining / 100).toFixed(2));
              setShowPayment(true);
            }}>
              Enregistrer un paiement
            </Button>
          )}
          {showPayment && (
            <div className="space-y-2 border rounded-md p-3">
              <label className="block text-sm font-medium text-gray-700">
                Montant (EUR) - reste: {(remaining / 100).toFixed(2)}
              </label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min={0.01}
                step="0.01"
                max={(remaining / 100)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handlePay} disabled={acting} className="flex-1">
                  {acting ? 'En cours...' : 'Payer'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowPayment(false)} className="flex-1">
                  Annuler
                </Button>
              </div>
            </div>
          )}
          {canDispute && (
            <Button className="w-full" size="sm" variant="outline" onClick={() => handleValidate('disputed')} disabled={acting}>
              Signaler un litige
            </Button>
          )}
          {canRevert && (
            <Button className="w-full" size="sm" variant="outline" onClick={handleRevert} disabled={acting}>
              Remettre en attente
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
