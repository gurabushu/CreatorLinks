'use server'

// ユーザーフォロー Server Actions（Phase A.6）
// SNS 型フォロー。visibility=FOLLOWERS の判定基盤にも使う。

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { getDisplayName } from '@/lib/user'
import { isBlockedBetween } from '@/lib/blocks'

export type FollowActionResult =
  | { success: true }
  | { success: false; error: string }

export async function followUserAction(userId: string): Promise<FollowActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }
  if (userId === session.user.id) {
    return { success: false, error: '自分自身はフォローできません' }
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!target) return { success: false, error: 'ユーザーが見つかりません' }

  // ブロック中はフォロー不可
  if (await isBlockedBetween(session.user.id, userId)) {
    return { success: false, error: 'このユーザーはフォローできません' }
  }

  // 既にフォロー済みなら通知を再発火しない (upsert の判定)
  const existed = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: userId,
      },
    },
    select: { followerId: true },
  })

  await prisma.follow.upsert({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: userId,
      },
    },
    create: { followerId: session.user.id, followingId: userId },
    update: {},
  })

  if (!existed) {
    const follower = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, displayName: true },
    })
    const actorName = follower ? getDisplayName(follower) : '誰か'
    await createNotification({
      userId,
      kind: 'FOLLOW',
      actorId: session.user.id,
      title: `${actorName} があなたをフォローしました`,
      href: `/artists/${session.user.id}`,
    })
  }

  revalidatePath(`/artists/${userId}`)
  return { success: true }
}

export async function unfollowUserAction(userId: string): Promise<FollowActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  await prisma.follow.deleteMany({
    where: { followerId: session.user.id, followingId: userId },
  })

  revalidatePath(`/artists/${userId}`)
  return { success: true }
}
