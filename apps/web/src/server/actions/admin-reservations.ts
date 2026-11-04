'use server'

// Admin 専用: 事前登録 (EarlyBirdReservation) の一覧取得 + CSV bulk import
//
// 運用:
// - Google Form の回答を Google Sheets に貯める
// - 定期的に Sheets を CSV ダウンロード
// - Admin がこの page からアップロード → bulk import
// - import 時に reservedSlot を自動採番 (現在の最大 + 1)
// - 既存 email があれば skip (upsert では name 等の後発更新だけ)
//
// CSV フォーマット (header 必須):
//   email,name,primaryInstrument
//   alice@example.com,田中アリス,ギター
//   bob@example.com,鈴木ボブ,DTM / トラックメイク
//
// 制約:
// - email 重複は skip (既存 reservedSlot を保持)
// - 100 名到達後の追加投入は skip (カウンセリング待ち表示)

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { EARLY_BIRD_TOTAL } from '@/lib/early-bird'

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

async function requireAdmin() {
  const session = await auth()
  if (!session) return { ok: false as const, error: 'unauthenticated' }
  if (session.user.role !== 'ADMIN') return { ok: false as const, error: 'forbidden' }
  return { ok: true as const, session }
}

export async function listReservationsAction() {
  const check = await requireAdmin()
  if (!check.ok) return []
  return prisma.earlyBirdReservation.findMany({
    orderBy: { reservedSlot: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      primaryInstrument: true,
      reservedSlot: true,
      createdAt: true,
      claimedAt: true,
      claimedUserId: true,
    },
  })
}

type ImportRow = {
  email: string
  name: string
  primaryInstrument?: string
}

type ImportSummary = {
  inserted: number
  skipped: number
  rejected: number
  reasons: { email: string; reason: string }[]
}

export async function bulkImportReservationsAction(
  rows: ImportRow[],
): Promise<Result<ImportSummary>> {
  const check = await requireAdmin()
  if (!check.ok) return { ok: false, error: check.error }

  const summary: ImportSummary = { inserted: 0, skipped: 0, rejected: 0, reasons: [] }

  // 現在の最大 slot
  const maxSlotRow = await prisma.earlyBirdReservation.aggregate({
    _max: { reservedSlot: true },
  })
  let nextSlot = (maxSlotRow._max.reservedSlot ?? 0) + 1

  for (const raw of rows) {
    const emailLower = (raw.email ?? '').toLowerCase().trim()
    const name = (raw.name ?? '').trim()
    const instrument = raw.primaryInstrument?.trim() || null

    if (!emailLower || !name) {
      summary.rejected++
      summary.reasons.push({ email: emailLower || '(空)', reason: 'email または name が空' })
      continue
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      summary.rejected++
      summary.reasons.push({ email: emailLower, reason: 'email 形式が不正' })
      continue
    }

    // 既存 email は skip (上書きしない)
    const existing = await prisma.earlyBirdReservation.findUnique({ where: { email: emailLower } })
    if (existing) {
      summary.skipped++
      continue
    }

    // 100 名到達済なら reject
    if (nextSlot > EARLY_BIRD_TOTAL) {
      summary.rejected++
      summary.reasons.push({ email: emailLower, reason: `残り枠なし (${EARLY_BIRD_TOTAL} 名到達済)` })
      continue
    }

    try {
      await prisma.earlyBirdReservation.create({
        data: {
          email: emailLower,
          name,
          primaryInstrument: instrument,
          reservedSlot: nextSlot,
        },
      })
      summary.inserted++
      nextSlot++
    } catch (e) {
      summary.rejected++
      summary.reasons.push({
        email: emailLower,
        reason: `DB エラー: ${(e as Error).message?.slice(0, 80) ?? 'unknown'}`,
      })
    }
  }

  revalidatePath('/admin/reservations')
  revalidatePath('/')
  return { ok: true, data: summary }
}

export async function deleteReservationAction(id: string): Promise<Result> {
  const check = await requireAdmin()
  if (!check.ok) return { ok: false, error: check.error }

  const target = await prisma.earlyBirdReservation.findUnique({ where: { id } })
  if (!target) return { ok: false, error: 'reservation not found' }
  if (target.claimedAt) return { ok: false, error: '既にサインアップ済の予約は削除できません' }

  await prisma.earlyBirdReservation.delete({ where: { id } })
  revalidatePath('/admin/reservations')
  revalidatePath('/')
  return { ok: true }
}
