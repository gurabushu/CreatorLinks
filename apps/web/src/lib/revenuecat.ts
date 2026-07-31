// RevenueCat Web Billing 連携: サーバー側ユーティリティ
// - Webhook の HMAC 署名検証（RevenueCat が X-RevenueCat-Webhook-Signature ヘッダで送信）
// - Entitlement 名の集中管理

import crypto from 'node:crypto'

// RevenueCat ダッシュボードで作成した PRO 用 entitlement の識別子
// デフォルトは "pro"。RC 側の設定に合わせて環境変数で上書き可能。
export const PRO_ENTITLEMENT_ID = process.env.NEXT_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID ?? 'pro'

const WEBHOOK_TOLERANCE_SEC = 5 * 60

export type RevenueCatWebhookVerification =
  | { valid: true }
  | { valid: false; reason: string }

// RevenueCat の署名ヘッダを検証。rawBody は必ず受信バイト列そのまま渡すこと。
// フォーマット: "t=<unix_timestamp>,v1=<hmac_sha256_hex>"
export function verifyRevenueCatWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
): RevenueCatWebhookVerification {
  if (!secret) return { valid: false, reason: 'secret not configured' }
  if (!signatureHeader) return { valid: false, reason: 'missing signature header' }

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const [k, v] = p.split('=')
      return [k.trim(), v?.trim() ?? '']
    }),
  ) as { t?: string; v1?: string }

  if (!parts.t || !parts.v1) return { valid: false, reason: 'malformed signature header' }

  const timestamp = Number(parts.t)
  if (!Number.isFinite(timestamp)) return { valid: false, reason: 'invalid timestamp' }

  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - timestamp) > WEBHOOK_TOLERANCE_SEC) {
    return { valid: false, reason: 'stale signature' }
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${parts.t}.${rawBody}`)
    .digest('hex')

  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(parts.v1, 'utf8')
  if (a.length !== b.length) return { valid: false, reason: 'signature length mismatch' }
  if (!crypto.timingSafeEqual(a, b)) return { valid: false, reason: 'signature mismatch' }

  return { valid: true }
}
