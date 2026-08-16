'use server'

// Admin: PromoCode 発行 / 一覧 / 取消
// 現状は seed.ts で手動投入していたが、UI で発行できるようにする。
// 恩人向け永久 PRO の運用手順 (docs/pro_gift_runbook.md) を UI 化。

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// コード形式は redeemPromoCodeAction と同じ制約
const PROMO_CODE_RE = /^[A-Z0-9_-]{4,32}$/

export type AdminPromoResult =
  | { success: true; message?: string }
  | { success: false; error: string }

async function requireAdmin() {
  const session = await auth()
  if (!session) return { ok: false as const, error: 'unauthorized' }
  if (session.user.role !== 'ADMIN') return { ok: false as const, error: 'forbidden' }
  return { ok: true as const, session }
}

export async function createPromoCodeAction(input: {
  code: string
  label?: string
  maxRedemptions?: number | null
  expiresAt?: string | null // ISO date string
}): Promise<AdminPromoResult> {
  const gate = await requireAdmin()
  if (!gate.ok) return { success: false, error: gate.error }

  const code = input.code.trim().toUpperCase()
  if (!PROMO_CODE_RE.test(code)) {
    return { success: false, error: 'コードは英数字と - _ のみ、4〜32 文字' }
  }

  const label = input.label?.trim() || null
  const maxRedemptions =
    input.maxRedemptions === null || input.maxRedemptions === undefined
      ? null
      : Math.max(1, Math.floor(input.maxRedemptions))
  let expiresAt: Date | null = null
  if (input.expiresAt) {
    const d = new Date(input.expiresAt)
    if (Number.isNaN(d.getTime())) {
      return { success: false, error: '有効期限の日時が不正です' }
    }
    if (d.getTime() <= Date.now()) {
      return { success: false, error: '有効期限は未来の日時にしてください' }
    }
    expiresAt = d
  }

  try {
    await prisma.promoCode.create({
      data: {
        code,
        label,
        maxRedemptions,
        expiresAt,
        createdById: gate.session.user.id,
      },
    })
  } catch (e) {
    if ((e as { code?: string })?.code === 'P2002') {
      return { success: false, error: '同じコードが既に存在します' }
    }
    return { success: false, error: `作成に失敗しました: ${(e as Error).message}` }
  }

  revalidatePath('/admin/promo')
  return { success: true, message: `コード ${code} を発行しました` }
}

// コード自体の削除（未使用の場合のみ）
export async function deletePromoCodeAction(codeId: string): Promise<AdminPromoResult> {
  const gate = await requireAdmin()
  if (!gate.ok) return { success: false, error: gate.error }

  const promo = await prisma.promoCode.findUnique({
    where: { id: codeId },
    select: { code: true, redemptionCount: true },
  })
  if (!promo) return { success: false, error: 'コードが見つかりません' }
  if (promo.redemptionCount > 0) {
    return {
      success: false,
      error: `既に ${promo.redemptionCount} 件 redeem 済みのため削除できません（無効化する場合は有効期限を過去に変更してください）`,
    }
  }

  await prisma.promoCode.delete({ where: { id: codeId } })
  revalidatePath('/admin/promo')
  return { success: true, message: `コード ${promo.code} を削除しました` }
}

// コードを即時無効化（expiresAt を過去に設定、履歴は残す）
export async function expirePromoCodeAction(codeId: string): Promise<AdminPromoResult> {
  const gate = await requireAdmin()
  if (!gate.ok) return { success: false, error: gate.error }

  const promo = await prisma.promoCode.findUnique({
    where: { id: codeId },
    select: { code: true },
  })
  if (!promo) return { success: false, error: 'コードが見つかりません' }

  await prisma.promoCode.update({
    where: { id: codeId },
    data: { expiresAt: new Date(Date.now() - 1000) },
  })

  revalidatePath('/admin/promo')
  return { success: true, message: `コード ${promo.code} を無効化しました（履歴は保持）` }
}
