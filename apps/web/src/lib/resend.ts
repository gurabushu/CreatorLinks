// lib/resend.ts — Resend メール送信クライアント
import { Resend } from 'resend'
import { SITE_NAME } from './brand'

// RESEND_API_KEY が未設定の場合は noop クライアント（開発時）
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@creatorlinks.jp'
// 過去 import 互換のため再エクスポート。新規コードは '@/lib/brand' から取ること。
export { SITE_NAME }
// APP_URL: 招待 URL / メール本文 / リンクの生成に使う。多段フォールバックは lib/app-url.ts に集約。
import { resolveAppUrl } from './app-url'
export const APP_URL = resolveAppUrl()

// メール送信ヘルパー。
// - dev / preview で RESEND_API_KEY 未設定: ターミナルに links を出力（reset リンク拾い用）
// - production で未設定: throw（reset token を Vercel ログに漏らさない fail-closed）
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
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[resend] RESEND_API_KEY が未設定です。本番では必ず設定してください（fail-closed）。',
      )
    }
    // dev / test のみ: 本文中の URL を抽出してターミナル表示（reset / email-change リンク拾い用）
    const links = Array.from(html.matchAll(/https?:\/\/[^"'\s<>]+/g)).map((m) => m[0])
    console.log('\n[Mail Dev] ' + '='.repeat(60))
    console.log('  to     :', to)
    console.log('  subject:', subject)
    if (links.length > 0) {
      console.log('  links  :')
      for (const link of links) console.log('    →', link)
    }
    console.log('=' + '='.repeat(66) + '\n')
    return
  }

  await resend.emails.send({
    from: `${SITE_NAME} <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  })
}
