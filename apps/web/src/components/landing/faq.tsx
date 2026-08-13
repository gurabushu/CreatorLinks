import { SITE_NAME } from '@/lib/brand'

const FAQS = [
  {
    q: `${SITE_NAME} はどんな人向けですか？`,
    a: '音楽業界に関わる人が対象です。演奏家・作曲家・DTM トラックメイカー・ミキシングエンジニア・イベンター・バンドリーダー・レーベル担当・ライブハウス主催者など、音楽の仕事を依頼したい / 受けたい方が使えます。',
  },
  {
    q: '登録や利用に料金はかかりますか？',
    a: '基本利用は無料です。案件成立時に発注金額の 7% を手数料としていただきます（業界最安クラス）。任意で PRO プランに月額サブスクで加入すると、優先表示・スカウト強化・プロフィール分析などが使えます。',
  },
  {
    q: '「また一緒に」機能とは何ですか？',
    a: '案件完了時に、相手に対して「また一緒に仕事したい」を明示できる仕組みです。相互一致すると「Encore 相性」バッジが付き、次回の案件作成時はワンタップで再依頼できます。単発依頼ではなく、継続する関係を仕組みで支えます。',
  },
  {
    q: 'イベント告知やカレンダーは何ができますか？',
    a: 'ライブ・セッション・レコーディング・ワークショップ等の告知を出稿でき、共演者との日程共有もカレンダー上でできます。他のミュージシャンの公開カレンダーを見て、空き日程から出演オファーを送ることも可能です。',
  },
  {
    q: '「創設メンバー枠」とは？',
    a: 'サービス立ち上げ期のキャンペーンで、先着 100 名のサインアップに対して PRO プランを 6ヶ月無料でご提供し、さらに「創設メンバー #001 / 100」のスロット番号入りバッジをプロフィールに永久表示します。6ヶ月後は通常プランに自動で戻ります。',
  },
  {
    q: 'どんな音楽ジャンル・楽器が登録できますか？',
    a: 'ロック・ポップス・ジャズ・クラシック・ヒップホップ・エレクトロニカ等、ジャンル制限はありません。楽器も、ボーカル・ギター・ベース・ドラム・キーボード・管弦楽器・DTM・ミキシング / マスタリング等、幅広く対応。プロフィールに複数タグを付けられます。',
  },
  {
    q: '報酬の支払いや納品はどうなりますか？',
    a: 'プラットフォーム内のメッセージで進捗を詰めて、納品確認後に相互評価します。支払い方式は案件の性質に応じて選択できます（詳細は案件作成時にご案内）。',
  },
  {
    q: '困ったときのサポートは？',
    a: 'ダッシュボードのサイドバー、または Chat 画面右上の「公式に相談」から、公式サポート窓口とダイレクトにやりとりできます。決済トラブル・相手とのトラブル・機能相談など、全て 1 箇所で対応します。',
  },
]

export function Faq() {
  return (
    <section id="faq" className="py-14 sm:py-20 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">よくある質問</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            サービス内容・料金・機能について
          </p>
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
