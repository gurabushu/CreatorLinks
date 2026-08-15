// イベント編集 (主催者のみ)。EventForm mode='edit' を通じて updateEventAction を呼ぶ。
// 初期値の日時は JST → datetime-local 用のローカル文字列に変換して渡す。

import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { jstDatetimeLocal } from '@/lib/jst-date'
import { EventForm, type EventFormInitial } from '@/components/events/event-form'
import type { EventType, EventVisibility } from '@creator-links/shared'

export const metadata = { title: 'イベント編集' }
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export default async function EditEventPage({ params }: Params) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect(`/auth?callbackUrl=/events/${id}/edit`)

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      creatorId: true,
      type: true,
      visibility: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      isAllDay: true,
      venueName: true,
      city: true,
      genres: true,
      ticketUrl: true,
      ticketPriceYen: true,
      isFree: true,
      media: {
        orderBy: { position: 'asc' },
        select: { type: true, url: true, caption: true },
      },
    },
  })

  if (!event) notFound()
  if (event.creatorId !== session.user.id) {
    // 主催者以外は詳細ページに戻す
    redirect(`/events/${id}`)
  }

  const initial: EventFormInitial = {
    type: event.type as EventType,
    visibility: event.visibility as EventVisibility,
    title: event.title,
    description: event.description ?? '',
    startAt: jstDatetimeLocal(event.startAt),
    endAt: event.endAt ? jstDatetimeLocal(event.endAt) : '',
    isAllDay: event.isAllDay,
    venueName: event.venueName ?? '',
    city: event.city ?? '',
    genresText: event.genres.join(', '),
    ticketUrl: event.ticketUrl ?? '',
    ticketPriceYen: event.ticketPriceYen != null ? String(event.ticketPriceYen) : '',
    isFree: event.isFree,
    media: event.media.map((m) => ({
      type: m.type as 'IMAGE' | 'VIDEO',
      url: m.url,
      caption: m.caption ?? '',
    })),
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">イベントを編集</h1>
      <EventForm mode="edit" eventId={id} initial={initial} />
    </div>
  )
}
