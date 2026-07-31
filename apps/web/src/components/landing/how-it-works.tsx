const STEPS = [
  {
    no: '01',
    title: '無料で登録',
    body: 'メールまたは Google アカウントで数十秒。ポートフォリオを載せて自分を発信。',
  },
  {
    no: '02',
    title: '案件・クリエイターを探す',
    body: '条件で絞り込んで気になる相手にアプローチ。応募・スカウトどちらもOK。',
  },
  {
    no: '03',
    title: '契約・納品・評価',
    body: 'メッセージで詰めて納品、評価がお互いに蓄積。次の依頼につながる。',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-14 sm:py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">ご利用の流れ</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            登録から納品までシンプルな3ステップ
          </p>
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {STEPS.map((s) => (
            <li key={s.no} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                STEP {s.no}
              </div>
              <div className="mt-2 font-bold text-lg text-gray-900">{s.title}</div>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
