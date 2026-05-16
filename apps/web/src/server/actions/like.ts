'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { inngest } from '@/lib/inngest'
import { ToggleLikeSchema, type ToggleLikeInput } from '@creator-links/shared'
import { revalidatePath } from 'next/cache'

export type ToggleLikeResult =
  | { success: true; status: 'liked' }
  | { success: true; status: 'unliked' }
  | { success: true; status: 'matched'; matchId: string }
  | { success: false; error: string }

export async function toggleLikeAction(data: ToggleLikeInput): Promise<ToggleLikeResult> {
  const session = await auth()
  if (!session) return { success: false, error: '認証が必要です' }

  const parsed = ToggleLikeSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '入力が正しくありません' }

  const me = session.user.id
  const target = parsed.data.targetId
  if (me === target) return { success: false, error: '自分自身にはいいねできません' }

  try {
    // 既存 Like を確認
    const existing = await prisma.like.findUnique({
      where: { likerId_likedId: { likerId: me, likedId: target } },
    })

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } })
      revalidatePath('/artists')
      return { success: true, status: 'unliked' }
    }

    // Like 新規作成 + 相手の Like を同一 transaction で確認
    const matched = await prisma.$transaction(async (tx) => {
      await tx.like.create({
        data: { likerId: me, likedId: target },
      })
      const reciprocal = await tx.like.findUnique({
        where: { likerId_likedId: { likerId: target, likedId: me } },
      })
      if (!reciprocal) return null

      // 既存 P2P Match があれば再利用
      const existingMatch = await tx.match.findFirst({
        where: {
          OR: [
            { artistId: me, partnerUserId: target },
            { artistId: target, partnerUserId: me },
          ],
        },
      })
      if (existingMatch) return existingMatch

      return await tx.match.create({
        data: {
          projectId: null,
          artistId: me,
          partnerUserId: target,
          status: 'ACCEPTED',
        },
      })
    })

    revalidatePath('/artists')

    if (matched) {
      // 双方にマッチ成立通知
      const [meUser, targetUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: me }, select: { name: true, email: true } }),
        prisma.user.findUnique({ where: { id: target }, select: { name: true, email: true } }),
      ])
      if (meUser && targetUser) {
        void inngest
          .send({
            name: 'match/p2p-matched',
            data: {
              matchId: matched.id,
              userAEmail: meUser.email,
              userAName: meUser.name,
              userBEmail: targetUser.email,
              userBName: targetUser.name,
            },
          })
          .catch(() => {})
      }
      return { success: true, status: 'matched', matchId: matched.id }
    }

    return { success: true, status: 'liked' }
  } catch {
    return { success: false, error: 'いいねの更新に失敗しました' }
  }
}

// 一覧用：自分が Like したユーザーの ID セットを取得（未ログインは空セット）
export async function listMyLikedIdsAction(): Promise<string[]> {
  const session = await auth()
  if (!session) return []
  try {
    const likes = await prisma.like.findMany({
      where: { likerId: session.user.id },
      select: { likedId: true },
    })
    return likes.map((l) => l.likedId)
  } catch {
    return []
  }
}
