// 創設メンバー枠（先着 100 名・最初の 6ヶ月は手数料 0% + スロット番号入りバッジ永久付与）
// User.earlyBirdSlot は 1..EARLY_BIRD_TOTAL のバッジ番号として永久に保持される（signal）。
// earlyBirdExpiresAt を過ぎると手数料 0% 特典は失効 (ただしバッジ自体は永久)。
// 旧・先着 30 名の永久組 (earlyBirdExpiresAt=null) は手数料 0% も永久。
// 恩人枠 (isFounderExempt=true) は常に手数料 0% (別軸、admin 手動付与)。

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
      // 2026-10-17 fee-only pivot: Early Bird は "創設メンバー" バッジ付与のみ。
      // PRO ロール付与は廃止 (role=GENERAL のまま、全機能無料)。
      await prisma.user.update({
        where: { id: userId },
        data: {
          earlyBirdSlot: nextSlot,
          earlyBirdExpiresAt: computeExpiresAt(),
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

// 創設メンバー無料期間中か判定。earlyBirdExpiresAt が null（旧永久組）または未来なら true。
export function isEarlyBirdFreeActive(user: {
  earlyBirdSlot: number | null
  earlyBirdExpiresAt: Date | null
}): boolean {
  if (user.earlyBirdSlot === null) return false
  if (user.earlyBirdExpiresAt === null) return true
  return user.earlyBirdExpiresAt.getTime() > Date.now()
}

// 手数料 0% 特典が有効か。
// 創設メンバー 6ヶ月無料期間中 OR 恩人枠 (isFounderExempt=true) なら true。
// 案件成立時の platformFeeRate 計算で参照する。
export function hasZeroFeeAccess(user: {
  earlyBirdSlot: number | null
  earlyBirdExpiresAt: Date | null
  isFounderExempt?: boolean | null
}): boolean {
  if (user.isFounderExempt) return true
  return isEarlyBirdFreeActive(user)
}
