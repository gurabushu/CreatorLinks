'use server'

// ユーザーフォロー Server Actions（Phase A.6）
// SNS 型フォロー。visibility=FOLLOWERS の判定基盤にも使う。

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
