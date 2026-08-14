// LP 「なぜ LINE ではなく EncoreCue?」セクション
// 手数料 7% を払う明確なメリットを、比較表で見せる。
// - 家族・親友との仕事は LINE でよい、という正直な立ち位置
// - Encore が価値を出せる 3 シーンに焦点を絞る

const REASONS = [
  {
    tag: '01 / 未払い・踏み倒し',
    line: '「振り込んだよ」と言われて信じるしかない。',
    encore: 'Stripe エスクローで先払い→検収完了後に自動送金。逃げられない。',
    detail: '初対面・知り合いの知り合いとの案件で、金の話を先延ばしにできる安心感。',
  },
  {
    tag: '02 / 記録が残らない',
    line: 'あの MIX、¥40k だっけ ¥50k だっけ…毎年 3 月にトーク履歴を発掘。',
    encore: '金額・納期・成果物・領収書が 1 画面に。CSV でそのまま確定申告へ。',
    detail: '副業でやってる人ほど効く。年間の売上・支払をワンクリックで集計。',
  },
  {
    tag: '03 / 知り合いの外から仕事が来ない',
    line: 'LINE は繋がってる人だけ。新規の依頼は営業しないと入ってこない。',
    encore: '業界内検索・レビュー・イベント告知で発見される名刺代わりのプロフィール。',
    detail: '「11/3 空いてる Sax 探してる」で見つけてもらえる場所。若手・上京組に効く。',
  },
]

export function WhyNotLine() {
  return (
    <section id="why-not-line" className="py-14 sm:py-20 px-4 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-block text-xs font-bold tracking-wider text-purple-600 bg-purple-50 border border-purple-200/70 px-3 py-1 rounded-full mb-4">
            なぜ手数料 7% を払ってまで
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
            LINE で十分な仕事は、LINE で。
            <br className="sm:hidden" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
              残るのはこの 3 シーン。
            </span>
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-3 leading-relaxed">
            長年の常連との仕事は LINE で構いません。<br className="hidden sm:block" />
            EncoreCue は「LINE のままだとリスクがある仕事」だけを、安全にやるためのアプリです。
          </p>
        </div>

        <ol className="space-y-4 sm:space-y-5">
          {REASONS.map((r) => (
            <li key={r.tag} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-[240px,1fr] gap-0">
                <div className="bg-purple-50/60 p-5 sm:p-6 border-b sm:border-b-0 sm:border-r border-purple-100">
                  <div className="text-xs font-bold text-purple-600 tracking-wider mb-2">{r.tag}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{r.detail}</div>
                </div>
                <div className="p-5 sm:p-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 mt-0.5 text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded">LINE</span>
                    <p className="text-sm text-gray-500 leading-relaxed">{r.line}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 mt-0.5 text-[10px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded">EncoreCue</span>
                    <p className="text-sm text-gray-900 leading-relaxed font-medium">{r.encore}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* 手数料 7% の再フレーミング */}
        <div className="mt-10 sm:mt-12 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50/70 border border-purple-200/60 p-6 sm:p-8">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
            手数料 7% は「サービス料」ではなく「保険料 + 集客費」。
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-700">
            <div>
              <div className="font-bold text-purple-700 mb-1">未払い回避</div>
              <div className="leading-relaxed">
                年 1 件 ¥50k の踏み倒しで、Encore 案件 7 件分の手数料が相殺。
              </div>
            </div>
            <div>
              <div className="font-bold text-purple-700 mb-1">確定申告の時短</div>
              <div className="leading-relaxed">
                LINE 発掘に費やしてた数時間が、ワンクリック集計に。
              </div>
            </div>
            <div>
              <div className="font-bold text-purple-700 mb-1">新規発注の呼び水</div>
              <div className="leading-relaxed">
                プロフィールと実績が業界内で見つけられる状態に。
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
