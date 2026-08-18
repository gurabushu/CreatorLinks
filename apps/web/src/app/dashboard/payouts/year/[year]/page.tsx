// 確定申告向け年間帳票インデックス。
// 指定年に paidAt が入った Payment を artistId=me で全部並べ、各行に帳票 4 種のリンクを付ける。
// PDF zip 化は puppeteer 依存で重いのでスコープ外。ユーザーは各リンクを個別に開いて印刷する想定。
// CSV は /api/payouts/csv 側で既に別途提供済み。

import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PaymentBadge, type PaymentStatus } from '@/components/payments/payment-badge'
import { calcWithholdingTax } from '@/lib/withholding-tax'

type Params = { params: Promise<{ year: string }> }

export const dynamic = 'force-dynamic'

function formatDate(d: Date | null): string {
  if (!d) return '-'
  return d.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })
}

export default async function YearlyDocumentsPage({ params }: Params) {
  const { year: yearStr } = await params
  const year = Number(yearStr)
  const nowYear = new Date().getFullYear()
  // 2020..現在+1年 に制限。文字列ゴミや遠すぎる年で prisma に無駄クエリを飛ばさない。
  if (!Number.isInteger(year) || year < 2020 || year > nowYear + 1) notFound()

  const session = await auth()
  if (!session) redirect('/auth')
  const isPro = session.user.role === 'PRO'

  const rangeStart = new Date(year, 0, 1)
  const rangeEnd = new Date(year + 1, 0, 1)

  const payments = await prisma.payment
    .findMany({
      where: {
        match: { artistId: session.user.id },
        status: { in: ['HELD', 'RELEASED', 'REFUNDED'] },
        paidAt: { gte: rangeStart, lt: rangeEnd },
      },
      orderBy: { paidAt: 'asc' },
      select: {
        id: true,
        matchId: true,
        status: true,
        amountYen: true,
        platformFeeYen: true,
        artistPayoutYen: true,
        paidAt: true,
        releasedAt: true,
        stripeChargeId: true,
        match: {
          select: {
            project: {
              select: {
                id: true,
                title: true,
                client: { select: { name: true, displayName: true } },
              },
            },
          },
        },
      },
    })
    .catch(() => [])

  const totalIncome = payments
    .filter((p) => p.status === 'RELEASED')
    .reduce((sum, p) => sum + p.artistPayoutYen, 0)
  const totalFee = payments
    .filter((p) => p.status === 'RELEASED')
    .reduce((sum, p) => sum + p.platformFeeYen, 0)
  const totalWithholding = isPro
    ? payments
        .filter((p) => p.status === 'RELEASED')
        .reduce((sum, p) => sum + calcWithholdingTax(p.amountYen), 0)
    : 0

  // PRO 限定: 月次集計 (paidAt 基準)
  type MonthlyRow = { month: string; count: number; amount: number; fee: number; payout: number; withholding: number }
  const monthlyRows: MonthlyRow[] = []
  if (isPro && payments.length > 0) {
    const map = new Map<string, MonthlyRow>()
    for (const p of payments) {
      if (!p.paidAt) continue
      const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`
      const cur = map.get(key) ?? { month: key, count: 0, amount: 0, fee: 0, payout: 0, withholding: 0 }
      cur.count += 1
      cur.amount += p.amountYen
      cur.fee += p.platformFeeYen
      cur.payout += p.artistPayoutYen
      cur.withholding += calcWithholdingTax(p.amountYen)
      map.set(key, cur)
    }
    monthlyRows.push(...Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month)))
  }

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-10 px-4">
      <div className="mb-6 flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-gray-500 mb-1">
            <Link href="/dashboard/payouts" className="hover:text-purple-700 hover:underline">
              ← 受取履歴に戻る
            </Link>
          </p>
          <h1 className="text-2xl font-bold">{year} 年 帳票一覧</h1>
          <p className="text-gray-500 text-sm mt-1">
            確定申告用。各案件の見積・契約・請求・領収を個別に開いて印刷 (PDF 保存) できます。
          </p>
        </div>
        <div className="flex gap-2 text-xs flex-wrap">
          <Link
            href={`/dashboard/payouts/year/${year}/print`}
            target="_blank"
            className="px-3 py-1.5 rounded border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium"
          >
            🖨 全請求書を一括印刷 (PDF)
          </Link>
          <a
            href={`/api/payouts/csv?year=${year}`}
            className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            CSV ダウンロード
          </a>
        </div>
      </div>

      {payments.length > 0 && (
        <div className={`mb-6 grid grid-cols-2 gap-3 ${isPro ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500 mb-1">送金確定件数</p>
            <p className="text-2xl font-bold text-purple-700">
              {payments.filter((p) => p.status === 'RELEASED').length}
              <span className="text-sm text-gray-500 font-normal ml-1">件</span>
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500 mb-1">受取合計</p>
            <p className="text-2xl font-bold text-purple-700">¥{totalIncome.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-500 mb-1">支払手数料合計</p>
            <p className="text-2xl font-bold text-gray-700">¥{totalFee.toLocaleString()}</p>
          </div>
          {isPro && (
            <div className="rounded-xl border border-purple-300 bg-purple-50/60 p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-purple-700 mb-1 flex items-center gap-1">
                源泉徴収税(目安)
                <span className="text-[9px] bg-purple-600 text-white px-1 rounded font-bold">PRO</span>
              </p>
              <p className="text-2xl font-bold text-purple-700">¥{totalWithholding.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {/* PRO 限定: 月次集計 */}
      {isPro && monthlyRows.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-purple-800 mb-2 flex items-center gap-2">
            📊 月次集計
            <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold">PRO 特典</span>
          </h2>
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-purple-50/60">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs">月</th>
                    <th className="text-right px-3 py-2 text-xs">件数</th>
                    <th className="text-right px-3 py-2 text-xs">総支払額</th>
                    <th className="text-right px-3 py-2 text-xs">受取額</th>
                    <th className="text-right px-3 py-2 text-xs">手数料</th>
                    <th className="text-right px-3 py-2 text-xs">源泉税(目安)</th>
                    <th className="text-right px-3 py-2 text-xs font-bold">手取り(税引後)</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {monthlyRows.map((r) => (
                    <tr key={r.month} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono">{r.month}</td>
                      <td className="px-3 py-2 text-right">{r.count}</td>
                      <td className="px-3 py-2 text-right font-mono">¥{r.amount.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono text-purple-700">¥{r.payout.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-500">¥{r.fee.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono text-orange-700">¥{r.withholding.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                        ¥{(r.payout - r.withholding).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
            ※ 源泉徴収税は所得税法 204 条に基づく 10.21% (100万円超部分は 20.42%) の目安値です。
            実際の税額は依頼者側の徴収実務・免除規定により変動します。
          </p>
        </section>
      )}

      {/* Free 用: PRO upsell */}
      {!isPro && payments.length > 0 && (
        <div className="mb-6 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50/70 p-5 sm:p-6">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-bold text-purple-900 mb-1">
                🎯 PRO なら、源泉徴収税の自動計算 + 月次集計もこの画面に表示
              </p>
              <p className="text-xs text-purple-800/80 leading-relaxed">
                確定申告時に「源泉徴収税額を月ごとに集計する」作業をゼロにできます。
                CSV 出力も月次サマリ・源泉税列付きの拡張版に切り替わります。
              </p>
            </div>
            <Link
              href="/pro/subscribe"
              className="shrink-0 inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-lg transition"
            >
              PRO の詳細を見る →
            </Link>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center border rounded-2xl bg-white">
          {year} 年に支払いが発生した案件はありません。
        </p>
      ) : (
        <div className="border rounded-2xl bg-white overflow-hidden">
          <div className="hidden md:grid grid-cols-[80px_1fr_120px_120px_120px_180px] gap-3 px-5 py-3 text-xs font-medium text-gray-500 bg-gray-50 border-b">
            <div>支払日</div>
            <div>案件 / 依頼主</div>
            <div className="text-right">受取額</div>
            <div className="text-right">手数料</div>
            <div className="text-right">状態</div>
            <div className="text-right">帳票</div>
          </div>
          <ul className="divide-y">
            {payments.map((p) => {
              const clientName =
                p.match.project?.client.displayName ?? p.match.project?.client.name ?? '—'
              const hasCharge = !!p.stripeChargeId
              return (
                <li key={p.id} className="px-5 py-4">
                  <div className="md:grid md:grid-cols-[80px_1fr_120px_120px_120px_180px] md:gap-3 md:items-center">
                    <div className="text-xs text-gray-500">
                      <span className="md:hidden">支払日: </span>
                      {formatDate(p.paidAt)}
                    </div>
                    <div className="min-w-0 mt-1 md:mt-0">
                      <Link
                        href={`/dashboard/chat/${p.matchId}`}
                        className="text-sm font-medium hover:text-purple-600 break-words"
                      >
                        {p.match.project?.title ?? '案件詳細'}
                      </Link>
                      <p className="text-xs text-gray-500">依頼主: {clientName}</p>
                    </div>
                    <div className="text-sm font-bold text-purple-700 mt-1 md:mt-0 md:text-right">
                      ¥{p.artistPayoutYen.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 md:mt-0 md:text-right">
                      ¥{p.platformFeeYen.toLocaleString()}
                    </div>
                    <div className="mt-1.5 md:mt-0 md:text-right">
                      <PaymentBadge status={p.status as PaymentStatus} size="sm" />
                    </div>
                    <div className="mt-2 md:mt-0 md:text-right">
                      <div className="flex gap-1.5 md:justify-end text-[11px] flex-wrap">
                        <Link
                          href={`/dashboard/matches/${p.matchId}/quote`}
                          target="_blank"
                          className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                        >
                          見積
                        </Link>
                        <Link
                          href={`/dashboard/matches/${p.matchId}/contract`}
                          target="_blank"
                          className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                        >
                          契約
                        </Link>
                        <Link
                          href={`/dashboard/matches/${p.matchId}/invoice`}
                          target="_blank"
                          className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                        >
                          請求
                        </Link>
                        {hasCharge && (
                          <Link
                            href={`/dashboard/matches/${p.matchId}/receipt`}
                            target="_blank"
                            className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                          >
                            領収
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-6 leading-relaxed">
        ※ 帳票 PDF は各リンクを別タブで開き、「印刷 / PDF 保存」ボタンから保存してください。
        領収書は Stripe が発行する公式領収書 (Hosted Receipt) にリダイレクトされます。
        年間の入出金明細を集計した CSV は上部の「CSV ダウンロード」から取得できます。
      </p>
    </div>
  )
}
