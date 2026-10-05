import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ── Performance optimizations ─────────────────────────────
  experimental: {
    // Optimise package imports — avoids importing entire lucide-react tree
    optimizePackageImports: ['lucide-react', '@supabase/ssr', '@supabase/supabase-js'],
  },

  // ── Image optimization ────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
    ],
    // Serve images in modern formats (WebP/AVIF) for smaller sizes
    formats: ['image/avif', 'image/webp'],
  },

  // ── HTTP cache headers ────────────────────────────────────
  // Static assets and pages cached aggressively
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
    {
      // Cache static files for 1 year
      source: '/_next/static/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      // Cache public assets for 1 day
      source: '/(logo\\.jpg|manifest\\.json|favicon\\.ico)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
    },
  ],

  // ── Turbopack (dev server speed) ─────────────────────────
  turbopack: {
    // Resolve aliases so imports are shorter and faster
    resolveAlias: {
      '@': './src',
    },
  },
};

export default nextConfig;
