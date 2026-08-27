import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the root. Without this, Turbopack walks up looking for a lockfile and
    // finds an unrelated one in the parent directory, which it then warns about.
    root: path.join(__dirname),
  },

  // Supabase Storage serves fleet photography straight from its CDN.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
};

export default nextConfig;
