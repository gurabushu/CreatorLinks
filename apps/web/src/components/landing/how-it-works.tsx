const STEPS = [
  {
    no: '01',
    title: 'プロフィール登録',
    body: 'メール or Google で数十秒。楽器・ジャンル・音源やライブ映像を載せて音楽実績を可視化。',
  },
  {
    no: '02',
    title: '案件 / ミュージシャンを探す',
    body: '楽器・ジャンル・エリア・報酬で絞り込み、応募 or スカウトで打診。イベント告知からも直接繋がれます。',
  },
  {
    no: '03',
    title: '契約・納品・評価',
    body: 'メッセージで詰めて音源や日程を確定、納品と相互評価で実績が積み上がる。手数料は 7%。',
  },
  {
    no: '04',
    title: '「また一緒に」で継続',
    body: '完了時に相互 encore を付ければ、次回の依頼はワンタップで再依頼。相性の良い相手ほど関係が続きます。',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-14 sm:py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">ご利用の流れ</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            登録から「また一緒に」までの 4 ステップ
          </p>
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
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
