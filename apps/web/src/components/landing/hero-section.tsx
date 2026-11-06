import Link from 'next/link'
import { DashboardMock } from './dashboard-mock'

export function HeroSection() {
  return (
    <section className="bg-white px-4 py-10 sm:py-14 md:py-20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-8 items-center">
        <div className="text-center md:text-left min-w-0">
          <h1 className="text-[2rem] sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.2] tracking-tight text-gray-900 break-keep">
            音楽の仕事を、
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-zinc-600">
              ひとつのアプリに。
            </span>
          </h1>
          <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed">
            ライブ告知・仕事の見積・支払い・音楽仲間とのつながり。
            <br className="hidden sm:block" />
            全部まとめて管理できます。
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start items-stretch sm:items-center max-w-sm mx-auto md:max-w-none md:mx-0">
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-zinc-600 text-white font-bold px-7 py-3.5 rounded-xl shadow-md hover:shadow-lg hover:opacity-95 transition"
            >
              無料で始める <span aria-hidden>→</span>
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-600 text-center md:text-left">
            <span className="inline-block bg-zinc-50 text-zinc-700 border border-zinc-200/70 px-2 py-0.5 rounded-full text-xs font-semibold mr-2">
              創設メンバー枠
            </span>
            先着 100 名に、最初の 6 ヶ月 手数料 0%
          </p>
        </div>

        <div className="hidden md:block">
          <DashboardMock />
        </div>
      </div>
    </section>
  )
}
