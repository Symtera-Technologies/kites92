/** @type {import('next').NextConfig} */
const nextConfig = {
  // cPanel / Node-selector deploys run the self-contained server in .next/standalone
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    // Shared cPanel hosts often lack a working `sharp` build. Set
    // NEXT_IMAGE_UNOPTIMIZED=1 there and ship pre-sized WebP from /public.
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === '1',
    formats: ['image/webp'],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1920],
  },
  experimental: {
    // three.js is large; pull only the reachable graph into each bundle.
    optimizePackageImports: ['@react-three/drei', 'three'],
    // Product photographs are uploaded through a server action, and the
    // default request cap is 1MB — smaller than a single phone photo. Keep
    // this comfortably above MAX_UPLOAD_BYTES in src/lib/media.ts, which is
    // where the limit is actually enforced and explained to the user.
    serverActions: { bodySizeLimit: '8mb' },
  },
  async headers() {
    return [
      {
        // 3D assets are content-hashed at build time and safe to pin.
        source: '/models/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
