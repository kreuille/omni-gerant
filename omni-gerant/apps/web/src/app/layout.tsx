import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: {
    default: 'zenAdmin — Gestion complète pour TPE',
    template: '%s | zenAdmin',
  },
  description:
    'Plateforme SaaS tout-en-un pour TPE, artisans et auto-entrepreneurs. Conforme Factur-X 2026.',
  keywords: ['facturation', 'TPE', 'artisan', 'DUERP', 'devis', 'tresorerie', 'Factur-X'],
  authors: [{ name: 'zenAdmin' }],
  manifest: '/manifest.webmanifest',
  themeColor: '#2563eb',
  appleWebApp: {
    capable: true,
    title: 'zenAdmin',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'zenAdmin',
    title: 'zenAdmin — Gestion complète pour TPE',
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
      <head>
        {/* Vague C2 : service worker PWA pour installation + cache assets */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); }); }`,
          }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
