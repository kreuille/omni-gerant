'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

// BUSINESS RULE [CDC-2.4]: Hub Legal — acces DUERP, RGPD, Assurances

const LEGAL_SECTIONS = [
  {
    title: 'DUERP',
    description: "Document Unique d'Evaluation des Risques Professionnels",
    href: '/legal/duerp',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    title: 'RGPD',
    description: 'Registre des traitements et conformite RGPD',
    href: '/legal/rgpd',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    color: 'text-green-600 bg-green-50',
  },
  {
    title: 'Assurances',
    description: 'Coffre-fort numerique pour vos contrats et attestations',
    href: '/legal/insurance',
    icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
    color: 'text-purple-600 bg-purple-50',
  },
];

export default function LegalPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Legal & Conformite</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gerez vos obligations legales et documents de conformite
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {LEGAL_SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className={`inline-flex p-3 rounded-lg ${section.color} mb-4`}>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={section.icon}
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {section.title}
                </h2>
                <p className="text-sm text-gray-500">{section.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
