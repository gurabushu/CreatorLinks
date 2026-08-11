// Stripe Webhook: 決済ライフサイクルを DB に反映
// エンドポイントを Stripe Dashboard に登録:
//   URL:    https://<your-host>/api/stripe/webhook
//   Signing secret を STRIPE_WEBHOOK_SECRET に設定
// 監視イベント: payment_intent.succeeded / payment_intent.payment_failed /
//               account.updated / charge.refunded / transfer.created
// ローカル開発: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
//
// 実装方針:
// - Stripe SDK の webhooks.constructEvent で HMAC 検証（RevenueCat は自前検証だがこちらは SDK 任せ）
// - rate-limit は RevenueCat webhook と同じ流儀（`checkRateLimit('webhook', ip)`）
// - 冪等性: updateMany + WHERE 条件で二重反映を防ぐ

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// Node ランタイム必須（Stripe SDK が node:crypto を使うため）
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature) {
    // 署名なしの POST は rate limit 対象。Stripe からの正規リトライは常に署名を持つ。
    const ip = getClientIp(req.headers)
    const rl = await checkRateLimit('webhook', ip)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'rate limited' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      )
    }
    return NextResponse.json({ error: 'missing signature' }, { status: 401 })
  }
  if (!secret) {
    return NextResponse.json({ error: 'secret not configured' }, { status: 401 })
  }

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (e) {
    // 署名不正は攻撃/設定ミスの可能性が高い。IP でレート制限しつつ 401 を返す。
    const ip = getClientIp(req.headers)
    await checkRateLimit('webhook', ip)
    return NextResponse.json(
      { error: 'invalid signature', detail: (e as { message?: string })?.message },
      { status: 401 },
    )
  }

  // 冪等性: event.id をユニーク insert して重複イベントを弾く。
  // Stripe は指数バックオフで最大 3 日リトライするため、同じ event.id が複数回届く前提。
  try {
    await prisma.processedStripeEvent.create({
      data: { id: event.id, type: event.type },
    })
  } catch (e) {
    const code = (e as { code?: string })?.code
    if (code === 'P2002') {
      // 既処理: 200 で ack して Stripe のリトライを止める
      return NextResponse.json({ ok: true, duplicate: true, type: event.type })
    }
    throw e
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object)
        break
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object)
        break
      case 'account.updated':
        await handleAccountUpdated(event.data.object)
        break
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object)
        break
      case 'transfer.created':
        // Transfer は releasePayment 側で DB に記録済みのため no-op（Stripe 側での万一の再送に備えて 200 を返す）
        break
      default:
        return NextResponse.json({ ok: true, skipped: event.type })
    }
    return NextResponse.json({ ok: true, type: event.type })
  } catch (e) {
    // ハンドラー失敗時は ProcessedStripeEvent の insert を巻き戻し、Stripe のリトライで
    // 再処理できるようにする。
    await prisma.processedStripeEvent.delete({ where: { id: event.id } }).catch(() => {})
    console.error('[stripe-webhook] handler failed', {
      eventId: event.id,
      type: event.type,
      err: (e as { message?: string })?.message ?? String(e),
    })
    return NextResponse.json(
      { error: 'handler failed', detail: (e as { message?: string })?.message },
      { status: 500 },
    )
  }
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  const paymentId = pi.metadata?.paymentId
  if (!paymentId) return

  const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : null

  // charge id / payment_intent id はレース側 (checkPaymentStatusAction) との勝ち負けに関わらず
  // 常に埋める。releasePayment は stripeChargeId が無いと失敗する ('no_charge')。
  await prisma.payment.updateMany({
    where: {
      id: paymentId,
      OR: [
        { stripeChargeId: null },
        { stripePaymentIntentId: null },
      ],
    },
    data: {
      ...(chargeId ? { stripeChargeId: chargeId } : {}),
      stripePaymentIntentId: pi.id,
    },
  })

  // ステータス遷移は AWAITING のみ HELD に。既に HELD/RELEASED/REFUNDED なら no-op。
  await prisma.payment.updateMany({
    where: { id: paymentId, status: 'AWAITING' },
    data: { status: 'HELD', paidAt: new Date() },
  })
}

async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
  const paymentId = pi.metadata?.paymentId
  if (!paymentId) return

  // AWAITING のときのみ FAILED に。HELD 以降は無視（後続の返金は charge.refunded で処理）
  await prisma.payment.updateMany({
    where: { id: paymentId, status: 'AWAITING' },
    data: { status: 'FAILED', failedAt: new Date() },
  })
}

async function handleAccountUpdated(account: Stripe.Account) {
  const user = await prisma.user.findUnique({
    where: { stripeConnectAccountId: account.id },
    select: { id: true, stripeOnboardingCompletedAt: true },
  })
  if (!user) return

  const chargesEnabled = account.charges_enabled ?? false
  const payoutsEnabled = account.payouts_enabled ?? false
  const nowFullyReady = chargesEnabled && payoutsEnabled

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeChargesEnabled: chargesEnabled,
      stripePayoutsEnabled: payoutsEnabled,
      // 一度でも両方 true になった時刻を記録（後で revoked されても消さない）
      ...(nowFullyReady && !user.stripeOnboardingCompletedAt
        ? { stripeOnboardingCompletedAt: new Date() }
        : {}),
    },
  })
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
  if (!piId) return

  // 部分返金は Payment を REFUNDED に遷移させない（残額の release を潰さない）。
  // Stripe は同一 charge に対して複数回 charge.refunded を送るため、amount 比較で全額返金のみ拾う。
  const fullyRefunded =
    charge.refunded === true ||
    (typeof charge.amount === 'number' &&
      typeof charge.amount_refunded === 'number' &&
      charge.amount_refunded >= charge.amount)
  if (!fullyRefunded) return

  // HELD の Payment のみ REFUNDED に。RELEASED 済のケースは別途 transfer reversal が必要なので今スコープ外
  await prisma.payment.updateMany({
    where: { stripePaymentIntentId: piId, status: 'HELD' },
    data: { status: 'REFUNDED', refundedAt: new Date() },
  })
}
