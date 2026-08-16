'use server'

// Admin 専用の Payment 操作 Server Actions。金銭トラブル対応用。
// - Stripe との強制同期（webhook 落ち対策）
// - 手動 release（cron を待たずアーティストへ送金確定）
// - 手動 refund（依頼者へ返金）
//
// すべて ADMIN ロール必須 + Stripe API 直叩き。実行は不可逆なので慎重に。

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { releasePayment } from '@/lib/payment-release'

export type AdminActionResult =
  | { success: true; message?: string }
  | { success: false; error: string }

async function requireAdmin() {
  const session = await auth()
  if (!session) return { ok: false as const, error: 'unauthorized' }
  if (session.user.role !== 'ADMIN') return { ok: false as const, error: 'forbidden' }
  return { ok: true as const, session }
}

// Stripe との強制同期
// - Payment.stripePaymentIntentId が入っていれば、PI を retrieve して最新 status を反映
// - webhook 落ちで DB が古いとき有効
export async function syncPaymentFromStripeAction(
  paymentId: string,
): Promise<AdminActionResult> {
  const gate = await requireAdmin()
  if (!gate.ok) return { success: false, error: gate.error }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      status: true,
      stripePaymentIntentId: true,
      stripeCheckoutSessionId: true,
      stripeChargeId: true,
    },
  })
  if (!payment) return { success: false, error: 'Payment が見つかりません' }

  const stripe = getStripe()
  let piId = payment.stripePaymentIntentId

  // PI id 未保存で Checkout Session id があれば、そこから引き出す
  if (!piId && payment.stripeCheckoutSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(payment.stripeCheckoutSessionId)
      piId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null
    } catch (e) {
      return { success: false, error: `Checkout Session retrieve 失敗: ${(e as Error).message}` }
    }
  }

  if (!piId) {
    return { success: false, error: 'Stripe PaymentIntent が特定できません（未支払い？）' }
  }

  let pi
  try {
    pi = await stripe.paymentIntents.retrieve(piId)
  } catch (e) {
    return { success: false, error: `PaymentIntent retrieve 失敗: ${(e as Error).message}` }
  }

  const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : null

  // charge / PI id は常に upsert
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      stripePaymentIntentId: piId,
      ...(chargeId ? { stripeChargeId: chargeId } : {}),
    },
  })

  // status を Stripe 側の実態に合わせて反映（下位遷移のみ、上位状態は保持）
  if (pi.status === 'succeeded' && payment.status === 'AWAITING') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'HELD', paidAt: new Date() },
    })
    revalidatePath('/admin/payments')
    revalidatePath(`/admin/payments/${paymentId}`)
    return { success: true, message: 'Stripe と同期: AWAITING → HELD' }
  }
  if (pi.status === 'canceled' && payment.status === 'AWAITING') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failedAt: new Date() },
    })
    revalidatePath('/admin/payments')
    revalidatePath(`/admin/payments/${paymentId}`)
    return { success: true, message: 'Stripe と同期: AWAITING → FAILED (canceled)' }
  }

  revalidatePath('/admin/payments')
  revalidatePath(`/admin/payments/${paymentId}`)
  return {
    success: true,
    message: `同期完了: Stripe PI status=${pi.status}, DB status=${payment.status} (変更なし)`,
  }
}

// 手動 release（cron を待たずアーティストへ送金確定）
export async function adminReleasePaymentAction(
  paymentId: string,
): Promise<AdminActionResult> {
  const gate = await requireAdmin()
  if (!gate.ok) return { success: false, error: gate.error }

  const result = await releasePayment(paymentId)
  if (result.ok) {
    revalidatePath('/admin/payments')
    revalidatePath(`/admin/payments/${paymentId}`)
    return { success: true, message: `Transfer 発行: ${result.transferId}` }
  }
  const reasonMap: Record<typeof result.reason, string> = {
    payment_not_found: 'Payment が見つかりません',
    not_held: `HELD 状態ではありません (現在: ${result.detail ?? '?'})`,
    no_charge: 'Charge が確認できません（先に Stripe sync を実行してください）',
    artist_not_connected: 'アーティストの Stripe Connect が未完了です',
    stripe_error: `Stripe エラー: ${result.detail ?? ''}`.trim(),
  }
  return { success: false, error: reasonMap[result.reason] ?? 'release 失敗' }
}

// 手動 refund（HELD 状態から Stripe refund → REFUNDED 遷移）
export async function adminRefundPaymentAction(
  paymentId: string,
): Promise<AdminActionResult> {
  const gate = await requireAdmin()
  if (!gate.ok) return { success: false, error: gate.error }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, status: true, stripeChargeId: true, stripePaymentIntentId: true },
  })
  if (!payment) return { success: false, error: 'Payment が見つかりません' }
  if (payment.status !== 'HELD') {
    return { success: false, error: `HELD 状態でのみ refund 可能 (現在: ${payment.status})` }
  }
  if (!payment.stripeChargeId && !payment.stripePaymentIntentId) {
    return { success: false, error: 'Charge / PaymentIntent が特定できません' }
  }

  const stripe = getStripe()
  try {
    await stripe.refunds.create(
      payment.stripeChargeId
        ? { charge: payment.stripeChargeId }
        : { payment_intent: payment.stripePaymentIntentId! },
      { idempotencyKey: `refund_${payment.id}` },
    )
  } catch (e) {
    return { success: false, error: `Stripe refund 失敗: ${(e as Error).message}` }
  }

  // webhook が来て REFUNDED に遷移するはずだが、レース対策で先行更新
  await prisma.payment.updateMany({
    where: { id: paymentId, status: 'HELD' },
    data: { status: 'REFUNDED', refundedAt: new Date() },
  })

  revalidatePath('/admin/payments')
  revalidatePath(`/admin/payments/${paymentId}`)
  return { success: true, message: 'Refund 発行 → REFUNDED 遷移完了' }
}
