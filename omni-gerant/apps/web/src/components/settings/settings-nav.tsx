'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const items = [
  { href: '/settings/profile', label: 'Profil entreprise' },
  { href: '/settings/team', label: '👥 Équipe' },
  { href: '/settings/billing', label: '💳 Abonnement' },
  { href: '/settings/payments', label: 'Paiements' },
  { href: '/settings/accounting', label: 'Comptabilité' },
  { href: '/settings/ppf', label: 'PPF' },
  { href: '/settings/connectors', label: 'Connecteurs' },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-gray-200 mb-6 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                active
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
