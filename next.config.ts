import type { NextConfig } from "next";

// Build ID determinístico baseado no commit do git (Vercel injeta
// VERCEL_GIT_COMMIT_SHA automaticamente). Em dev local cai num timestamp.
// Usado por /api/version pra detectar quando o cliente está com versão
// desatualizada após deploy.
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GIT_COMMIT ||
  `dev-${Date.now()}`

const nextConfig: NextConfig = {
  generateBuildId: async () => BUILD_ID,
  env: {
    // BAKED no bundle do client — fica fixo enquanto a aba está aberta
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
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
