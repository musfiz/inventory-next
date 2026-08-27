import { NextResponse, type NextRequest } from 'next/server';

// Laravel's default session cookie is Str::slug(APP_NAME) + '-session' (hyphen, not underscore).
const SESSION_COOKIE = process.env.AUTH_SESSION_COOKIE || 'laravel-session';

const ADMIN_PREFIXES = [
  '/access-denied',
  '/accounts',
  '/analytics',
  '/attributes',
  '/backup',
  '/bins',
  '/brands',
  '/business-types',
  '/categories',
  '/customers',
  '/dashboard',
  '/ecommerce',
  '/expenses',
  '/journal-entries',
  '/modules',
  '/payments',
  '/permissions',
  '/pos-orders',
  '/pos-refunds',
  '/pos-registers',
  '/pos-sales',
  '/pos-session',
  '/product-barcodes',
  '/products',
  '/product-variations',
  '/purchase-orders',
  '/reports',
  '/restore',
  '/sales-orders',
  '/sales-return',
  '/settings',
  '/stock',
  '/suppliers',
  '/tenants',
  '/units',
  '/user-permissions',
  '/users',
  '/warehouse',
];

const CUSTOMER_AUTH_PREFIX = '/store/account';
const CUSTOMER_GUEST_PREFIXES = ['/store/account/login', '/store/account/register'];

function hasSessionCookie(req: NextRequest): boolean {
  return Boolean(req.cookies.get(SESSION_COOKIE)?.value);
}

function isAdminProtected(pathname: string): boolean {
  return ADMIN_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

function isCustomerProtected(pathname: string): boolean {
  if (!pathname.startsWith(CUSTOMER_AUTH_PREFIX)) return false;
  if (CUSTOMER_GUEST_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return false;
  }
  return true;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Laravel issues a session cookie for every request, including guests, so
  // cookie presence only tells us "not authenticated" reliably, never "authenticated".
  // Guest-only redirects (e.g. /login -> /dashboard when already signed in) are handled
  // client-side by useAuth({ middleware: 'guest' }), which validates against /api/v1/user.
  if (isAdminProtected(pathname) || isCustomerProtected(pathname)) {
    if (!hasSessionCookie(req)) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};
