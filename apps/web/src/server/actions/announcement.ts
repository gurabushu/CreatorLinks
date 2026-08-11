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

const MAX_TITLE = 120
const MAX_BODY = 10000

type Fail = { success: false; error: string }
type Ok = { success: true }
type OkWith<T> = { success: true } & T

async function requireAdmin() {
  const session = await auth()
  if (!session) return { ok: false as const, error: 'ログインが必要です' }
  if (session.user.role !== 'ADMIN') {
    return { ok: false as const, error: '権限がありません（ADMIN のみ）' }
  }
  return { ok: true as const, session }
}

function parseInput(formData: FormData): {
  title: string
  body: string
  isPinned: boolean
  publishedAt: Date | null
  expiresAt: Date | null
  error?: string
} {
  const title = String(formData.get('title') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const isPinned = formData.get('isPinned') === 'on' || formData.get('isPinned') === 'true'
  const publishMode = String(formData.get('publishMode') ?? 'draft') // draft | now | scheduled
  const scheduledAtRaw = String(formData.get('scheduledAt') ?? '')
  const expiresAtRaw = String(formData.get('expiresAt') ?? '')

  if (!title) return err('タイトルを入力してください')
  if (title.length > MAX_TITLE) return err(`タイトルは ${MAX_TITLE} 文字以内で入力してください`)
  if (!body) return err('本文を入力してください')
  if (body.length > MAX_BODY) return err(`本文は ${MAX_BODY} 文字以内で入力してください`)

  let publishedAt: Date | null = null
  if (publishMode === 'now') {
    publishedAt = new Date()
  } else if (publishMode === 'scheduled') {
    if (!scheduledAtRaw) return err('予約公開日時を入力してください')
    const d = new Date(scheduledAtRaw)
    if (Number.isNaN(d.getTime())) return err('予約公開日時が不正です')
    if (d.getTime() <= Date.now()) return err('予約公開日時は現在より未来を指定してください')
    publishedAt = d
  }

  let expiresAt: Date | null = null
  if (expiresAtRaw) {
    const d = new Date(expiresAtRaw)
    if (Number.isNaN(d.getTime())) return err('有効期限が不正です')
    if (publishedAt && d.getTime() <= publishedAt.getTime()) {
      return err('有効期限は公開日時より後を指定してください')
    }
    expiresAt = d
  }

  return { title, body, isPinned, publishedAt, expiresAt }

  function err(error: string) {
    return { title, body, isPinned, publishedAt: null, expiresAt: null, error }
  }
}

export async function createAnnouncementAction(
  formData: FormData,
): Promise<OkWith<{ id: string }> | Fail> {
  const gate = await requireAdmin()
  if (!gate.ok) return { success: false, error: gate.error }

  const parsed = parseInput(formData)
  if (parsed.error) return { success: false, error: parsed.error }

  const created = await prisma.announcement.create({
    data: {
      title: parsed.title,
      body: parsed.body,
      isPinned: parsed.isPinned,
      publishedAt: parsed.publishedAt,
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
  if (parsed.error) return { success: false, error: parsed.error }

  await prisma.announcement.update({
    where: { id },
    data: {
      title: parsed.title,
      body: parsed.body,
      isPinned: parsed.isPinned,
      publishedAt: parsed.publishedAt,
      expiresAt: parsed.expiresAt,
    },
  })

  revalidatePath('/announcements')
  revalidatePath('/admin/announcements')
  revalidatePath(`/admin/announcements/${id}/edit`)
  return { success: true }
}

export async function deleteAnnouncementAction(id: string): Promise<Ok | Fail> {
  const gate = await requireAdmin()
  if (!gate.ok) return { success: false, error: gate.error }

  await prisma.announcement.delete({ where: { id } })

  revalidatePath('/announcements')
  revalidatePath('/admin/announcements')
  return { success: true }
}
