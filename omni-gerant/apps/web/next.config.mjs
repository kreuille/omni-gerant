/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: transpile workspace packages
  transpilePackages: ['@omni-gerant/shared'],

  // Output standalone for Docker/production
  output: 'standalone',

  // Skip TS and ESLint during build (checked separately in CI)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Environment variables available at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  },
};

export default nextConfig;
