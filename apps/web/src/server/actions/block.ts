'use server'

// ユーザーブロック Server Actions
//
// 動作:
// - blockUserAction: 相手を upsert でブロック登録。既存の follow 関係 (双方向) を解除。
// - unblockUserAction: ブロック解除。follow は復活しない (手動で再フォロー)。
// - listMyBlocksAction: 自分がブロックしてる相手一覧 (設定画面用)。

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

type Result = { success: true } | { success: false; error: string }

export async function blockUserAction(targetUserId: string): Promise<Result> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }
  if (targetUserId === session.user.id) {
    return { success: false, error: '自分自身はブロックできません' }
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  })
  if (!target) return { success: false, error: 'ユーザーが見つかりません' }

  // 相互 follow を解除 (ブロック後に follow が残ってるのは意図せぬ露出源になるため)
  await prisma.$transaction([
    prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: session.user.id, blockedId: targetUserId } },
      create: { blockerId: session.user.id, blockedId: targetUserId },
      update: {},
    }),
    prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: session.user.id, followingId: targetUserId },
          { followerId: targetUserId, followingId: session.user.id },
        ],
      },
    }),
  ])

  revalidatePath(`/artists/${targetUserId}`)
  revalidatePath('/dashboard/account/blocked')
  return { success: true }
}

export async function unblockUserAction(targetUserId: string): Promise<Result> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  await prisma.userBlock.deleteMany({
    where: { blockerId: session.user.id, blockedId: targetUserId },
  })

  revalidatePath(`/artists/${targetUserId}`)
  revalidatePath('/dashboard/account/blocked')
  return { success: true }
}

export async function listMyBlocksAction() {
  const session = await auth()
  if (!session) return []
  return prisma.userBlock.findMany({
    where: { blockerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      blocked: {
        select: {
          id: true,
          name: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
        },
      },
    },
  })
}
