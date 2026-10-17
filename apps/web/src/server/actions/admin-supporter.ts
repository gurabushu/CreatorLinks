'use server'

// Admin 専用: Founding Supporter / 認証バッジの手動付与・取消
// - Founding Supporter: ヒアリング協力者などへ運営から永年無償枠を付与
// - 認証バッジ: 通常は ¥3,000 買切で付くが、Founding Supporter には同時に無償付与
//
// 2026-10-17 fee-only pivot 設計 §5 参照

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

type Result = { ok: true } | { ok: false; error: string }

async function requireAdmin() {
  const session = await auth()
  if (!session) return { ok: false as const, error: 'unauthenticated' }
  if (session.user.role !== 'ADMIN') return { ok: false as const, error: 'forbidden' }
  return { ok: true as const, session }
}

export async function grantFoundingSupporterAction(
  targetUserId: string,
  withVerifiedBadge = true,
): Promise<Result> {
  const check = await requireAdmin()
  if (!check.ok) return { ok: false, error: check.error }

  try {
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isFounderExempt: true,
        ...(withVerifiedBadge ? { isVerified: true } : {}),
      },
    })
    revalidatePath('/admin/supporters')
    return { ok: true }
  } catch {
    return { ok: false, error: 'update failed' }
  }
}

export async function revokeFoundingSupporterAction(
  targetUserId: string,
  revokeVerifiedBadge = false,
): Promise<Result> {
  const check = await requireAdmin()
  if (!check.ok) return { ok: false, error: check.error }

  try {
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isFounderExempt: false,
        ...(revokeVerifiedBadge ? { isVerified: false } : {}),
      },
    })
    revalidatePath('/admin/supporters')
    return { ok: true }
  } catch {
    return { ok: false, error: 'update failed' }
  }
}

export async function grantVerifiedBadgeAction(targetUserId: string): Promise<Result> {
  const check = await requireAdmin()
  if (!check.ok) return { ok: false, error: check.error }

  try {
    await prisma.user.update({
      where: { id: targetUserId },
      data: { isVerified: true },
    })
    revalidatePath('/admin/supporters')
    return { ok: true }
  } catch {
    return { ok: false, error: 'update failed' }
  }
}
