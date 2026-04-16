import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: {
    default: 'zenAdmin — Gestion complete pour TPE',
    template: '%s | zenAdmin',
  },
  description:
    'Plateforme SaaS tout-en-un pour TPE, artisans et auto-entrepreneurs. Conforme Factur-X 2026.',
  keywords: ['facturation', 'TPE', 'artisan', 'DUERP', 'devis', 'tresorerie', 'Factur-X'],
  authors: [{ name: 'zenAdmin' }],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'zenAdmin',
    title: 'zenAdmin — Gestion complete pour TPE',
    description:
      'Plateforme SaaS tout-en-un pour TPE, artisans et auto-entrepreneurs.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
