// lib/notifications.ts — 永続化通知の中央ヘルパ
//
// 使い方:
//   await createNotification({
//     userId: targetUserId,       // 受信者
//     kind: 'FOLLOW',
//     actorId: session.user.id,   // 送り主 (システム通知なら省略)
//     title: `${actorName} があなたをフォローしました`,
//     href: `/artists/${session.user.id}`,
//   })
//
// Pusher が設定されている環境では create 完了後に private-user-{userId} へ broadcast し
// ヘッダーの NotificationBell が即時に toast + 未読バッジ更新。
// Pusher 無しの環境は silent fail (createNotification 自体は成功、DB には書かれる)。

import { prisma } from './prisma'
import { getPusherServer, getUserChannel } from './pusher-server'
import { isBlockedBetween } from './blocks'
import type { NotificationKind, Prisma } from '@prisma/client'

export const NOTIFICATION_EVENT = 'notification:new'

type CreateInput = {
  userId: string
  kind: NotificationKind
  title: string
  actorId?: string
  body?: string
  href?: string
  metadata?: Prisma.JsonValue
}

export async function createNotification(input: CreateInput): Promise<void> {
  // 自己通知は作成しない (自分でフォローして自分に通知が飛ぶ、など)
  if (input.actorId && input.actorId === input.userId) return

  // actor がブロック関係にある場合は通知自体を作らない (露出も遮断)
  if (input.actorId && (await isBlockedBetween(input.userId, input.actorId))) return

  try {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        actorId: input.actorId ?? null,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      select: {
        id: true,
        kind: true,
        title: true,
        body: true,
        href: true,
        createdAt: true,
      },
    })

    // Pusher が有効なら realtime 配信 (失敗は無視)
    const pusher = await getPusherServer()
    if (pusher) {
      await pusher
        .trigger(getUserChannel(input.userId), NOTIFICATION_EVENT, {
          id: notification.id,
          kind: notification.kind,
          title: notification.title,
          body: notification.body,
          href: notification.href,
          createdAt: notification.createdAt.toISOString(),
        })
        .catch(() => undefined)
    }
  } catch {
    // 通知の失敗は呼び出し元のビジネスロジックを巻き込まない (fire-and-forget)
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  })
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } })
}

// アクター (actorId) のフォロワー全員に同じ通知を配る。
// ブロック関係にあるフォロワーは createNotification 側で自動 skip されるので
// 事前フィルタ不要。actorId == followerId のケースも skip される。
export async function notifyFollowers(
  actorId: string,
  input: Omit<CreateInput, 'userId' | 'actorId'>,
): Promise<void> {
  try {
    const followers = await prisma.follow.findMany({
      where: { followingId: actorId },
      select: { followerId: true },
      take: 1000, // 保険: 1000 フォロワー以上はトリムしてスパム化を防ぐ
    })
    await Promise.allSettled(
      followers.map((f) =>
        createNotification({ ...input, userId: f.followerId, actorId }),
      ),
    )
  } catch {
    // 失敗しても呼び出し元ロジックを巻き込まない
  }
}

export async function listNotifications(userId: string, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      kind: true,
      title: true,
      body: true,
      href: true,
      readAt: true,
      createdAt: true,
      actor: { select: { id: true, name: true, displayName: true, avatarUrl: true } },
    },
  })
}
