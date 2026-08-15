'use server'

// Stripe Connect (Express) オンボーディングまわりの Server Actions
// - startConnectOnboardingAction: アカウント作成 (初回のみ) → Stripe ホスト画面へリダイレクト
// - refreshConnectStatusAction:   Stripe から charges/payouts フラグを取ってきて DB へ同期
//   Webhook (P6) 実装までは、オンボーディング戻り時に呼ぶ必要がある

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { resolveAppUrl } from '@/lib/app-url'

function appUrl(): string {
  return resolveAppUrl()
}

export async function startConnectOnboardingAction() {
  const session = await auth()
  if (!session) throw new Error('unauthorized')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, stripeConnectAccountId: true },
  })
  if (!user) throw new Error('user not found')

  const stripe = getStripe()

  let accountId = user.stripeConnectAccountId
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'JP',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { userId: user.id },
    })
    accountId = account.id
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeConnectAccountId: accountId },
    })
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl()}/dashboard/payouts?refresh=1`,
    return_url: `${appUrl()}/dashboard/payouts?onboarded=1`,
    type: 'account_onboarding',
  })

  redirect(link.url)
}

export async function refreshConnectStatusAction() {
  const session = await auth()
  if (!session) throw new Error('unauthorized')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      stripeConnectAccountId: true,
      stripeOnboardingCompletedAt: true,
    },
  })
  if (!user?.stripeConnectAccountId) return

  const stripe = getStripe()
  const account = await stripe.accounts.retrieve(user.stripeConnectAccountId)
  const chargesEnabled = account.charges_enabled ?? false
  const payoutsEnabled = account.payouts_enabled ?? false
  const nowFullyReady = chargesEnabled && payoutsEnabled

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeChargesEnabled: chargesEnabled,
      stripePayoutsEnabled: payoutsEnabled,
      // 一度両方有効化された時刻を記録（後から revoked されても消さない）
      ...(nowFullyReady && !user.stripeOnboardingCompletedAt
        ? { stripeOnboardingCompletedAt: new Date() }
        : {}),
    },
  })
  revalidatePath('/dashboard/payouts')
}
