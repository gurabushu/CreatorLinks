'use server'

// Stripe Connect 案件代金決済（Separate Charges & Transfers 方式）
// - createCheckoutSessionAction: 発注者が案件代金を支払う Checkout Session を作成 → redirect
// - checkPaymentStatusAction:    Checkout 戻り時の Payment ステータス同期（webhook 未到達時のフォールバック）
// - releasePaymentAction:        検収完了後の手動送金確定（7 日自動リリース cron の前倒し）
//
// 決済フロー：
//   ACCEPTED → Checkout（Platform 収納 = AWAITING → webhook で HELD）
//   → 納品 → 検収 COMPLETED → 手動 or 7 日後自動リリース → Transfer で artist 送金 = RELEASED

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CURRENCY, calcArtistPayout, calcPlatformFee, getStripe } from '@/lib/stripe'
import { releasePayment } from '@/lib/payment-release'

export type ReleaseActionResult =
  | { success: true }
  | { success: false; error: string }

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

// 発注者が案件代金を支払う Checkout Session を作成し、Stripe へ redirect
// 認可: session.user.id === project.clientId、Match ACCEPTED、artist の Connect Onboarding 完了
export async function createCheckoutSessionAction(matchId: string): Promise<never> {
  const session = await auth()
  if (!session) throw new Error('unauthorized')

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      status: true,
      project: {
        select: { id: true, clientId: true, title: true, budget: true },
      },
      artist: {
        select: { stripePayoutsEnabled: true, stripeConnectAccountId: true },
      },
      payment: {
        select: { id: true, status: true },
      },
    },
  })
  if (!match) throw new Error('match not found')
  if (!match.project) throw new Error('P2P マッチは決済対象外です')
  if (match.project.clientId !== session.user.id) throw new Error('forbidden')
  if (match.status !== 'ACCEPTED') throw new Error('この案件はまだ支払い可能な状態ではありません')

  const budget = match.project.budget
  if (!budget || budget <= 0) throw new Error('案件金額が未設定です')

  if (!match.artist.stripeConnectAccountId || !match.artist.stripePayoutsEnabled) {
    throw new Error('相手アーティストの入金設定が未完了のため支払いできません')
  }

  // 二重支払い防止：HELD/RELEASED/REFUNDED は再決済不可
  if (
    match.payment &&
    (['HELD', 'RELEASED', 'REFUNDED'] as const).includes(
      match.payment.status as 'HELD' | 'RELEASED' | 'REFUNDED',
    )
  ) {
    throw new Error('この案件は既に支払い済みです')
  }

  const platformFeeYen = calcPlatformFee(budget)
  const artistPayoutYen = calcArtistPayout(budget)

  // Payment upsert: 同 matchId で複数回叩かれても 1 レコード。FAILED からの再挑戦にも対応
  const payment = await prisma.payment.upsert({
    where: { matchId: match.id },
    create: {
      matchId: match.id,
      amountYen: budget,
      platformFeeYen,
      artistPayoutYen,
      currency: CURRENCY,
      status: 'AWAITING',
    },
    update: {
      amountYen: budget,
      platformFeeYen,
      artistPayoutYen,
      status: 'AWAITING',
      failedAt: null,
    },
    select: { id: true },
  })

  const stripe = getStripe()
  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          product_data: {
            name: match.project.title,
            description: `案件マッチ #${match.id}`,
          },
          unit_amount: budget,
        },
      },
    ],
    // Separate Charges & Transfers: 支払いは Platform に入り、後で Transfer で artist へ送る
    // transfer_group で PaymentIntent と Transfer を紐付ける
    payment_intent_data: {
      transfer_group: `match_${match.id}`,
      metadata: { paymentId: payment.id, matchId: match.id },
    },
    metadata: { paymentId: payment.id, matchId: match.id },
    success_url: `${appUrl()}/dashboard/chat/${match.id}?paid=1`,
    cancel_url: `${appUrl()}/dashboard/chat/${match.id}`,
  })

  if (!checkout.url) throw new Error('checkout url missing')
  redirect(checkout.url)
}

// Checkout 戻り時のフォールバック: webhook 未到達なら Stripe に問い合わせて HELD に遷移
// 通常は webhook が先に来るので no-op になる想定
export async function checkPaymentStatusAction(matchId: string): Promise<void> {
  const session = await auth()
  if (!session) return

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      project: { select: { clientId: true } },
      payment: {
        select: { id: true, status: true },
      },
    },
  })
  if (!match?.payment) return
  if (match.project?.clientId !== session.user.id) return
  if (match.payment.status !== 'AWAITING') return

  // Checkout Session を metadata.paymentId で探す（Stripe API は metadata 検索非対応のため直近 list から絞る）
  const stripe = getStripe()
  const sessions = await stripe.checkout.sessions.list({ limit: 20 })
  const target = sessions.data.find((s) => s.metadata?.paymentId === match.payment!.id)
  if (!target || !target.payment_intent) return

  const piId =
    typeof target.payment_intent === 'string' ? target.payment_intent : target.payment_intent.id
  const pi = await stripe.paymentIntents.retrieve(piId)
  if (pi.status !== 'succeeded') return

  const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : null

  // 冪等性: AWAITING のときのみ HELD へ
  await prisma.payment.updateMany({
    where: { id: match.payment.id, status: 'AWAITING' },
    data: {
      status: 'HELD',
      paidAt: new Date(),
      stripePaymentIntentId: piId,
      ...(chargeId ? { stripeChargeId: chargeId } : {}),
    },
  })
  revalidatePath(`/dashboard/chat/${matchId}`)
}

// 発注者が検収完了後、7 日待たずに手動で送金を確定
// 認可: session.user.id === project.clientId、Match COMPLETED、Payment HELD
export async function releasePaymentAction(matchId: string): Promise<ReleaseActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'unauthorized' }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      status: true,
      project: { select: { clientId: true } },
      payment: { select: { id: true, status: true } },
    },
  })
  if (!match) return { success: false, error: 'match not found' }
  if (match.project?.clientId !== session.user.id) return { success: false, error: 'forbidden' }
  if (match.status !== 'COMPLETED') {
    return { success: false, error: '納品完了後に送金できます' }
  }
  if (!match.payment) return { success: false, error: 'payment not found' }
  if (match.payment.status !== 'HELD') {
    return { success: false, error: `送金できない状態です (${match.payment.status})` }
  }

  const result = await releasePayment(match.payment.id)
  if (result.ok) {
    revalidatePath(`/dashboard/chat/${matchId}`)
    return { success: true }
  }

  const reasonMap: Record<typeof result.reason, string> = {
    payment_not_found: 'Payment レコードが見つかりません',
    not_held: '送金可能な状態ではありません',
    no_charge: 'Charge が確認できません（少し時間を置いて再試行してください）',
    artist_not_connected: 'アーティストの入金設定が未完了です',
    stripe_error: `Stripe エラー: ${result.detail ?? ''}`.trim(),
  }
  return { success: false, error: reasonMap[result.reason] ?? '送金に失敗しました' }
}
