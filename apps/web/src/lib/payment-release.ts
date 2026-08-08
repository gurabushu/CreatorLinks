// 決済リリース処理: Payment (HELD) → Stripe Transfer → Payment (RELEASED)
// - 発注者の手動確認 (server action) と 7 日自動リリース cron の両方から呼ぶ共通ロジック
// - Stripe API と DB 更新を 1 セットにする

import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

export type ReleaseResult =
  | { ok: true; transferId: string; paymentId: string }
  | { ok: false; reason: ReleaseFailReason; paymentId: string; detail?: string }

export type ReleaseFailReason =
  | 'payment_not_found'
  | 'not_held'
  | 'no_charge'
  | 'artist_not_connected'
  | 'stripe_error'

// Payment を Stripe Transfer で送金し、DB を RELEASED に遷移させる。
// 冪等性: 既に RELEASED の場合は not_held を返して no-op（誤って 2 回叩かれても Transfer が重複しない）
export async function releasePayment(paymentId: string): Promise<ReleaseResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      matchId: true,
      status: true,
      artistPayoutYen: true,
      currency: true,
      stripeChargeId: true,
      match: {
        select: {
          artist: {
            select: {
              stripeConnectAccountId: true,
              stripePayoutsEnabled: true,
            },
          },
        },
      },
    },
  })
  if (!payment) return { ok: false, reason: 'payment_not_found', paymentId }
  if (payment.status !== 'HELD') {
    return { ok: false, reason: 'not_held', paymentId, detail: payment.status }
  }
  if (!payment.stripeChargeId) {
    return { ok: false, reason: 'no_charge', paymentId }
  }
  const artist = payment.match.artist
  if (!artist.stripeConnectAccountId || !artist.stripePayoutsEnabled) {
    return { ok: false, reason: 'artist_not_connected', paymentId }
  }

  const stripe = getStripe()
  try {
    const transfer = await stripe.transfers.create({
      amount: payment.artistPayoutYen,
      currency: payment.currency,
      destination: artist.stripeConnectAccountId,
      transfer_group: `match_${payment.matchId}`,
      source_transaction: payment.stripeChargeId,
      metadata: { paymentId: payment.id, matchId: payment.matchId },
    })

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
        stripeTransferId: transfer.id,
      },
    })

    return { ok: true, transferId: transfer.id, paymentId }
  } catch (e) {
    return {
      ok: false,
      reason: 'stripe_error',
      paymentId,
      detail: (e as { message?: string })?.message ?? String(e),
    }
  }
}
