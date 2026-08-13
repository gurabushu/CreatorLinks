'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Admin お知らせ配信の Server Actions
// - ADMIN ロールのみ操作可能
// - publishedAt の値で状態を表現:
//     null      → DRAFT（下書き、閲覧不可）
//     now より未来 → SCHEDULED（予約公開、閲覧不可）
//     now 以下   → PUBLISHED（公開中）
// - 編集時は `publishMode=keep` で既存 publishedAt を上書きせず保持する
//   （タイトル修正のたびに一覧の並びが動いたり未読バッジが再点灯するのを防ぐ）

const MAX_TITLE = 120
const MAX_BODY = 10000

type Fail = { success: false; error: string }
type Ok = { success: true }
type OkWith<T> = { success: true } & T

type PublishMode = 'draft' | 'now' | 'scheduled' | 'keep'
type ParsedInput = {
  title: string
  body: string
  isPinned: boolean
  publishMode: PublishMode
  publishedAt: Date | null // publishMode=keep のとき undefined 相当（呼び出し側で無視）
  expiresAt: Date | null
}

async function requireAdmin() {
  const session = await auth()
  if (!session) return { ok: false as const, error: 'ログインが必要です' }
  if (session.user.role !== 'ADMIN') {
    return { ok: false as const, error: '権限がありません（ADMIN のみ）' }
  }
  return { ok: true as const, session }
}

function parseInput(formData: FormData): ParsedInput | { error: string } {
  // formData.get は File を返しうるので、string でないものは reject する。
  const rawTitle = formData.get('title')
  const rawBody = formData.get('body')
  if (typeof rawTitle !== 'string' && rawTitle !== null) return { error: '入力形式が不正です' }
  if (typeof rawBody !== 'string' && rawBody !== null) return { error: '入力形式が不正です' }

  const title = (rawTitle ?? '').toString().trim()
  const body = (rawBody ?? '').toString().trim()
  const isPinned = formData.get('isPinned') === 'on' || formData.get('isPinned') === 'true'
  const rawMode = formData.get('publishMode')
  const publishMode: PublishMode =
    rawMode === 'now' || rawMode === 'scheduled' || rawMode === 'keep' ? rawMode : 'draft'
  const scheduledAtRaw = String(formData.get('scheduledAt') ?? '')
  const expiresAtRaw = String(formData.get('expiresAt') ?? '')

  if (!title) return { error: 'タイトルを入力してください' }
  if (title.length > MAX_TITLE) return { error: `タイトルは ${MAX_TITLE} 文字以内で入力してください` }
  if (!body) return { error: '本文を入力してください' }
  if (body.length > MAX_BODY) return { error: `本文は ${MAX_BODY} 文字以内で入力してください` }

  let publishedAt: Date | null = null
  if (publishMode === 'now') {
    publishedAt = new Date()
  } else if (publishMode === 'scheduled') {
    if (!scheduledAtRaw) return { error: '予約公開日時を入力してください' }
    const d = new Date(scheduledAtRaw)
    if (Number.isNaN(d.getTime())) return { error: '予約公開日時が不正です' }
    if (d.getTime() <= Date.now()) return { error: '予約公開日時は現在より未来を指定してください' }
    publishedAt = d
  }
  // publishMode === 'keep' の場合は呼び出し側で既存値を維持する（publishedAt は無視）

  let expiresAt: Date | null = null
  if (expiresAtRaw) {
    const d = new Date(expiresAtRaw)
    if (Number.isNaN(d.getTime())) return { error: '有効期限が不正です' }
    if (publishedAt && d.getTime() <= publishedAt.getTime()) {
      return { error: '有効期限は公開日時より後を指定してください' }
    }
    expiresAt = d
  }

  return { title, body, isPinned, publishMode, publishedAt, expiresAt }
}

export async function createAnnouncementAction(
  formData: FormData,
): Promise<OkWith<{ id: string }> | Fail> {
  const gate = await requireAdmin()
  if (!gate.ok) return { success: false, error: gate.error }

  const parsed = parseInput(formData)
  if ('error' in parsed) return { success: false, error: parsed.error }
  // 新規作成では 'keep' は意味を持たないので DRAFT 相当に落とす
  const publishedAt = parsed.publishMode === 'keep' ? null : parsed.publishedAt

  const created = await prisma.announcement.create({
    data: {
      title: parsed.title,
      body: parsed.body,
      isPinned: parsed.isPinned,
      publishedAt,
      expiresAt: parsed.expiresAt,
    },
    select: { id: true },
  })

  revalidatePath('/announcements')
  revalidatePath('/admin/announcements')
  return { success: true, id: created.id }
}

export async function updateAnnouncementAction(
  id: string,
  formData: FormData,
): Promise<Ok | Fail> {
  const gate = await requireAdmin()
  if (!gate.ok) return { success: false, error: gate.error }

  const parsed = parseInput(formData)
  if ('error' in parsed) return { success: false, error: parsed.error }

  // 'keep' モードなら既存の publishedAt をそのまま維持する（DB を叩いて現在値を取得）。
  let publishedAt: Date | null = parsed.publishedAt
  if (parsed.publishMode === 'keep') {
    const existing = await prisma.announcement.findUnique({
      where: { id },
      select: { publishedAt: true },
    })
    if (!existing) return { success: false, error: '対象のお知らせが見つかりません' }
    publishedAt = existing.publishedAt
  }

  try {
    await prisma.announcement.update({
      where: { id },
      data: {
        title: parsed.title,
        body: parsed.body,
        isPinned: parsed.isPinned,
        publishedAt,
        expiresAt: parsed.expiresAt,
      },
    })
  } catch (e) {
    if ((e as { code?: string })?.code === 'P2025') {
      return { success: false, error: '対象のお知らせが見つかりません' }
    }
    throw e
  }

  revalidatePath('/announcements')
  revalidatePath('/admin/announcements')
  revalidatePath(`/admin/announcements/${id}/edit`)
  // サイドバー未読バッジ (dashboard-shell) にも反映させる
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function deleteAnnouncementAction(id: string): Promise<Ok | Fail> {
  const gate = await requireAdmin()
  if (!gate.ok) return { success: false, error: gate.error }

  try {
    await prisma.announcement.delete({ where: { id } })
  } catch (e) {
    if ((e as { code?: string })?.code === 'P2025') {
      return { success: false, error: '対象のお知らせが見つかりません' }
    }
    throw e
  }

  revalidatePath('/announcements')
  revalidatePath('/admin/announcements')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
