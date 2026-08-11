'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, APP_URL, SITE_NAME } from '@/lib/resend'
import { getDisplayName } from '@/lib/user'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_PER_CALL = 10

export async function sendInviteEmailAction(
  formData: FormData,
): Promise<{ success: true; sent: number } | { success: false; error: string }> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const emails = String(formData.get('emails') ?? '')
    .split(/[,;\s\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (emails.length === 0) {
    return { success: false, error: 'メールアドレスを入力してください' }
  }
  if (emails.length > MAX_PER_CALL) {
    return { success: false, error: `一度に送信できるのは ${MAX_PER_CALL} 件までです` }
  }
  const invalid = emails.filter((e) => !EMAIL_RE.test(e))
  if (invalid.length > 0) {
    return { success: false, error: `無効なメールアドレス: ${invalid.join(', ')}` }
  }

  const inviter = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, displayName: true },
  })
  if (!inviter) return { success: false, error: '招待者情報を取得できませんでした' }

  const inviterName = getDisplayName(inviter)
  const inviteUrl = `${APP_URL}/auth?ref=${session.user.id}`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <p>こんにちは、</p>
      <p><strong>${escapeHtml(inviterName)}</strong> さんが ${SITE_NAME} にあなたを招待しました。</p>
      <p>${SITE_NAME} は、音楽業界特化の <strong>イベント告知 × 仕事 DX × マッチング</strong> を 1 つにまとめたアプリです。<br>
      LINE や DM でやり取りしていた録音・ライブ・MIX 依頼を、記録と支払いまで残せる形に切り替えられます。</p>
      <p style="margin: 32px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(to right, #9333ea, #4f46e5); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          ${SITE_NAME} をはじめる
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        リンクが動作しない場合は、以下の URL をコピーしてブラウザに貼り付けてください:<br>
        <a href="${inviteUrl}" style="color: #7c3aed;">${inviteUrl}</a>
      </p>
    </div>
  `

  const results = await Promise.allSettled(
    emails.map((email) =>
      sendEmail({
        to: email,
        subject: `${inviterName} さんが ${SITE_NAME} にあなたを招待しました`,
        html,
      }),
    ),
  )
  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    return { success: false, error: `${failed} 件の送信に失敗しました。時間をおいて再度お試しください。` }
  }
  return { success: true, sent: emails.length }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
