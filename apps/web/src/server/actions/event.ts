'use server'

// イベント関連の Server Actions（Phase A）
// tRPC ルーター (apps/api) と対を成す。フロントからの直接呼び出し用に、
// prisma を叩きながら権限チェックと副作用（EventParticipant 自動生成等）を担う。

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { z } from 'zod'
import { CreateEventSchema } from '@creator-links/shared'
import type { EventParticipantRole, EventVisibility } from '@creator-links/shared'

// --- イベント作成 ---
// 入力は CreateEventSchema でバリデーションする。form / API どちらも同じ検証を通す。
// z.input を使うことで .default() が付与されたフィールドを optional 扱いにする。
export type CreateEventFormData = Omit<
  z.input<typeof CreateEventSchema>,
  'startAt' | 'endAt'
> & {
  startAt: string // ISO (schema 側で coerce)
  endAt?: string
  publishNow?: boolean
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function createEventAction(
  data: CreateEventFormData,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const { publishNow, ...rest } = data
  const parsed = CreateEventSchema.safeParse(rest)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { success: false, error: first?.message ?? '入力内容を確認してください' }
  }
  const input = parsed.data
  const publish = publishNow ?? false

  const event = await prisma.event.create({
    data: {
      creatorId: session.user.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      visibility: input.visibility,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      isAllDay: input.isAllDay,
      hasSpecificDate: input.hasSpecificDate,
      venueName: input.venueName?.trim() || null,
      venueAddress: input.venueAddress?.trim() || null,
      venueUrl: input.venueUrl || null,
      city: input.city?.trim() || null,
      genres: input.genres,
      isOnline: input.isOnline,
      ticketUrl: input.ticketUrl || null,
      ticketPriceYen: input.ticketPriceYen ?? null,
      isFree: input.isFree,
      coverUrl: input.coverUrl || null,
      status: publish ? 'PUBLISHED' : 'DRAFT',
      publishedAt: publish ? new Date() : null,
    },
    select: { id: true },
  })

  revalidatePath('/events')
  revalidatePath('/dashboard/calendar')
  return { success: true, data: event }
}

// --- 可視性の変更（主催者のみ） ---
export async function updateEventVisibilityAction(
  eventId: string,
  visibility: EventVisibility,
): Promise<ActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { creatorId: true },
  })
  if (!event) return { success: false, error: 'イベントが見つかりません' }
  if (event.creatorId !== session.user.id) {
    return { success: false, error: '主催者のみ変更できます' }
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { visibility },
  })
  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  return { success: true, data: undefined }
}

// --- 参加表明（自主的な「行く/興味あり」トグル） ---
export async function toggleInterestAction(
  eventId: string,
  isAttending: boolean,
): Promise<ActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  await prisma.eventInterest.upsert({
    where: { userId_eventId: { userId: session.user.id, eventId } },
    create: { userId: session.user.id, eventId, isAttending },
    update: { isAttending },
  })

  revalidatePath(`/events/${eventId}`)
  return { success: true, data: undefined }
}

export async function clearInterestAction(eventId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  await prisma.eventInterest.deleteMany({
    where: { userId: session.user.id, eventId },
  })
  revalidatePath(`/events/${eventId}`)
  return { success: true, data: undefined }
}

// --- 公募枠への応募 ---
export async function applyToOpenRoleAction(
  openRoleId: string,
  message?: string,
): Promise<ActionResult<{ matchId: string }>> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const role = await prisma.eventOpenRole.findUnique({ where: { id: openRoleId } })
  if (!role) return { success: false, error: '募集枠が見つかりません' }
  if (role.status !== 'OPEN') {
    return { success: false, error: 'この募集は締め切られています' }
  }

  try {
    const match = await prisma.match.create({
      data: {
        eventOpenRoleId: openRoleId,
        artistId: session.user.id,
        message: message?.trim() || null,
        status: 'APPLIED',
      },
      select: { id: true },
    })
    revalidatePath(`/events`)
    return { success: true, data: { matchId: match.id } }
  } catch {
    return { success: false, error: '既に応募済みか、応募できない状態です' }
  }
}

// --- 公募枠の追加（主催者のみ） ---
export async function addOpenRoleAction(
  eventId: string,
  input: {
    roleType: EventParticipantRole
    title: string
    description?: string
    requiredCount?: number
    compensation?: number
    isPaid?: boolean
  },
): Promise<ActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return { success: false, error: 'イベントが見つかりません' }
  if (event.creatorId !== session.user.id) {
    return { success: false, error: '主催者のみ枠を追加できます' }
  }

  await prisma.eventOpenRole.create({
    data: {
      eventId,
      roleType: input.roleType,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      requiredCount: input.requiredCount ?? 1,
      compensation: input.compensation ?? null,
      isPaid: input.isPaid ?? true,
    },
  })
  revalidatePath(`/events/${eventId}`)
  return { success: true, data: undefined }
}

// --- イベントの公開／中止 ---
export async function publishEventAction(eventId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return { success: false, error: 'イベントが見つかりません' }
  if (event.creatorId !== session.user.id) {
    return { success: false, error: '主催者のみ公開できます' }
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: 'PUBLISHED',
      publishedAt: event.publishedAt ?? new Date(),
    },
  })
  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  return { success: true, data: undefined }
}

export async function cancelEventAction(eventId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return { success: false, error: 'イベントが見つかりません' }
  if (event.creatorId !== session.user.id) {
    return { success: false, error: '主催者のみ中止できます' }
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  })
  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  return { success: true, data: undefined }
}
