import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { refreshConnectStatusAction } from '@/server/actions/payouts'
import { PayoutsClient } from './payouts-client'
import { PaymentHistory, type PayoutHistoryRow } from './payment-history'
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
            project: { select: { title: true } },
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
    paidAt: p.paidAt?.toISOString() ?? null,
    releasedAt: p.releasedAt?.toISOString() ?? null,
  }))

  const totalReceived = historyRows
    .filter((r) => r.status === 'RELEASED')
    .reduce((sum, r) => sum + r.artistPayoutYen, 0)
  const pendingCount = historyRows.filter((r) => r.status === 'HELD').length

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
        <PaymentHistory rows={historyRows} />
      </div>
    </div>
  )
}
