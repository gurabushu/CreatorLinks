import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { refreshConnectStatusAction } from '@/server/actions/payouts'
import { PayoutsClient } from './payouts-client'
import { PaymentHistory, type PayoutHistoryRow, calcProUpliftYen } from './payment-history'
import type { PaymentStatus } from '@/components/payments/payment-badge'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ onboarded?: string; refresh?: string }>
}

export default async function PayoutsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect('/auth')

  const { onboarded } = await searchParams

  // Stripe オンボーディング画面から戻ってきた場合、最新ステータスを DB に反映
  // Webhook (P6) 実装後はこの一手間が不要になる
  if (onboarded) {
    try {
      await refreshConnectStatusAction()
    } catch {
      // Stripe 到達不能でも表示は続ける
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true, // PRO 判定に使用（Free ユーザーには「PRO なら +¥X」列を出す）
      stripeConnectAccountId: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeOnboardingCompletedAt: true,
    },
  })

  // 受取履歴: 自分がアーティスト側のマッチで、支払い完了以降の Payment
  const paymentsRaw = await prisma.payment
    .findMany({
      where: {
        status: { in: ['HELD', 'RELEASED', 'REFUNDED'] },
        match: { artistId: session.user.id },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        matchId: true,
        status: true,
        amountYen: true,
        artistPayoutYen: true,
        paidAt: true,
        releasedAt: true,
        match: {
          select: {
            project: { select: { id: true, title: true } },
          },
        },
      },
    })
    .catch(() => [])

  const historyRows: PayoutHistoryRow[] = paymentsRaw.map((p) => ({
    paymentId: p.id,
    matchId: p.matchId,
    status: p.status as PaymentStatus,
    amountYen: p.amountYen,
    artistPayoutYen: p.artistPayoutYen,
    projectTitle: p.match.project?.title ?? null,
    projectId: p.match.project?.id ?? null,
    paidAt: p.paidAt?.toISOString() ?? null,
    releasedAt: p.releasedAt?.toISOString() ?? null,
  }))

  const totalReceived = historyRows
    .filter((r) => r.status === 'RELEASED')
    .reduce((sum, r) => sum + r.artistPayoutYen, 0)
  const pendingCount = historyRows.filter((r) => r.status === 'HELD').length

  // PRO 差額の累計（Free ユーザー向けの upsell 材料）
  // RELEASED のみ集計（HELD/REFUNDED は確定していないので数字が動く）
  const isFree = user?.role !== 'PRO'
  const proUpliftTotal = isFree
    ? historyRows
        .filter((r) => r.status === 'RELEASED')
        .reduce((sum, r) => sum + calcProUpliftYen(r), 0)
    : 0

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-2">入金設定</h1>
      <p className="text-gray-500 text-sm mb-8">
        受注した案件の報酬を受け取るには、Stripe を通じて銀行口座の登録が必要です。
        本人確認と口座登録は Stripe のホスト画面で行われます。
      </p>
      <PayoutsClient
        hasAccount={!!user?.stripeConnectAccountId}
        chargesEnabled={user?.stripeChargesEnabled ?? false}
        payoutsEnabled={user?.stripePayoutsEnabled ?? false}
        completedAt={user?.stripeOnboardingCompletedAt?.toISOString() ?? null}
      />

      <div className="mt-12">
        <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-lg font-bold">受取履歴</h2>
          <div className="text-xs text-gray-500">
            累計受取 <span className="font-bold text-purple-700">¥{totalReceived.toLocaleString()}</span>
            {pendingCount > 0 && (
              <span className="ml-3">
                保留中 <span className="font-bold text-emerald-700">{pendingCount}件</span>
              </span>
            )}
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-600 flex-wrap">
          <span>確定申告用:</span>
          <Link
            href={`/dashboard/payouts/year/${new Date().getFullYear()}`}
            className="px-2 py-1 rounded border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium"
          >
            今年の帳票一覧
          </Link>
          <Link
            href={`/dashboard/payouts/year/${new Date().getFullYear() - 1}`}
            className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            昨年の帳票一覧
          </Link>
          <span className="mx-1 text-gray-300">/</span>
          <a
            href={`/api/payouts/csv?year=${new Date().getFullYear()}`}
            className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            今年 CSV
          </a>
          <a
            href={`/api/payouts/csv?year=${new Date().getFullYear() - 1}`}
            className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            昨年 CSV
          </a>
        </div>
        {/* Free ユーザーで RELEASED 案件があるなら、PRO への upsell バナーを表示 */}
        {isFree && proUpliftTotal > 0 && (
          <div className="mb-4 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50/70 p-4 sm:p-5">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-bold text-purple-900 leading-snug">
                  もし PRO で受注していたら、累計 <span className="text-lg text-purple-700">+¥{proUpliftTotal.toLocaleString()}</span> 手取りが増えていました。
                </p>
                <p className="text-xs text-purple-800/80 mt-1 leading-relaxed">
                  PRO プラン（¥980/月）は手数料 <b>7% → 5%</b> に減額。案件が動く月ほど元が取れます。
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
        {!isFree && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800">
            🎉 PRO 特典で手数料 5% 適用中。全案件からアーティスト受取が最大化されています。
          </div>
        )}
        <PaymentHistory rows={historyRows} showProUpsell={isFree} />
      </div>
    </div>
  )
}
