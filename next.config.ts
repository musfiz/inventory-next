import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // output: 'export',
  output: 'standalone',
  trailingSlash: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.musfiz.com',
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
