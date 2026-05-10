// lib/resend.ts — Resend メール送信クライアント
import { Resend } from 'resend'

// RESEND_API_KEY が未設定の場合は noop クライアント（開発時）
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export const FROM_EMAIL = 'noreply@creatorlinks.jp'
export const SITE_NAME = 'CreatorLinks'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// メール送信ヘルパー（Resend 未設定時はコンソールログ）
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (!resend) {
    console.log('[Mail Dev]', { to, subject })
    return
  }

  await resend.emails.send({
    from: `${SITE_NAME} <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  })
}
