'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// BUSINESS RULE [CDC-2.3]: Suggestion de rapprochement

interface MatchSuggestionProps {
  transactionId: string;
  transactionLabel: string;
  transactionAmount: number;
  transactionDate: string;
  candidateId: string;
  candidateType: 'invoice' | 'purchase';
  candidateNumber: string | null;
  candidateAmount: number;
  entityName: string | null;
  score: number;
  matchedRules: string[];
  onAccept: (transactionId: string, candidateId: string, candidateType: string) => void;
  onReject: (transactionId: string, candidateId: string) => void;
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function scoreColor(score: number): string {
  if (score >= 90) return 'text-green-600 bg-green-50';
  if (score >= 60) return 'text-yellow-600 bg-yellow-50';
  return 'text-orange-600 bg-orange-50';
}

const RULE_LABELS: Record<string, string> = {
  exact_amount: 'Montant exact',
  reference: 'Reference',
  entity_name: 'Client/Fournisseur',
  temporal: 'Date proche',
};

export function MatchSuggestion({
  transactionId,
  transactionLabel,
  transactionAmount,
  transactionDate,
  candidateId,
  candidateType,
  candidateNumber,
  candidateAmount,
  entityName,
  score,
  matchedRules,
  onAccept,
  onReject,
}: MatchSuggestionProps) {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Transaction */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-semibold ${transactionAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {transactionAmount >= 0 ? '+' : ''}{formatAmount(transactionAmount)}
              </span>
              <span className="text-sm text-gray-700">{transactionLabel}</span>
              <span className="text-xs text-gray-400">{new Date(transactionDate).toLocaleDateString('fr-FR')}</span>
            </div>

            {/* Match candidate */}
            <div className="flex items-center gap-2 text-sm text-gray-600 ml-4">
              <span className="text-gray-400">&#8594;</span>
              <Badge variant="info">
                {candidateType === 'invoice' ? 'Facture' : 'Achat'}
              </Badge>
              {candidateNumber && <span className="font-mono">{candidateNumber}</span>}
              {entityName && <span className="text-gray-500">({entityName})</span>}
              <span className="font-medium">{formatAmount(candidateAmount)}</span>
            </div>

            {/* Matched rules */}
            <div className="flex items-center gap-1 mt-2 ml-4">
              {matchedRules.map((rule) => (
                <Badge key={rule} variant="info" className="text-xs">
                  {RULE_LABELS[rule] || rule}
                </Badge>
              ))}
            </div>
          </div>

          {/* Score + actions */}
          <div className="flex items-center gap-3 ml-4">
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${scoreColor(score)}`}>
              {score}%
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={() => onAccept(transactionId, candidateId, candidateType)}
              >
                Valider
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(transactionId, candidateId)}
              >
                Rejeter
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
