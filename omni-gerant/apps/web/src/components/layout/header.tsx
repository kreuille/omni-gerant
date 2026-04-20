'use client';

import { useState, useEffect } from 'react';
import { MobileNav } from './mobile-nav';
import { NotificationsBell } from './notifications-bell';

interface StoredUser {
  first_name?: string;
  last_name?: string;
  email?: string;
  company_name?: string;
}

function getUserFromStorage(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

function getInitial(user: StoredUser | null): string {
  if (user?.first_name) return user.first_name.charAt(0).toUpperCase();
  if (user?.last_name) return user.last_name.charAt(0).toUpperCase();
  if (user?.email) return user.email.charAt(0).toUpperCase();
  return '?';
}

function getCompanyName(user: StoredUser | null): string {
  if (user?.company_name) return user.company_name;
  const tenantRaw = typeof window !== 'undefined' ? localStorage.getItem('tenant') : null;
  if (tenantRaw) {
    try {
      const tenant = JSON.parse(tenantRaw);
      if (tenant?.company_name) return tenant.company_name as string;
    } catch { /* ignore */ }
  }
  return 'Mon Entreprise';
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    setUser(getUserFromStorage());
  }, []);

  const initial = getInitial(user);
  const companyName = getCompanyName(user);
  const userName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';

  return (
    <>
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden -ml-2 p-2 rounded-md text-gray-400 hover:text-gray-500"
            onClick={() => setMobileMenuOpen(true)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Company name */}
          <div className="flex-1 md:ml-0 ml-4">
            <h2 className="text-sm font-semibold text-gray-700">{companyName}</h2>
          </div>

          {/* User menu + notifications */}
          <div className="flex items-center gap-3">
            <NotificationsBell />
            {userName && (
              <span className="hidden sm:block text-sm text-gray-600">{userName}</span>
            )}
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">{initial}</span>
            </div>
          </div>
        </div>
      </header>

      <MobileNav open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
