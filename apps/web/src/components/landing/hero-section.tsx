import Link from 'next/link'
import { DashboardMock } from './dashboard-mock'

export function HeroSection() {
  return (
    <section className="bg-white px-4 py-12 sm:py-16 md:py-20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-8 items-center">
        {/* 左: コピー & CTA */}
        <div className="text-center md:text-left">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.15] tracking-tight text-gray-900">
            クリエイターと
            <br />
            仕事を
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
              つなぐ
            </span>
            。
          </h1>
          <p className="mt-6 text-base sm:text-lg text-gray-600 leading-relaxed">
            ポートフォリオ・マッチング・案件管理まで、
            <br className="hidden sm:block" />
            すべてをひとつのプラットフォームで。
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start items-stretch sm:items-center max-w-sm mx-auto md:max-w-none md:mx-0">
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-7 py-3.5 rounded-xl shadow-md hover:shadow-lg hover:opacity-95 transition"
            >
              無料で始める <span aria-hidden>→</span>
            </Link>
            <Link
              href="/artists"
              className="inline-flex items-center justify-center border border-gray-300 text-gray-700 font-bold px-7 py-3.5 rounded-xl hover:bg-gray-50 transition"
            >
              クリエイターを探す
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-600 text-center md:text-left">
            創設メンバー枠 先着100名：PRO 6ヶ月無料 + 永久バッジ進呈中
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
