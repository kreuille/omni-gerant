'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Vague D3 : Bottom nav mobile (ergonomie pouce). Visible sur mobile seulement.

interface NavItem {
  href: string;
  label: string;
  icon: string; // emoji ou SVG path
}

const ITEMS: NavItem[] = [
  { href: '/', label: 'Bureau', icon: '🏠' },
  { href: '/quotes', label: 'Devis', icon: '📄' },
  { href: '/invoices', label: 'Factures', icon: '💶' },
  { href: '/purchases', label: 'Achats', icon: '🧾' },
  { href: '/settings/profile', label: 'Plus', icon: '☰' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  const active = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <ul className="flex items-center justify-around h-14">
        {ITEMS.map((item) => {
          const isActive = active(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center h-full text-[11px] ${
                  isActive ? 'text-primary-700 font-semibold' : 'text-gray-500'
                }`}
              >
                <span className="text-xl leading-none mb-0.5">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
