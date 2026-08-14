'use server'

// Event グループチャット Server Action。
// - 権限: Event.creator + EventParticipant.status='CONFIRMED' のみ投稿可 / 閲覧可
// - Message.eventId で紐付け（matchId とは XOR、DB CHECK は baseline 化時に追加予定）
// - リアルタイム配信は Pusher の private-event-chat-{eventId} チャンネル
// - メール通知は Inngest `message/received` の event 版 payload（宛先は全メンバー）
// - 既読は per-user では持たない（MVP 割り切り。Message.readAt はグループでは常に null）

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { revalidatePath } from 'next/cache'
import {
  getPusherServer,
  getEventChatChannel,
  MESSAGE_EVENT,
} from '@/lib/pusher-server'
import { inngest } from '@/lib/inngest'
import { getDisplayName } from '@/lib/user'

export type EventChatActionResult = { success: boolean; error?: string }

// メンバー判定を 1 クエリでまとめる。creator または CONFIRMED participant なら true。
async function checkMembership(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      creatorId: true,
      participants: {
        where: { userId, status: 'CONFIRMED' },
        select: { id: true },
        take: 1,
      },
    },
  })
  if (!event) return { ok: false as const, reason: 'not_found' as const }
  const isMember = event.creatorId === userId || event.participants.length > 0
  if (!isMember) return { ok: false as const, reason: 'forbidden' as const }
  return { ok: true as const, event }
}

export async function sendEventMessageAction(
  eventId: string,
  body: string,
): Promise<EventChatActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }
  if (!body.trim()) return { success: false, error: 'メッセージを入力してください' }

  // 1:1 チャットと同じレート制限バケット（1 ユーザーあたり全チャネル横断で計算）
  const rl = await checkRateLimit('message', `user:${session.user.id}`)
  if (!rl.ok) {
    return {
      success: false,
      error: `送信が速すぎます。${rl.retryAfterSec} 秒後に再試行してください`,
    }
  }

  const check = await checkMembership(eventId, session.user.id)
  if (!check.ok) {
    return {
      success: false,
      error: check.reason === 'not_found' ? 'イベントが見つかりません' : '権限がありません',
    }
  }

  const message = await prisma.message.create({
    data: { eventId, senderId: session.user.id, body: body.trim() },
    include: {
      sender: {
        select: { id: true, name: true, displayName: true, avatarUrl: true },
      },
    },
  })

  const pusher = await getPusherServer()
  if (pusher) {
    await pusher.trigger(getEventChatChannel(eventId), MESSAGE_EVENT, {
      id: message.id,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      readAt: null,
      sender: message.sender,
    })
  }

  // 通知: creator + CONFIRMED 全員から自分を除いた全員にメール（Inngest で 5分 debounce）
  // 大量参加者イベントでは digest 化が必要になるが、MVP はそのまま流す。
  const recipients = await prisma.user.findMany({
    where: {
      OR: [
        { id: check.event.creatorId },
        {
          eventParticipations: {
            some: { eventId, status: 'CONFIRMED' },
          },
        },
      ],
      NOT: { id: session.user.id },
    },
    select: { id: true, email: true, name: true, displayName: true },
  })
  const sender = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, displayName: true },
  })
  const senderName = sender ? getDisplayName(sender) : 'ユーザー'
  for (const r of recipients) {
    await inngest
      .send({
        name: 'message/received',
        data: {
          eventId,
          eventTitle: check.event.title,
          recipientEmail: r.email,
          recipientName: getDisplayName(r),
          senderName,
          messagePreview: body.trim().slice(0, 100),
        },
      })
      .catch(() => {
        /* Inngest 未設定時は無視 */
      })
  }

  revalidatePath(`/dashboard/chat/event/${eventId}`)
  return { success: true }
}

// SSR で使う初期メッセージ取得（新しい順で取り、UI 側で reverse する）
// 権限は SSR page 側でも同じ checkMembership を先に呼ぶ想定だが、
// ここでも二重で確認して漏洩を防ぐ。
export async function listEventMessagesAction(
  eventId: string,
  limit = 50,
): Promise<
  | { success: true; messages: Awaited<ReturnType<typeof fetchMessages>> }
  | { success: false; error: string }
> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const check = await checkMembership(eventId, session.user.id)
  if (!check.ok) {
    return {
      success: false,
      error: check.reason === 'not_found' ? 'イベントが見つかりません' : '権限がありません',
    }
  }

  const messages = await fetchMessages(eventId, limit)
  return { success: true, messages }
}

function fetchMessages(eventId: string, limit: number) {
  return prisma.message.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      sender: {
        select: { id: true, name: true, displayName: true, avatarUrl: true },
      },
    },
  })
}
