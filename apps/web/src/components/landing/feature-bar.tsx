const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 10h18M8 2v4M16 2v4" />
      </svg>
    ),
    title: 'イベント掲示板',
    body: 'ライブ・セッション・リリースを公開告知。\nフォロー中アーティストの予定はカレンダーで一望。',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    title: '仕事 DX（LINE 卒業）',
    body: '依頼テンプレ・Stripe エスクロー・スケジュール\nを 1 画面で。DM の遡り検索とはお別れ。',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
    title: '音楽業界マッチング',
    body: 'ボーカル / ギター / DTM / MIX / エンジニア。\n楽器 × ジャンル × 実績で必要な人が見つかる。',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: '「また一緒に」で継続',
    body: '完了時の相互 encore で再依頼の相性を可視化。\n手数料 7%（業界最安クラス）。',
  },
]

export function FeatureBar() {
  return (
    <section id="features" className="bg-gray-50 border-y border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="shrink-0 w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <span className="w-5 h-5 block">{f.icon}</span>
              </span>
              <div>
                <div className="font-bold text-gray-900">{f.title}</div>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line leading-relaxed">
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
