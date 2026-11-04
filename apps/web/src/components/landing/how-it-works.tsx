const STEPS = [
  {
    no: '01',
    title: 'プロフィール登録',
    body: 'メール or Google で数十秒。楽器・ジャンル・音源やライブ映像を載せて、あなたの音楽活動をわかりやすく伝えられます。',
  },
  {
    no: '02',
    title: 'お仕事 / ミュージシャンを探す',
    body: '楽器・ジャンル・エリア・ご予算で絞り込んで、応募 or お声がけで打診。イベント告知からも、直接つながれます。',
  },
  {
    no: '03',
    title: 'やりとり・納品・評価',
    body: 'メッセージで詳細を詰めて、音源や日程を確定。納品と相互評価で、実績が積み上がっていきます。お支払いが発生したときに手数料 7% (アプリ内決済の利用料)。',
  },
  {
    no: '04',
    title: '「また一緒に」で、ずっと続く',
    body: '終わったあとにお互い「また一緒に」を押せば、次回はワンタップで依頼可能。相性の良い相手ほど、ご縁が続いていきます。',
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
              <div className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-zinc-600">
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
