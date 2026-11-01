// lib/blocks.ts — ブロック判定の共通ヘルパ
//
// isBlockedBetween(a, b): どちらか一方でも相手をブロックしていれば true。
// 新規接触系 (follow / scout / 応募 / message 送信 / 通知生成) で、
// 本番ロジックの先頭に挟んで使う想定。
//
// 対称に扱う理由: A が B をブロックしていれば B → A の接触も当然止めるが、
// B が A をブロックしていても A → B の接触も止める (A が「ブロックされた」事実を
// 検知しづらくするには、片方向だけでなく双方止める方が自然)。

import { prisma } from './prisma'

export async function isBlockedBetween(userIdA: string, userIdB: string): Promise<boolean> {
  if (userIdA === userIdB) return false
  const n = await prisma.userBlock.count({
    where: {
      OR: [
        { blockerId: userIdA, blockedId: userIdB },
        { blockerId: userIdB, blockedId: userIdA },
      ],
    },
  })
  return n > 0
}

// 片方向のみ: userId が targetUserId をブロックしているか (= 自分の操作が可能か判定用)
export async function hasUserBlocked(userId: string, targetUserId: string): Promise<boolean> {
  if (userId === targetUserId) return false
  const n = await prisma.userBlock.count({
    where: { blockerId: userId, blockedId: targetUserId },
  })
  return n > 0
}
