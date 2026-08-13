import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

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

// Sentry でラップ。SENTRY_AUTH_TOKEN 未設定時は source map アップロードのみスキップされ、
// ランタイムの Sentry.init は sentry.*.config.ts 側で DSN の有無を見て自動 no-op になる
export default withSentryConfig(nextConfig, {
  // 【要記入】Sentry Org / Project 名を実際のものに置換
  org: process.env.SENTRY_ORG ?? 'creator-links',
  project: process.env.SENTRY_PROJECT ?? 'web',
  // CI 環境で verbose ログを出す。ローカルは silent
  silent: !process.env.CI,
  // Sentry 認証トークンがある場合のみ source map をアップロード
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // ソースマップは deploy 後に自動で削除（Vercel に残さない）
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  // 使わない機能は明示 off にしてバンドルを軽くする
  disableLogger: true,
})
