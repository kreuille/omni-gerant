'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// BUSINESS RULE [CDC-4]: Etape finale - C'est parti !

export default function CompletePage() {
  return (
    <div className="text-center">
      <Card>
        <CardContent className="p-8">
          <div className="text-5xl mb-4">V</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">C'est parti !</h2>
          <p className="text-gray-600 mb-6">
            Votre espace Omni-Gerant est configure. Vous etes pret a gerer
            votre entreprise en toute simplicite.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Resume de votre configuration</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-500">ok</span>
                Informations entreprise enregistrees
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">ok</span>
                Personnalisation appliquee
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">ok</span>
                Premier devis cree
              </li>
            </ul>
          </div>

          <a href="/">
            <Button size="lg" className="w-full">
              Acceder a mon tableau de bord
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
