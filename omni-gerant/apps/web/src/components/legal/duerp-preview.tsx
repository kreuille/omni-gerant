'use client';

import { Badge } from '@/components/ui/badge';

// BUSINESS RULE [CDC-2.4]: Preview des risques du DUERP

interface Risk {
  id: string;
  category: string;
  name: string;
  description: string | null;
  gravity: number;
  probability: number;
  risk_level: number;
  risk_label: string;
  preventive_actions: string[];
  responsible: string | null;
}

interface DuerpPreviewProps {
  risks: Risk[];
  onEdit?: (riskId: string) => void;
  onDelete?: (riskId: string) => void;
}

function levelBadge(label: string): JSX.Element {
  const variants: Record<string, 'error' | 'default' | 'info' | 'success'> = {
    critique: 'error',
    eleve: 'default',
    modere: 'info',
    faible: 'success',
  };
  return <Badge variant={variants[label] || 'default'}>{label}</Badge>;
}

export function DuerpPreview({ risks, onEdit, onDelete }: DuerpPreviewProps) {
  // Group by category
  const grouped = new Map<string, Risk[]>();
  for (const risk of risks) {
    const existing = grouped.get(risk.category) || [];
    existing.push(risk);
    grouped.set(risk.category, existing);
  }

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([category, categoryRisks]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            {category}
          </h3>
          <div className="space-y-2">
            {categoryRisks.map((risk) => (
              <div key={risk.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{risk.name}</span>
                      {levelBadge(risk.risk_label)}
                      <span className="text-xs text-gray-400">
                        G{risk.gravity} x P{risk.probability} = {risk.risk_level}
                      </span>
                    </div>
                    {risk.description && (
                      <p className="text-sm text-gray-500 mb-2">{risk.description}</p>
                    )}
                    {risk.preventive_actions.length > 0 && (
                      <ul className="text-xs text-gray-600 list-disc list-inside">
                        {risk.preventive_actions.map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    )}
                    {risk.responsible && (
                      <p className="text-xs text-gray-400 mt-1">Responsable: {risk.responsible}</p>
                    )}
                  </div>
                  {(onEdit || onDelete) && (
                    <div className="flex gap-1 ml-2">
                      {onEdit && (
                        <button className="text-xs text-blue-600 hover:underline" onClick={() => onEdit(risk.id)}>
                          Modifier
                        </button>
                      )}
                      {onDelete && (
                        <button className="text-xs text-red-600 hover:underline" onClick={() => onDelete(risk.id)}>
                          Supprimer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
