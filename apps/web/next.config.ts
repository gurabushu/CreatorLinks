import type { NextConfig } from 'next'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Turborepo モノレポ内のパッケージをトランスパイル
  transpilePackages: ['@creator-links/shared', '@creator-links/api'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'utfs.io' },                    // Uploadthing (既存データ互換)
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }, // Vercel Blob
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google OAuth
      { protocol: 'https', hostname: 'img.youtube.com' },           // YouTube サムネ
      { protocol: 'https', hostname: 'i.ytimg.com' },               // YouTube サムネ (新ドメイン)
    ],
  },

  // クライアントからの tRPC / API リクエストを Hono サーバーにプロキシ
  async rewrites() {
    return [
      {
        source: '/trpc/:path*',
        destination: `${API_URL}/trpc/:path*`,
      },
      {
        source: '/api/upload/:path*',
        destination: `${API_URL}/api/upload/:path*`,
      },
      {
        source: '/api/webhooks/:path*',
        destination: `${API_URL}/api/webhooks/:path*`,
      },
    ]
  },

  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '') ?? '',
        process.env.VERCEL_URL ?? '',  // Vercel が各デプロイに自動設定するホスト名
      ].filter(Boolean),
    },
  },
}

export default nextConfig
