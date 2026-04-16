import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: {
    default: 'zenAdmin — Gestion complete pour TPE',
    template: '%s | zenAdmin',
  },
  description:
    'Facturation electronique, DUERP, tresorerie, devis — tout-en-un pour les TPE et artisans francais. Conforme Factur-X 2026.',
  keywords: ['facturation', 'TPE', 'artisan', 'DUERP', 'devis', 'tresorerie', 'Factur-X'],
  authors: [{ name: 'zenAdmin' }],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'zenAdmin',
    title: 'zenAdmin — Gestion complete pour TPE',
    description:
      'Facturation electronique, DUERP, tresorerie, devis — tout-en-un pour les TPE et artisans francais.',
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
