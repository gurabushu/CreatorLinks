// app/page.tsx — トップ / LP (SSG)
// 構成: Hero / 3機能 / 使い方 / 料金 / FAQ

import type { Metadata } from 'next'
import Link from 'next/link'
import { EarlyBirdBanner } from '@/components/early-bird/early-bird-banner'
import { HeroSection } from '@/components/landing/hero-section'
import { FeatureBar } from '@/components/landing/feature-bar'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Faq } from '@/components/landing/faq'
import { SITE_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: `${SITE_NAME} — 「また一緒に」が続く、音楽の場所。`,
  description:
    '音楽業界の仕事管理アプリ。ライブ告知・見積・支払い・仲間とのつながりをまとめて管理。登録無料、アプリ内決済 7%。',
  alternates: { canonical: '/' },
}

export const revalidate = 3600

const PRICING_ROWS = [
  { use: '登録・プロフィール公開', fee: '無料' },
  { use: '案件投稿・応募・メッセージ', fee: '無料' },
  { use: 'ライブ・イベント告知', fee: '無料' },
  { use: 'アプリ内で決済したとき', fee: '7%', highlight: true },
]

export default function HomePage() {
  return (
    <div>
      <EarlyBirdBanner />
      <HeroSection />
      <FeatureBar />
      <HowItWorks />

      <section id="pricing" className="py-14 sm:py-20 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">料金</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              月額課金は一切ありません。
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm sm:text-base">
              <tbody>
                {PRICING_ROWS.map((row) => (
                  <tr
                    key={row.use}
                    className={`border-b last:border-b-0 border-gray-100 ${
                      row.highlight ? 'bg-purple-50' : ''
                    }`}
                  >
                    <td className="px-4 sm:px-6 py-4 text-gray-800">{row.use}</td>
                    <td
                      className={`px-4 sm:px-6 py-4 text-right font-bold whitespace-nowrap ${
                        row.highlight ? 'text-purple-700' : 'text-gray-700'
                      }`}
                    >
                      {row.fee}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">
            例：1 万円の案件 → アーティストの手取り{' '}
            <span className="font-bold text-gray-900">¥9,300</span>
          </p>

          <div className="mt-8 text-center">
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-zinc-600 text-white font-bold px-7 py-3.5 rounded-xl shadow-md hover:shadow-lg hover:opacity-95 transition"
            >
              無料で始める <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      <Faq />
    </div>
  )
}
