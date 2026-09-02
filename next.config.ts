import type { NextConfig } from 'next';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
const backendHost = (() => {
  try {
    return new URL(backendUrl).host;
  } catch {
    return '';
  }
})();

const isDev = process.env.NODE_ENV !== 'production';
const csp = [
  "default-src 'self'",
  // Next.js bootstrap requires inline scripts; eval is only needed in dev (React Refresh).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https:${backendHost ? ` http://${backendHost} https://${backendHost}` : ''}`,
  "font-src 'self' data: https://fonts.gstatic.com",
  backendHost ? `connect-src 'self' https://${backendHost} http://${backendHost}` : "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // output: 'export',
  output: 'standalone',
  images: {
    // Local dev backend runs on localhost, which next/image blocks by default (SSRF protection)
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.musfiz.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8002',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    const target = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
    if (!target) return [];
    return [
      { source: '/api/:path*', destination: `${target}/api/:path*` },
      { source: '/sanctum/:path*', destination: `${target}/sanctum/:path*` },
    ];
  },
};

export default nextConfig;
