// Next.js App Router 標準の robots.txt エンドポイント
// 本番: 公開ページは全許可、認証エリア・API・管理系は明示的に除外
// preview/dev: 全 disallow（Google に preview URL が拾われないようにする）

import type { MetadataRoute } from 'next'
import { resolveAppUrl } from '@/lib/app-url'

function siteUrl(): string {
  return resolveAppUrl()
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  // VERCEL_ENV は 'production' | 'preview' | 'development' を取る。
  // Vercel でない環境（ローカル next dev）は undefined。
  const isProd = process.env.VERCEL_ENV === 'production'

  if (!isProd) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      host: base,
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // 認証/セッション付きページと機密面はクロール対象外
        disallow: ['/api/', '/dashboard/', '/admin/', '/auth/', '/onboarding/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
