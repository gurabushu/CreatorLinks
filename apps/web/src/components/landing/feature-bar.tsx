const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 10h18M8 2v4M16 2v4" />
      </svg>
    ),
    title: 'ライブ・セッションを告知',
    body: '見てほしい予定をオープンに。仲間の活動もカレンダーで一覧。',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    title: '見積から支払いまで',
    body: '依頼・契約・入金・領収書まで、アプリ 1 画面で完結。',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
    title: '音楽仲間を見つける',
    body: '楽器・ジャンル・実績で検索。知り合いの外にもつながれる。',
  },
]

export function FeatureBar() {
  return (
    <section id="features" className="bg-gray-50 border-y border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">できること</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            音楽の仕事に必要なことを、ひとつに。
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-purple-100 text-purple-600 mb-3">
                <span className="w-5 h-5 block">{f.icon}</span>
              </span>
              <div className="font-bold text-gray-900">{f.title}</div>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
