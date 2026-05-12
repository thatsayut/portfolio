import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Silence the "multiple lockfiles" workspace-root warning
  outputFileTracingRoot: require('path').join(__dirname, '../'),

  // Vercel needs standalone output for optimal deployment
  output: isProd ? 'standalone' : undefined,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.githubusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },

  // Only proxy API in development — in production, frontend calls the API directly
  async rewrites() {
    if (isProd) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
