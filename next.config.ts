import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // optimizeCss: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
};

export default nextConfig;
