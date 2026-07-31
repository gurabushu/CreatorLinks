// 創設メンバー枠（先着 100 名・PRO 6ヶ月無料 + スロット番号入りバッジ永久付与）
// User.earlyBirdSlot は 1..EARLY_BIRD_TOTAL のバッジ番号として永久に保持される。
// PRO ロールは earlyBirdExpiresAt までの期限付きで、以後は本課金がなければ GENERAL に落ちる。
// 旧・先着 30 名の永久 PRO 組は earlyBirdExpiresAt = null で失効対象外。

import { prisma } from './prisma'

export const EARLY_BIRD_TOTAL = 100
export const EARLY_BIRD_FREE_MONTHS = 6

const MAX_ATTEMPTS = 5

function computeExpiresAt(from: Date = new Date()): Date {
  const d = new Date(from)
  d.setMonth(d.getMonth() + EARLY_BIRD_FREE_MONTHS)
  return d
}

// サインアップ時に呼ぶ。空きがあれば PRO に昇格 + スロット番号 + 6ヶ月後の失効日をセット。
// 空きが無ければ null（通常ユーザーのまま）。
export async function assignEarlyBirdIfAvailable(userId: string): Promise<number | null> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const count = await prisma.user.count({ where: { earlyBirdSlot: { not: null } } })
    if (count >= EARLY_BIRD_TOTAL) return null

    const nextSlot = count + 1
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          earlyBirdSlot: nextSlot,
          earlyBirdExpiresAt: computeExpiresAt(),
          role: 'PRO',
        },
      })
      return nextSlot
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') continue
      throw e
    }
  }
  return null
}

// 残りスロット数。表示用（0..EARLY_BIRD_TOTAL）。DB エラー時は null を返してバナー非表示にできる
export async function getEarlyBirdRemaining(): Promise<number | null> {
  try {
    const count = await prisma.user.count({ where: { earlyBirdSlot: { not: null } } })
    return Math.max(0, EARLY_BIRD_TOTAL - count)
  } catch {
    return null
  }
}

// 無料期間中の PRO 特典が有効か。earlyBirdExpiresAt が null（旧永久組）または未来なら true。
export function isEarlyBirdFreeActive(user: {
  earlyBirdSlot: number | null
  earlyBirdExpiresAt: Date | null
}): boolean {
  if (user.earlyBirdSlot === null) return false
  if (user.earlyBirdExpiresAt === null) return true
  return user.earlyBirdExpiresAt.getTime() > Date.now()
}
