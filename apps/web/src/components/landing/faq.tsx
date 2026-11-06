const FAQS = [
  {
    q: 'どんな人向けですか？',
    a: '音楽業界で仕事のやりとりをする方向けです。演奏家・作曲家・エンジニア・制作スタッフなど、依頼する側も請ける側も使えます。',
  },
  {
    q: '料金はかかりますか？',
    a: '登録・利用は無料です。アプリ内で決済が発生したときだけ、手数料 7% がかかります。',
  },
  {
    q: 'お金のやりとりはどうなりますか？',
    a: '発注者が先に支払い → アプリが一時預かり → 納品を確認してからアーティストへ送金、という流れです。',
  },
]

export function Faq() {
  return (
    <section id="faq" className="py-14 sm:py-20 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">よくある質問</h2>
        </div>
        <ul className="space-y-3">
          {FAQS.map((item) => (
            <li key={item.q} className="rounded-xl border border-gray-200 bg-white">
              <details className="group">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3 p-4 sm:p-5">
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">{item.q}</span>
                  <span
                    aria-hidden
                    className="shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 -mt-1 text-sm text-gray-600 leading-relaxed">
                  {item.a}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
