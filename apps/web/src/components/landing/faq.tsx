const FAQS = [
  {
    q: '登録や利用に料金はかかりますか？',
    a: '基本利用は無料です。契約成立時に発注金額の7%を手数料としていただきます。PRO プランは月額サブスクで、優先表示・スカウト強化などが利用できます。',
  },
  {
    q: '「創設メンバー枠」とは？',
    a: 'サービス立ち上げ期のキャンペーンで、先着100名のサインアップに対して PRO プランを 6ヶ月無料でご提供し、さらに「創設メンバー #001 / 100」のスロット番号入りバッジをプロフィールに永久表示します。6ヶ月後は通常プランに自動で戻ります。',
  },
  {
    q: 'どんなジャンルのミュージシャンが登録していますか？',
    a: 'ボーカリスト・作曲家・作詞家・編曲家・演奏家（ギター/ベース/ドラム/キーボード等）・DTM トラックメイカー・ミキシングエンジニアなど、音楽制作に関わる幅広い分野の方が登録しています。プロフィールにジャンル・楽器タグを付与して検索できます。',
  },
  {
    q: '報酬の支払いや納品はどのように行われますか？',
    a: 'プラットフォーム内でメッセージ・進捗管理を行い、納品確認後にお互いに評価します。支払い経路は案件ごとに設定できます。',
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
