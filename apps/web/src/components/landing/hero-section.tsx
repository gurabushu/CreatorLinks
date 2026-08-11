import Link from 'next/link'
import { DashboardMock } from './dashboard-mock'

export function HeroSection() {
  return (
    <section className="bg-white px-4 py-12 sm:py-16 md:py-20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-8 items-center">
        {/* 左: コピー & CTA */}
        <div className="text-center md:text-left">
          <span className="inline-block text-xs font-bold tracking-wider text-purple-600 bg-purple-50 border border-purple-200/70 px-3 py-1 rounded-full mb-4">
            イベント掲示板 × 仕事 DX × マッチング
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.15] tracking-tight text-gray-900">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
              「また一緒に」
            </span>
            が
            <br />
            続く、音楽の場所。
          </h1>
          <p className="mt-6 text-base sm:text-lg text-gray-600 leading-relaxed">
            ライブ・セッション告知の <b>掲示板</b>、LINE や DM でやってた依頼の <b>仕事 DX</b>、
            音楽業界特化の <b>マッチング</b>。
            <br className="hidden sm:block" />
            3 つを 1 つのアプリに。
          </p>
          <p className="mt-3 text-sm text-gray-500">
            「また一緒にやりたい」を仕組みで残す、音楽業界特化のミニ DX。
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start items-stretch sm:items-center max-w-sm mx-auto md:max-w-none md:mx-0">
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-7 py-3.5 rounded-xl shadow-md hover:shadow-lg hover:opacity-95 transition"
            >
              無料で始める <span aria-hidden>→</span>
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center border border-gray-300 text-gray-700 font-bold px-7 py-3.5 rounded-xl hover:bg-gray-50 transition"
            >
              使い方を見る
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-600 text-center md:text-left">
            <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200/70 px-2 py-0.5 rounded-full text-xs font-semibold mr-2">
              創設メンバー枠
            </span>
            先着 100 名に PRO 6ヶ月無料 + 永久バッジを進呈中
          </p>
        </div>

        {/* 右: モック */}
        <div className="order-first md:order-none">
          <DashboardMock />
        </div>
      </div>
    </section>
  )
}
