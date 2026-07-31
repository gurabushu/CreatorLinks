// RevenueCat Web Billing webhook: 購読ライフサイクルを DB に反映
// エンドポイントを RevenueCat ダッシュボードに登録:
//   URL:    https://<your-host>/api/revenuecat/webhook
//   Method: POST (HMAC 署名を有効化し、REVENUECAT_WEBHOOK_SIGNING_SECRET と同じシークレットを設定)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRevenueCatWebhook, PRO_ENTITLEMENT_ID } from '@/lib/revenuecat'
import { isEarlyBirdFreeActive } from '@/lib/early-bird'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// Node ランタイム必須（node:crypto を使うため）
export const runtime = 'nodejs'

type RcEvent = {
  type: string
  app_user_id: string
  original_app_user_id?: string
  aliases?: string[]
  entitlement_ids?: string[] | null
}

type RcWebhookBody = {
  api_version: string
  event: RcEvent
}

const GRANT_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION'])
const REVOKE_EVENTS = new Set(['CANCELLATION', 'EXPIRATION'])

export async function POST(req: NextRequest) {
  // HMAC 検証済みだが、署名総当たり / リプレイ抑止として IP ベースの上限をかける
  const ip = getClientIp(req.headers)
  const rl = await checkRateLimit('webhook', ip)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-revenuecat-webhook-signature')

  const verification = verifyRevenueCatWebhook(
    rawBody,
    signature,
    process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET,
  )
  if (!verification.valid) {
    return NextResponse.json({ error: verification.reason }, { status: 401 })
  }

  let body: RcWebhookBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const event = body.event
  if (!event || typeof event.app_user_id !== 'string') {
    return NextResponse.json({ error: 'invalid event' }, { status: 400 })
  }

  // PRO entitlement を含むイベントのみ処理する
  const entitlementIds = event.entitlement_ids ?? []
  if (!entitlementIds.includes(PRO_ENTITLEMENT_ID)) {
    return NextResponse.json({ ok: true, skipped: 'entitlement not tracked' })
  }

  const userId = event.app_user_id

  if (GRANT_EVENTS.has(event.type)) {
    // 本課金アクティブフラグを立てる。失効 cron はこのフラグ true のユーザーを対象外にする
    await prisma.user
      .update({
        where: { id: userId },
        data: { role: 'PRO', hasPaidSubscription: true },
      })
      .catch(() => null)
    return NextResponse.json({ ok: true })
  }

  if (REVOKE_EVENTS.has(event.type)) {
    const user = await prisma.user
      .findUnique({
        where: { id: userId },
        select: { earlyBirdSlot: true, earlyBirdExpiresAt: true, role: true },
      })
      .catch(() => null)
    if (!user) return NextResponse.json({ ok: true })

    // 常に hasPaidSubscription は false に落とす（本課金は終了）。
    // 創設メンバーの無料期間中（旧永久組を含む）は role は PRO のまま維持する
    const shouldRevokeRole = user.role === 'PRO' && !isEarlyBirdFreeActive(user)
    await prisma.user
      .update({
        where: { id: userId },
        data: {
          hasPaidSubscription: false,
          ...(shouldRevokeRole ? { role: 'GENERAL' as const } : {}),
        },
      })
      .catch(() => null)
    return NextResponse.json({ ok: true })
  }

  // BILLING_ISSUE / TRANSFER / SUBSCRIBER_ALIAS などは今回は無視して 200 を返す
  return NextResponse.json({ ok: true, skipped: `unhandled type: ${event.type}` })
}
