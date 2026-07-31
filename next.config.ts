import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // output: 'export',
  output: 'standalone',
  trailingSlash: true,
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
};

export default nextConfig;
