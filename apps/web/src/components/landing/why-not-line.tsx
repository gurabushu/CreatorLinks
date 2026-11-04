// LP 「なぜ LINE ではなく EncoreCue?」セクション
// 手数料 7% を払う明確なメリットを、比較表で見せる。
// - 家族・親友との仕事は LINE でよい、という正直な立ち位置
// - Encore が価値を出せる 3 シーンに焦点を絞る

const REASONS = [
  {
    tag: '01 / お支払いのすれ違い',
    line: '「振り込んだよ」のひと言を、信じるしかない。',
    encore: '発注者が先にお支払い → アプリが一時お預かり → 納品を確認してから、アーティストへ送金。お互い気持ちよく完了できます。',
    detail: '初対面や、知り合いの知り合いとのお仕事で、お金の話を切り出しづらい気まずさが消えます。',
  },
  {
    tag: '02 / 記録が残らない',
    line: 'あの MIX、¥40,000 だっけ ¥50,000 だっけ…毎年 3 月にトーク履歴を掘り返す羽目に。',
    encore: '金額・納期・成果物・領収書が 1 画面にまとまります。CSV でそのまま確定申告へ。',
    detail: '副業でやってる方ほど効きます。年間の売上・支払いをワンクリックで集計。',
  },
  {
    tag: '03 / 知り合いの外から、仕事が来ない',
    line: 'LINE で繋がってるのは身内だけ。新しい依頼は、営業しないと入ってこない。',
    encore: '業界内で検索・レビュー・イベント告知から見つけてもらえる、名刺代わりのプロフィール。',
    detail: '「11/3 空いてる Sax 探してる」で見つけてもらえる場所。若手・上京組にも効きます。',
  },
]

export function WhyNotLine() {
  return (
    <section id="why-not-line" className="py-14 sm:py-20 px-4 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-block text-xs font-bold tracking-wider text-purple-600 bg-purple-50 border border-purple-200/70 px-3 py-1 rounded-full mb-4">
            手数料 7% で何が得られるの？
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
            LINE で足りている仕事は、LINE のままで。
            <br className="sm:hidden" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-zinc-600">
              EncoreCue が役に立つのは、この 3 つの場面。
            </span>
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-3 leading-relaxed">
            長年の仲間とのやりとりは、LINE のままで大丈夫です。<br className="hidden sm:block" />
            EncoreCue は「LINE のままだと少し気まずくなりそうな仕事」を、お互い安心してやれる場所です。
          </p>
        </div>

        <ol className="space-y-4 sm:space-y-5">
          {REASONS.map((r) => (
            <li key={r.tag} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {/* SP: 縦積み、sm-md: 220px、lg: 260px の 2 段階で左カラム幅を最適化 */}
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(200px,220px),1fr] lg:grid-cols-[260px,1fr] gap-0">
                <div className="bg-purple-50/60 p-4 sm:p-5 lg:p-6 border-b sm:border-b-0 sm:border-r border-purple-100">
                  <div className="text-xs font-bold text-purple-600 tracking-wider mb-2">{r.tag}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{r.detail}</div>
                </div>
                <div className="p-4 sm:p-5 lg:p-6 space-y-3 min-w-0">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className="shrink-0 mt-0.5 text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded">LINE</span>
                    <p className="text-sm text-gray-500 leading-relaxed">{r.line}</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className="shrink-0 mt-0.5 text-[10px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded">EncoreCue</span>
                    <p className="text-sm text-gray-900 leading-relaxed font-medium">{r.encore}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* 手数料 7% の再フレーミング — お金の話を "気まずさ回避 + 発見される価値" に変換 */}
        <div className="mt-10 sm:mt-12 rounded-2xl bg-gradient-to-br from-purple-50 to-zinc-50/70 border border-purple-200/60 p-6 sm:p-8">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
            手数料 7% は、「安心」と「出会い」への投資。
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-700">
            <div>
              <div className="font-bold text-purple-700 mb-1">お金のやりとりが、気まずくならない</div>
              <div className="leading-relaxed">
                「お金は先に」を自分から言わなくていいので、お互い演奏や制作に集中できます。
              </div>
            </div>
            <div>
              <div className="font-bold text-purple-700 mb-1">事務作業の時間が戻ってくる</div>
              <div className="leading-relaxed">
                LINE 遡りや Excel 作成に取られていた数時間が、ワンクリックで片付きます。
              </div>
            </div>
            <div>
              <div className="font-bold text-purple-700 mb-1">新しい出会いが、向こうから届く</div>
              <div className="leading-relaxed">
                プロフィールと実績が業界内で見つけられるので、営業しなくても依頼が届きます。
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
