// inngest/functions.ts — バックグラウンドジョブ関数定義
import { inngest } from '@/lib/inngest'
import { sendEmail, APP_URL, SITE_NAME } from '@/lib/resend'

// ---- マッチング承認通知（アーティストへ） ----
export const notifyMatchAccepted = inngest.createFunction(
  { id: 'notify-match-accepted', name: 'マッチング承認通知' },
  { event: 'match/accepted' },
  async ({ event }) => {
    const { artistEmail, artistName, clientName, projectTitle, matchId } = event.data

    await sendEmail({
      to: artistEmail,
      subject: `【${SITE_NAME}】案件への応募が承認されました`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #7c3aed; font-size: 22px; margin-bottom: 16px;">応募が承認されました！</h1>
          <p>${artistName} さん、こんにちは。</p>
          <p>
            <strong>${clientName}</strong> さんが、案件 <strong>「${projectTitle}」</strong> への
            あなたの応募を承認しました。
          </p>
          <p>チャットで詳細を詰めましょう。</p>
          <div style="margin: 24px 0;">
            <a
              href="${APP_URL}/dashboard/chat/${matchId}"
              style="background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;"
            >
              チャットを開く
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            ${SITE_NAME} — 個人アーティストのための営業プラットフォーム
          </p>
        </div>
      `,
    })

    return { sent: true, to: artistEmail }
  }
)

// ---- 応募受付通知（発注者へ） ----
export const notifyMatchApplied = inngest.createFunction(
  { id: 'notify-match-applied', name: '応募受付通知' },
  { event: 'match/applied' },
  async ({ event }) => {
    const { clientEmail, clientName, artistName, projectTitle, matchId } = event.data

    await sendEmail({
      to: clientEmail,
      subject: `【${SITE_NAME}】案件に新しい応募がありました`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #7c3aed; font-size: 22px; margin-bottom: 16px;">新しい応募が届きました</h1>
          <p>${clientName} さん、こんにちは。</p>
          <p>
            案件 <strong>「${projectTitle}」</strong> に
            <strong>${artistName}</strong> さんから応募がありました。
          </p>
          <div style="margin: 24px 0;">
            <a
              href="${APP_URL}/projects/manage"
              style="background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;"
            >
              応募を確認する
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            ${SITE_NAME} — 個人アーティストのための営業プラットフォーム
          </p>
        </div>
      `,
    })

    return { sent: true, to: clientEmail }
  }
)

// ---- 新着メッセージ通知（遅延配信 — 5分後も未読なら送信） ----
export const notifyNewMessage = inngest.createFunction(
  {
    id: 'notify-new-message',
    name: '新着メッセージ通知',
    // 同一 matchId + recipient の通知は最新1件のみ（debounce）
    debounce: { key: 'event.data.matchId', period: '5m' },
  },
  { event: 'message/received' },
  async ({ event }) => {
    const { recipientEmail, recipientName, senderName, messagePreview, matchId } = event.data

    await sendEmail({
      to: recipientEmail,
      subject: `【${SITE_NAME}】${senderName} さんからメッセージが届いています`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #7c3aed; font-size: 22px; margin-bottom: 16px;">新しいメッセージ</h1>
          <p>${recipientName} さん、こんにちは。</p>
          <p><strong>${senderName}</strong> さんからメッセージが届いています。</p>
          <div style="background: #f3f4f6; border-left: 4px solid #7c3aed; padding: 16px; border-radius: 4px; margin: 16px 0;">
            <p style="margin: 0; color: #374151;">${messagePreview}</p>
          </div>
          <div style="margin: 24px 0;">
            <a
              href="${APP_URL}/dashboard/chat/${matchId}"
              style="background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;"
            >
              返信する
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            ${SITE_NAME} — 個人アーティストのための営業プラットフォーム<br/>
            ※ このメールはチャット画面を開くことで通知が停止されます。
          </p>
        </div>
      `,
    })

    return { sent: true, to: recipientEmail }
  }
)

// ---- P2P マッチ成立通知（双方へ） ----
export const notifyP2PMatched = inngest.createFunction(
  { id: 'notify-p2p-matched', name: 'P2P マッチ成立通知' },
  { event: 'match/p2p-matched' },
  async ({ event }) => {
    const { matchId, userAEmail, userAName, userBEmail, userBName } = event.data

    const template = (to: string, name: string, partner: string) => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #db2777; font-size: 22px; margin-bottom: 16px;">マッチング成立 🎉</h1>
        <p>${name} さん、こんにちは。</p>
        <p>
          <strong>${partner}</strong> さんと相互いいねでマッチしました。
          チャットで非公開案件を相互紹介できます。
        </p>
        <div style="margin: 24px 0;">
          <a
            href="${APP_URL}/dashboard/chat/${matchId}"
            style="background: #db2777; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;"
          >
            チャットを開く
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">
          ${SITE_NAME} — 個人アーティストのための営業プラットフォーム
        </p>
      </div>
    `

    await Promise.all([
      sendEmail({
        to: userAEmail,
        subject: `【${SITE_NAME}】${userBName} さんとマッチしました`,
        html: template(userAEmail, userAName, userBName),
      }),
      sendEmail({
        to: userBEmail,
        subject: `【${SITE_NAME}】${userAName} さんとマッチしました`,
        html: template(userBEmail, userBName, userAName),
      }),
    ])

    return { sent: true, matchId }
  }
)

// 全関数をまとめてエクスポート
export const functions = [
  notifyMatchAccepted,
  notifyMatchApplied,
  notifyNewMessage,
  notifyP2PMatched,
]
