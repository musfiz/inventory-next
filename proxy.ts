import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login'];

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = ['/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token');
  const isAuthenticated = !!token;

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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
