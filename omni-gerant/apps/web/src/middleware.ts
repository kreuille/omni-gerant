import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// BUSINESS RULE [CDC-6]: Next.js middleware — CSP, security headers, auth redirects

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );

  // HSTS
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload',
  );

  // Content Security Policy
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://omni-gerant-api.onrender.com';
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires these
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiUrl} https://api-sandbox.ppf.gouv.fr https://api.gocardless.com https://api.stripe.com`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // Auth redirect — protect dashboard routes (disabled in development)
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev) {
    const { pathname } = request.nextUrl;
    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isPublicPage = pathname.startsWith('/onboarding') || pathname.startsWith('/step-') || pathname.startsWith('/public') || pathname.startsWith('/share') || pathname === '/maintenance';
    const isApiRoute = pathname.startsWith('/api/');

    if (!isAuthPage && !isPublicPage && !isApiRoute) {
      const token = request.cookies.get('auth_token')?.value;
      if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
