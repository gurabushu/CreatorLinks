import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { TrpcProvider } from '@/components/providers/trpc-provider'
import { SessionProvider } from 'next-auth/react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'CreatorLinks — 個人アーティストの営業プラットフォーム',
    template: '%s | CreatorLinks',
  },
  description:
    '音楽アーティスト・ミュージシャンのマッチングとイベント告知・案件管理のプラットフォーム。',
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
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'CreatorLinks',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CreatorLinks',
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
