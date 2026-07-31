// 先着 30 名 PRO 永久無料キャンペーンのスロット割当
// User.earlyBirdSlot (Int? @unique) に 1..EARLY_BIRD_TOTAL を格納。

import { prisma } from './prisma'

export const EARLY_BIRD_TOTAL = 30

const MAX_ATTEMPTS = 5

// サインアップ時に呼ぶ。空きがあれば User.role を PRO に昇格 + スロット番号を返す。
// 空きが無ければ null（通常ユーザーのまま）。
export async function assignEarlyBirdIfAvailable(userId: string): Promise<number | null> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const count = await prisma.user.count({ where: { earlyBirdSlot: { not: null } } })
    if (count >= EARLY_BIRD_TOTAL) return null

    const nextSlot = count + 1
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { earlyBirdSlot: nextSlot, role: 'PRO' },
      })
      return nextSlot
    } catch (e) {
      // 別のサインアップと競合して同一 slot を取り合ったケース。次のループで再計算
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
