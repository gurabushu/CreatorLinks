// inngest/functions.ts — バックグラウンドジョブ関数定義
import { inngest } from '@/lib/inngest'
import { sendEmail, APP_URL, SITE_NAME } from '@/lib/resend'
import { prisma } from '@/lib/prisma'

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
        <h1 style="color: #db2777; font-size: 22px; margin-bottom: 16px;">マッチング成立</h1>
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

// ---- 創設メンバー無料期間の失効（日次 cron） ----
// earlyBirdExpiresAt を過ぎた PRO ユーザーを GENERAL に落とす。
// 本課金アクティブユーザー（hasPaidSubscription = true）は対象外。
// earlyBirdSlot 自体は残り、"創設メンバー" バッジは永久に表示される。
export const expireEarlyBirdFreeTier = inngest.createFunction(
  { id: 'expire-early-bird-free-tier', name: '創設メンバー無料期間の失効' },
  { cron: '0 15 * * *' }, // UTC 15:00 = JST 00:00
  async () => {
    const now = new Date()
    const result = await prisma.user.updateMany({
      where: {
        role: 'PRO',
        hasPaidSubscription: false,
        hasLifetimeFreePro: false, // プロモコード付与の永年無料組は失効させない
        earlyBirdSlot: { not: null },
        earlyBirdExpiresAt: { lt: now, not: null },
      },
      data: { role: 'GENERAL' },
    })
    return { downgraded: result.count, at: now.toISOString() }
  }
)

// ---- 創設メンバー無料期間終了の切迫通知（14日前）----
// earlyBirdExpiresAt が 7〜14 日後で、本課金なし・通知未送信のユーザーへ 1 回だけメール送信。
// earlyBirdReminderSentAt を立てて重複送信を防ぐ。
export const notifyEarlyBirdExpiring = inngest.createFunction(
  { id: 'notify-early-bird-expiring', name: '創設メンバー無料期間の終了予告' },
  { cron: '0 16 * * *' }, // UTC 16:00 = JST 01:00（失効 cron の 1 時間後）
  async () => {
    const now = new Date()
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const in14days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const targets = await prisma.user.findMany({
      where: {
        role: 'PRO',
        hasPaidSubscription: false,
        hasLifetimeFreePro: false, // 永年無料組には期限切れ通知不要
        earlyBirdSlot: { not: null },
        earlyBirdReminderSentAt: null,
        earlyBirdExpiresAt: { gte: in7days, lte: in14days },
      },
      select: { id: true, email: true, name: true, earlyBirdSlot: true, earlyBirdExpiresAt: true },
    })

    let sent = 0
    for (const u of targets) {
      const daysLeft = Math.ceil(
        (u.earlyBirdExpiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      )
      try {
        await sendEmail({
          to: u.email,
          subject: `【${SITE_NAME}】PRO 無料期間があと ${daysLeft} 日で終了します`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h1 style="color: #7c3aed; font-size: 22px; margin-bottom: 16px;">創設メンバー無料期間の終了予告</h1>
              <p>${u.name} さん、こんにちは。</p>
              <p>
                創設メンバー枠でご提供している <strong>PRO プラン 6ヶ月無料</strong> の期間が、
                <strong>あと ${daysLeft} 日</strong>（${u.earlyBirdExpiresAt!.toLocaleDateString('ja-JP')}）で終了します。
              </p>
              <p>
                期間終了後は通常プランに自動で切り替わり、PRO 特典（優先表示・レコメンド優遇・手数料 7%）は利用できなくなります。
                継続をご希望の場合は、下記から有料 PRO プランへお切り替えください。
              </p>
              <p style="color: #6b7280; font-size: 13px;">
                ※ 創設メンバー #${String(u.earlyBirdSlot).padStart(3, '0')} バッジはプランに関係なくプロフィールに永久表示されます。
              </p>
              <div style="margin: 24px 0;">
                <a
                  href="${APP_URL}/pro/subscribe"
                  style="background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;"
                >
                  PRO プランを継続する
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px;">
                ${SITE_NAME} — 個人アーティストのための営業プラットフォーム
              </p>
            </div>
          `,
        })
        await prisma.user.update({
          where: { id: u.id },
          data: { earlyBirdReminderSentAt: now },
        })
        sent++
      } catch {
        // 個別失敗はスキップして次へ（次回 cron で再試行される）
      }
    }
    return { candidates: targets.length, sent, at: now.toISOString() }
  }
)

// 全関数をまとめてエクスポート
export const functions = [
  notifyMatchAccepted,
  notifyMatchApplied,
  notifyNewMessage,
  notifyP2PMatched,
  expireEarlyBirdFreeTier,
  notifyEarlyBirdExpiring,
]
