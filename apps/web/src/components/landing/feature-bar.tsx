const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'クリエイターを探す',
    body: 'スキルや実績から\n最適な人材を見つけられます',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'やり取りもスムーズ',
    body: 'メッセージ機能で\nスムーズにコミュニケーション',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: '安心・安全',
    body: '本人確認や評価システムで\n安心して取引できます',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-6" />
      </svg>
    ),
    title: '案件管理も一元化',
    body: '進捗管理や納品まで\nすべてをサポート',
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
