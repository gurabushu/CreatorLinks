// LP 「Free vs PRO」比較セクション。
//
// 収益モデルの中核: 一元管理の付加価値でお金を取る + サブスク動線を詰める。
// Free でも触れる（ハードルを下げる）が、月に案件が動くようになったら PRO へ
// 誘導する構造を LP で明示する。
//
// 損益分岐計算: 手数料差 2% (Free 7% - PRO 5%) × 月間案件額 = 節約額
//   節約額 > ¥980/月 なら PRO のほうがお得
//   → 損益分岐 = ¥980 / 0.02 = ¥49,000/月

import Link from 'next/link'
import { SITE_NAME } from '@/lib/brand'

type Feature = {
  label: string
  hint?: string
  free: string | boolean
  pro: string | boolean
  highlight?: boolean // PRO 側を強調する行
}

const FEATURES: Feature[] = [
  { label: '手数料', hint: '案件成立時にかかる料率', free: '7%', pro: '5%', highlight: true },
  { label: '案件管理・チャット・カレンダー', free: true, pro: true },
  { label: '基本帳票（見積・請求・領収書）', free: true, pro: true },
  { label: 'ポートフォリオ登録', free: '10 件まで', pro: '無制限', highlight: true },
  {
    label: '高度な帳票',
    hint: '源泉徴収税 10.21% 自動計算、月次/四半期集計 CSV',
    free: '—',
    pro: '✓',
    highlight: true,
  },
  {
    label: 'CRM 顧客別ビュー',
    hint: '過去の案件・支払・Encore 履歴を 1 画面で',
    free: '—',
    pro: '✓',
    highlight: true,
  },
  {
    label: '分析ダッシュボード',
    hint: '月間売上推移・顧客別 LTV・リピート率',
    free: '—',
    pro: '✓',
    highlight: true,
  },
  {
    label: 'カレンダー Google 同期',
    hint: 'Google Calendar / iCal と双方向同期',
    free: '—',
    pro: '✓',
  },
  {
    label: '案件テンプレート保存',
    hint: '同じ相手への再依頼をワンタップで',
    free: '—',
    pro: '✓',
  },
  {
    label: 'アーティスト一覧での優先表示',
    free: '—',
    pro: '✓',
  },
  {
    label: 'スカウト送信',
    hint: '気になるアーティストへ主催者から直接オファー',
    free: '受信のみ',
    pro: '月 5 件',
  },
]

// 損益分岐: 月 ¥49k 以上動く人は PRO のほうが手数料節約だけで元が取れる
const BREAK_EVEN_YEN = 49_000
const PRO_MONTHLY_YEN = 980
const FEE_DIFF = 0.02 // 7% - 5%

// 例示するシナリオ 3 パターン
const SCENARIOS = [
  { monthlyYen: 30_000, label: '月 ¥3 万', hint: '副業ライトユーザー' },
  { monthlyYen: 100_000, label: '月 ¥10 万', hint: '副業レギュラー' },
  { monthlyYen: 300_000, label: '月 ¥30 万', hint: '専業ミュージシャン' },
]

function calcSaving(monthlyYen: number) {
  const saveByFee = Math.floor(monthlyYen * FEE_DIFF) // Free→PRO で戻る手数料
  const net = saveByFee - PRO_MONTHLY_YEN // PRO 月額差引後の実質節約
  return { saveByFee, net }
}

export function PricingComparison() {
  return (
    <section id="pricing-comparison" className="py-14 sm:py-20 px-4 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-block text-xs font-bold tracking-wider text-purple-600 bg-purple-50 border border-purple-200/70 px-3 py-1 rounded-full mb-4">
            Free で試して、動き出したら PRO で回す
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
            月に案件が動く人ほど、
            <br className="sm:hidden" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
              PRO が元を取れる。
            </span>
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-3 leading-relaxed">
            登録・案件管理・基本帳票は Free で全部使えます。<br className="hidden sm:block" />
            月に案件が複数動くようになったら、手数料 <b>7% → 5%</b> と一元管理の高度機能で PRO の元が取れます。
          </p>
        </div>

        {/* 損益分岐計算 */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50/70 border border-purple-200/60 p-6 sm:p-8 mb-10">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            あなたの月間受注額なら…
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mb-5">
            手数料差 2% × 月間受注 = 節約額。¥{PRO_MONTHLY_YEN.toLocaleString()} を超えれば PRO のほうがお得。
            <br />
            <span className="text-purple-700 font-semibold">
              損益分岐: 月 ¥{BREAK_EVEN_YEN.toLocaleString()} 以上
            </span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {SCENARIOS.map((s) => {
              const { saveByFee, net } = calcSaving(s.monthlyYen)
              const isProWorth = net >= 0
              return (
                <div
                  key={s.monthlyYen}
                  className={`rounded-xl p-4 border ${
                    isProWorth ? 'bg-white border-purple-300 shadow-sm' : 'bg-white/60 border-gray-200'
                  }`}
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="font-bold text-sm">{s.label}</p>
                    <span className="text-[10px] text-gray-400">{s.hint}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    手数料節約: <span className="font-mono">¥{saveByFee.toLocaleString()}</span>/月
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    PRO 月額: <span className="font-mono">−¥{PRO_MONTHLY_YEN.toLocaleString()}</span>
                  </p>
                  <p
                    className={`text-sm font-bold ${
                      isProWorth ? 'text-purple-700' : 'text-gray-500'
                    }`}
                  >
                    {isProWorth ? (
                      <>実質 ¥{net.toLocaleString()}/月 <span className="text-xs font-normal">お得</span></>
                    ) : (
                      <>実質 ¥{Math.abs(net).toLocaleString()}/月 <span className="text-xs font-normal">超過</span></>
                    )}
                  </p>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">
            ※ 手数料節約分だけの計算。CRM・分析・カレンダー同期などの高度機能で節約できる作業時間は別途。
          </p>
        </div>

        {/* 比較表 */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 sm:px-6 py-4 font-medium text-gray-600 w-1/2 sm:w-auto">機能</th>
                  <th className="text-center px-3 sm:px-6 py-4 font-bold text-gray-700 bg-gray-50/60">
                    Free
                  </th>
                  <th className="text-center px-3 sm:px-6 py-4 font-bold bg-gradient-to-b from-purple-100 to-purple-50 text-purple-800 relative">
                    <span className="absolute top-1 right-1 sm:right-2 text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold">
                      おすすめ
                    </span>
                    PRO
                    <div className="text-[10px] font-normal text-purple-700 mt-0.5">¥{PRO_MONTHLY_YEN.toLocaleString()}/月</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f, i) => (
                  <tr key={f.label} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                    <td className="px-4 sm:px-6 py-3">
                      <div className="font-medium text-gray-800 text-xs sm:text-sm">{f.label}</div>
                      {f.hint && (
                        <div className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 leading-snug">{f.hint}</div>
                      )}
                    </td>
                    <td className="text-center px-3 sm:px-6 py-3 text-xs sm:text-sm">
                      {f.free === true ? (
                        <span className="text-emerald-600 font-bold">✓</span>
                      ) : f.free === false ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span className="text-gray-600">{f.free}</span>
                      )}
                    </td>
                    <td
                      className={`text-center px-3 sm:px-6 py-3 text-xs sm:text-sm ${
                        f.highlight ? 'bg-purple-50/60' : ''
                      }`}
                    >
                      {f.pro === true ? (
                        <span className="text-purple-700 font-bold">✓</span>
                      ) : f.pro === false ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span className={f.highlight ? 'font-bold text-purple-700' : 'text-gray-700'}>{f.pro}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
          <Link
            href="/auth"
            className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-bold px-7 py-3 rounded-xl hover:bg-gray-50 transition"
          >
            Free で始める
          </Link>
          <Link
            href="/pro/subscribe"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-7 py-3 rounded-xl shadow-md hover:shadow-lg hover:opacity-95 transition"
          >
            PRO の詳細を見る <span aria-hidden>→</span>
          </Link>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          {SITE_NAME} は Free でも十分に使えます。無理にアップグレードする必要はありません。
        </p>
      </div>
    </section>
  )
}
