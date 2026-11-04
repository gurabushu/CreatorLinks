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

// サインアップ時に呼ぶ。以下の優先順でスロットを付与する:
//   1. 事前登録 (EarlyBirdReservation) が同じ email で存在すれば、予約済 slot を継承
//   2. 予約が無い場合は、1..EARLY_BIRD_TOTAL のうち未使用の最小スロット番号を付与
// 空き枠が無ければ null (通常ユーザー扱い)。
//
// 「使用中スロット」= User.earlyBirdSlot が非 null + 未 claim の reservation.reservedSlot
// (claim 済 reservation は User.earlyBirdSlot 側で管理されるため重複カウントしない)
export async function assignEarlyBirdIfAvailable(
  userId: string,
  email: string,
): Promise<number | null> {
  const emailLower = email.toLowerCase().trim()

  // 1. 事前登録の email 照合 (フル優先)
  const reservation = await prisma.earlyBirdReservation.findUnique({
    where: { email: emailLower },
  })
  if (reservation && !reservation.claimedAt) {
    try {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            earlyBirdSlot: reservation.reservedSlot,
            earlyBirdExpiresAt: computeExpiresAt(),
          },
        }),
        prisma.earlyBirdReservation.update({
          where: { id: reservation.id },
          data: { claimedAt: new Date(), claimedUserId: userId },
        }),
      ])
      return reservation.reservedSlot
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') return null
      throw e
    }
  }

  // 2. 予約無し → 空きスロットを探して付与
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const [userSlots, unclaimedReservations] = await Promise.all([
      prisma.user.findMany({
        where: { earlyBirdSlot: { not: null } },
        select: { earlyBirdSlot: true },
      }),
      prisma.earlyBirdReservation.findMany({
        where: { claimedAt: null },
        select: { reservedSlot: true },
      }),
    ])
    const taken = new Set<number>()
    userSlots.forEach((u) => u.earlyBirdSlot != null && taken.add(u.earlyBirdSlot))
    unclaimedReservations.forEach((r) => taken.add(r.reservedSlot))
    if (taken.size >= EARLY_BIRD_TOTAL) return null

    let nextSlot = 1
    while (nextSlot <= EARLY_BIRD_TOTAL && taken.has(nextSlot)) nextSlot++
    if (nextSlot > EARLY_BIRD_TOTAL) return null

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { earlyBirdSlot: nextSlot, earlyBirdExpiresAt: computeExpiresAt() },
      })
      return nextSlot
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') continue
      throw e
    }
  }
  return null
}

// 残りスロット数 (表示用 0..EARLY_BIRD_TOTAL)。
// サインアップ済ユーザ + 未 claim の事前登録を合算して残数計算。DB エラー時は null で安全側。
export async function getEarlyBirdRemaining(): Promise<number | null> {
  try {
    const [userCount, unclaimedReservationCount] = await Promise.all([
      prisma.user.count({ where: { earlyBirdSlot: { not: null } } }),
      prisma.earlyBirdReservation.count({ where: { claimedAt: null } }),
    ])
    const used = userCount + unclaimedReservationCount
    return Math.max(0, EARLY_BIRD_TOTAL - used)
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
