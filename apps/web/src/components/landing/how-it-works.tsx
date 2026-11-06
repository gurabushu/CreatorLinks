const STEPS = [
  {
    no: '01',
    title: 'プロフィール登録',
    body: '30 秒で完了。楽器・ジャンル・実績を登録。',
  },
  {
    no: '02',
    title: '探す / 探される',
    body: '検索・応募・お声がけで仕事がつながる。',
  },
  {
    no: '03',
    title: 'やりとり → 納品 → 入金',
    body: 'アプリ 1 画面で完結。見積から領収書まで自動。',
  },
  {
    no: '04',
    title: '「また一緒に」で続く',
    body: '次回の依頼はワンタップ。',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-14 sm:py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">ご利用の流れ</h2>
        </div>
        <ol className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {STEPS.map((s, i) => (
            <li key={s.no} className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-zinc-600 text-white font-bold text-sm mb-3">
                {s.no}
              </div>
              <div className="font-bold text-lg text-gray-900">{s.title}</div>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{s.body}</p>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="hidden lg:block absolute top-1/2 -right-3 w-6 h-6 text-gray-300 -translate-y-1/2"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
