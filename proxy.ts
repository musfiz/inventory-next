import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Proxy - Route Protection with Cookie-Based Authentication
 * 
 * Protects routes by checking for Laravel session cookie.
 * Since cookies are HTTP-only, we verify authentication by checking for session cookie.
 */

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/register'];

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = ['/login', '/register'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check for Laravel session cookie
  // Laravel creates session cookies with pattern: {app_name}_session
  const cookies = request.cookies;
  const hasSessionCookie = 
    cookies.has('laravel_session') || 
    cookies.has('inventory_session') ||
    // Check for any cookie that looks like a Laravel session
    Array.from(cookies.getAll()).some(cookie => 
      cookie.name.endsWith('_session') || 
      cookie.name === 'XSRF-TOKEN'
    );
  
  const isAuthenticated = hasSessionCookie;

  // Check if the current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => {
    // Exact match for root path
    if (route === '/') {
      return pathname === '/';
    }
    // startsWith for other routes
    return pathname.startsWith(route);
  });
  
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

  // Redirect to login if trying to access protected route without authentication
  if (!isPublicRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if trying to access auth routes while authenticated
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

// Configure which routes to run proxy on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (static assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
