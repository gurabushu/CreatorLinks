import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { TrpcProvider } from '@/components/providers/trpc-provider'
import { SessionProvider } from 'next-auth/react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'CreatorLinks — 個人アーティストの営業プラットフォーム',
    template: '%s | CreatorLinks',
  },
  description:
    '才能あるアーティストと企業・個人をつなぐ、手数料業界最安10%のマッチングプラットフォーム。',
  keywords: ['アーティスト', 'フリーランス', 'マッチング', '音楽', 'イラスト', '動画'],
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'CreatorLinks',
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
