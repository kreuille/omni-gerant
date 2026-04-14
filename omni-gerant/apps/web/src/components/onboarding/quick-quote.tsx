'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// BUSINESS RULE [CDC-4]: Mini editeur devis onboarding

interface QuickQuoteProps {
  onComplete: () => void;
}

interface QuoteLine {
  description: string;
  quantity: number;
  unit_price: string;
}

export function QuickQuote({ onComplete }: QuickQuoteProps) {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [lines, setLines] = useState<QuoteLine[]>([
    { description: '', quantity: 1, unit_price: '' },
  ]);

  const handleAddLine = () => {
    if (lines.length < 3) {
      setLines([...lines, { description: '', quantity: 1, unit_price: '' }]);
    }
  };

  const handleLineChange = (index: number, field: keyof QuoteLine, value: string | number) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index]!, [field]: value };
      return updated;
    });
  };

  const total = lines.reduce((sum, l) => {
    const price = parseFloat(l.unit_price) || 0;
    return sum + l.quantity * price;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Client rapide */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Votre premier client</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nom</label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nom du client"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="email@client.fr"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lignes de devis */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Lignes du devis</h3>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <div className="col-span-6">
                  <Input
                    value={line.description}
                    onChange={(e) => handleLineChange(i, 'description', e.target.value)}
                    placeholder="Description"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={line.quantity}
                    onChange={(e) => handleLineChange(i, 'quantity', parseInt(e.target.value) || 0)}
                    min={1}
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    type="number"
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) => handleLineChange(i, 'unit_price', e.target.value)}
                    placeholder="Prix HT"
                  />
                </div>
              </div>
            ))}
          </div>

          {lines.length < 3 && (
            <button
              onClick={handleAddLine}
              className="text-sm text-blue-600 hover:underline mt-2"
            >
              + Ajouter une ligne
            </button>
          )}

          <div className="flex justify-between items-center mt-4 pt-3 border-t">
            <span className="text-sm text-gray-500">Total HT</span>
            <span className="text-lg font-bold text-gray-900">
              {total.toFixed(2).replace('.', ',')} EUR
            </span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onComplete} className="w-full">
        Creer mon premier devis
      </Button>
    </div>
  );
}
