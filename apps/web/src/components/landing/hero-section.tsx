import Link from 'next/link'
import { DashboardMock } from './dashboard-mock'

export function HeroSection() {
  return (
    <section className="bg-white px-4 py-10 sm:py-14 md:py-20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-8 items-center">
        <div className="text-center md:text-left min-w-0">
          <h1 className="text-[2rem] sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.2] tracking-tight text-gray-900 break-keep">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-zinc-600">
              「また一緒に」
            </span>
            が
            <br />
            続く、音楽の場所。
          </h1>

          <p className="mt-4 sm:mt-5 text-lg sm:text-xl md:text-2xl font-bold text-gray-700">
            音楽の仕事を、ひとつのアプリに。
          </p>

          <div className="mt-8 flex justify-center md:justify-start">
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-zinc-600 text-white font-bold px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg hover:opacity-95 transition"
            >
              無料で始める <span aria-hidden>→</span>
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-600 text-center md:text-left flex items-center justify-center md:justify-start gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200/70 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse-dot" aria-hidden />
              創設メンバー枠
            </span>
            <span>先着 100 名に、最初の 6 ヶ月 手数料 0%</span>
          </p>
        </div>

        <div className="hidden md:block">
          <DashboardMock />
        </div>
      </div>
    </section>
  )
}
