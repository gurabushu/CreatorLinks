// app/page.tsx — トップ / LP (SSG)
// 最低限構成: Hero / 3 機能 / 料金 1 行 / FAQ

import type { Metadata } from 'next'
import Link from 'next/link'
import { EarlyBirdBanner } from '@/components/early-bird/early-bird-banner'
import { HeroSection } from '@/components/landing/hero-section'
import { FeatureBar } from '@/components/landing/feature-bar'
import { Faq } from '@/components/landing/faq'
import { SITE_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: `${SITE_NAME} — 「また一緒に」が続く、音楽の場所。`,
  description:
    '音楽業界の仕事管理アプリ。ライブ告知・見積・支払い・仲間とのつながりをまとめて管理。登録無料、アプリ内決済 7%。',
  alternates: { canonical: '/' },
}

export const revalidate = 3600

export default function HomePage() {
  return (
    <div>
      <EarlyBirdBanner />
      <HeroSection />
      <FeatureBar />

      <section id="pricing" className="py-14 sm:py-20 px-4 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">料金</h2>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
          登録・投稿・やりとりは <b>無料</b>。
          <br />
          アプリ内で決済したときだけ <b className="text-purple-600">手数料 7%</b>。
        </p>
        <div className="mt-8">
          <Link
            href="/auth"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-zinc-600 text-white font-bold px-7 py-3.5 rounded-xl shadow-md hover:shadow-lg hover:opacity-95 transition"
          >
            無料で始める <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <Faq />
    </div>
  )
}
