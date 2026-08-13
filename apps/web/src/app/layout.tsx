import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { TrpcProvider } from '@/components/providers/trpc-provider'
import { SessionProvider } from 'next-auth/react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand'
import { JsonLd } from '@/components/seo/json-ld'
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    '才能あるアーティストと企業・個人をつなぐ、手数料業界最安7%のマッチングプラットフォーム。',
  keywords: [
    'ミュージシャン',
    'アーティスト',
    'マッチング',
    '音楽',
    'セッション',
    'ライブ',
    'レコーディング',
    '案件',
  ],
  icons: {
    icon: '/favicon-32.png',
    apple: '/apple-icon.png',
  },
  // 各ページで override 可能。デフォルトはルートを canonical にする。
  // Google に対して「www / non-www」「query 違い」「preview URL」で重複判定されないよう明示。
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {/* Site-wide 構造化データ。Organization は Knowledge Panel の基礎、
            WebSite の SearchAction は Sitelinks Search Box 対象化のため。 */}
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <SessionProvider>
          <TrpcProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </TrpcProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
