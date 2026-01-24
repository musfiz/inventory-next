import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, verifyToken } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ['/login', '/', '/web'];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  // Admin routes
  const isAdminRoute = pathname.startsWith('/admin');

  // If trying to access admin route
  if (isAdminRoute) {
    if (!token) {
      // Not authenticated, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const user = verifyToken(token);
    if (!user || user.role !== 'admin') {
      // Not authorized, redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // If already logged in and trying to access login page
  if (pathname === '/login' && token) {
    const user = verifyToken(token);
    if (user?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
