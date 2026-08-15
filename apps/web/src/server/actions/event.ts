'use server'

// イベント関連の Server Actions（Phase A）
// tRPC ルーター (apps/api) と対を成す。フロントからの直接呼び出し用に、
// prisma を叩きながら権限チェックと副作用（EventParticipant 自動生成等）を担う。

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { z } from 'zod'
import { CreateEventSchema, UpdateEventSchema } from '@creator-links/shared'
import type { EventMediaInput, EventParticipantRole, EventVisibility } from '@creator-links/shared'

// 入力の media[] を position で正規化しつつ、先頭 IMAGE を coverUrl に採用する。
// media が空なら coverUrl も null（フォーム側で明示的に upload → 全削除したケース）。
function deriveCoverUrl(media: EventMediaInput[]): string | null {
  const firstImage = [...media]
    .sort((a, b) => a.position - b.position)
    .find((m) => m.type === 'IMAGE')
  return firstImage?.url ?? null
}

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

  // フォームから media を受け取っている場合は先頭 IMAGE が coverUrl の実体になる。
  // フォームに UI が無い旧経路（API 直叩き等）では従来通り input.coverUrl を優先する。
  const coverFromMedia = deriveCoverUrl(input.media)
  const resolvedCoverUrl = input.media.length > 0 ? coverFromMedia : input.coverUrl || null

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
      coverUrl: resolvedCoverUrl,
      status: publish ? 'PUBLISHED' : 'DRAFT',
      publishedAt: publish ? new Date() : null,
      media:
        input.media.length > 0
          ? {
              create: input.media.map((m, idx) => ({
                type: m.type,
                url: m.url,
                caption: m.caption?.trim() || null,
                // フォーム側の position を尊重しつつ、未指定 (デフォルト 0) が並ぶ場合の
                // 順序決定用に配列 index も反映する（同値時の tiebreaker）。
                position: m.position * 1000 + idx,
              })),
            }
          : undefined,
    },
    select: { id: true },
  })

  revalidatePath('/events')
  revalidatePath('/dashboard/calendar')
  return { success: true, data: event }
}

// --- イベント編集（主催者のみ） ---
// フォームは常に全項目を送る想定だが、UpdateEventSchema は .partial() なので個別 undefined 許容
export type UpdateEventFormData = Omit<
  z.input<typeof UpdateEventSchema>,
  'startAt' | 'endAt'
> & {
  startAt?: string
  endAt?: string
}

export async function updateEventAction(
  eventId: string,
  data: UpdateEventFormData,
): Promise<ActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { creatorId: true },
  })
  if (!event) return { success: false, error: 'イベントが見つかりません' }
  if (event.creatorId !== session.user.id) {
    return { success: false, error: '主催者のみ編集できます' }
  }

  const parsed = UpdateEventSchema.safeParse(data)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { success: false, error: first?.message ?? '入力内容を確認してください' }
  }
  const input = parsed.data

  // media が明示的に渡された場合は全置換 (delete → create) + coverUrl 自動同期。
  // 部分更新はサポートしない：フォームは常に「今の全リスト」を送る前提。
  const mediaProvided = input.media !== undefined
  const nextMedia = input.media ?? []
  const nextCoverUrl = mediaProvided
    ? deriveCoverUrl(nextMedia)
    : input.coverUrl !== undefined
      ? input.coverUrl || null
      : undefined // 未指定 = coverUrl を更新しない

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: eventId },
      data: {
        ...(input.title !== undefined && { title: input.title.trim() }),
        ...(input.description !== undefined && {
          description: input.description?.trim() || null,
        }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.visibility !== undefined && { visibility: input.visibility }),
        ...(input.startAt !== undefined && { startAt: input.startAt }),
        ...(input.endAt !== undefined && { endAt: input.endAt ?? null }),
        ...(input.isAllDay !== undefined && { isAllDay: input.isAllDay }),
        ...(input.hasSpecificDate !== undefined && { hasSpecificDate: input.hasSpecificDate }),
        ...(input.venueName !== undefined && {
          venueName: input.venueName?.trim() || null,
        }),
        ...(input.venueAddress !== undefined && {
          venueAddress: input.venueAddress?.trim() || null,
        }),
        ...(input.venueUrl !== undefined && { venueUrl: input.venueUrl || null }),
        ...(input.city !== undefined && { city: input.city?.trim() || null }),
        ...(input.genres !== undefined && { genres: input.genres }),
        ...(input.isOnline !== undefined && { isOnline: input.isOnline }),
        ...(input.ticketUrl !== undefined && { ticketUrl: input.ticketUrl || null }),
        ...(input.ticketPriceYen !== undefined && {
          ticketPriceYen: input.ticketPriceYen ?? null,
        }),
        ...(input.isFree !== undefined && { isFree: input.isFree }),
        ...(nextCoverUrl !== undefined && { coverUrl: nextCoverUrl }),
      },
    })

    if (mediaProvided) {
      await tx.eventMedia.deleteMany({ where: { eventId } })
      if (nextMedia.length > 0) {
        await tx.eventMedia.createMany({
          data: nextMedia.map((m, idx) => ({
            eventId,
            type: m.type,
            url: m.url,
            caption: m.caption?.trim() || null,
            position: m.position * 1000 + idx,
          })),
        })
      }
    }
  })

  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  revalidatePath('/dashboard/calendar')
  return { success: true, data: undefined }
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

  // 親イベントの status / creatorId まで確認する。UI 側ボタン制御が抜けても
  // CANCELLED / COMPLETED / DRAFT や自分主催のイベントには応募できないよう保証する。
  const role = await prisma.eventOpenRole.findUnique({
    where: { id: openRoleId },
    include: { event: { select: { status: true, creatorId: true } } },
  })
  if (!role) return { success: false, error: '募集枠が見つかりません' }
  if (role.status !== 'OPEN') {
    return { success: false, error: 'この募集は締め切られています' }
  }
  if (role.event.status !== 'PUBLISHED') {
    return { success: false, error: 'このイベントは応募を受け付けていません' }
  }
  if (role.event.creatorId === session.user.id) {
    return { success: false, error: '自分が主催するイベントには応募できません' }
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
  } catch (e) {
    // ユニーク制約違反 (二重応募) だけを「既に応募済み」に変換。
    // 以前は catch-all で本物の DB エラーまで「既に応募済み」と誤表示していた。
    if ((e as { code?: string }).code === 'P2002') {
      return { success: false, error: '既に応募済みです' }
    }
    throw e
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
