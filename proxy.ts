import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // For now, just allow all requests
  // Auth is handled client-side with localStorage token
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
