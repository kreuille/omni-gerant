'use client';

import { PlanComptable } from '@/components/accounting/plan-comptable';
import { Button } from '@/components/ui/button';

// BUSINESS RULE [CDC-3.2]: Parametres comptables

export default function AccountingSettingsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Paramètres comptables</h1>
          <p className="text-sm text-gray-500 mt-1">
            Plan comptable et configuration des journaux.
          </p>
        </div>
        <a href="/settings/accounting/export">
          <Button>Exporter le FEC</Button>
        </a>
      </div>

      <PlanComptable />
    </div>
  );
}
