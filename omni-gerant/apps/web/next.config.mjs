/** @type {import('next').NextConfig} */

// P1-05 : CSP stricte sur toutes les pages
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'https://omni-gerant-api.onrender.com';

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js hydration
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${API_ORIGIN} https://api.stripe.com https://checkout.stripe.com`,
  "frame-src 'self' https://checkout.stripe.com https://billing.stripe.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.stripe.com")' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig = {
  transpilePackages: ['@zenadmin/shared'],
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
      ?? (process.env.VERCEL ? 'https://omni-gerant-api.onrender.com' : 'http://localhost:3001'),
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  // P2-01 : redirections FR -> routes EN
  async redirects() {
    return [
      { source: '/devis', destination: '/quotes', permanent: true },
      { source: '/devis/:path*', destination: '/quotes/:path*', permanent: true },
      { source: '/factures', destination: '/invoices', permanent: true },
      { source: '/factures/:path*', destination: '/invoices/:path*', permanent: true },
      { source: '/achats', destination: '/purchases', permanent: true },
      { source: '/achats/:path*', destination: '/purchases/:path*', permanent: true },
      { source: '/banque', destination: '/bank', permanent: true },
      { source: '/banque/:path*', destination: '/bank/:path*', permanent: true },
      { source: '/effectif', destination: '/hr', permanent: true },
      { source: '/effectif/:path*', destination: '/hr/:path*', permanent: true },
      { source: '/parametres', destination: '/settings', permanent: true },
      { source: '/parametres/:path*', destination: '/settings/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
