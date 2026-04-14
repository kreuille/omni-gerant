'use client';

import { useState } from 'react';
import { MobileNav } from './mobile-nav';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <h2 className="text-sm font-semibold text-gray-700">Mon Entreprise</h2>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">A</span>
            </div>
          </div>
        </div>
      </header>

      <MobileNav open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
