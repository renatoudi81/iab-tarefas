import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@prisma/client',
    '.prisma/client',
    '@prisma/adapter-neon',
    '@neondatabase/serverless',
  ],
  turbopack: {
    // Force Turbopack to use the Node.js (library) runtime instead of the
    // Wasm runtime for @prisma/client — prevents ".bind is not a function" errors
    resolveAlias: {
      '.prisma/client/default': './.prisma/client/index.js',
    },
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "https", hostname: "*.vercel-storage.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" }
    ]
  }
};

export default nextConfig;
