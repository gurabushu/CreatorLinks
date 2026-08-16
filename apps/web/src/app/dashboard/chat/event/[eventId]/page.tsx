// Event グループチャット SSR ページ。
// 権限: Event.creator + EventParticipant.status='CONFIRMED' のみアクセス可能。
// - 権限判定は server actions (event-chat.ts) と同じロジックで、認可漏れを一元管理
// - 初期メッセージは新しい順で 50 件取得し、クライアント側で reverse して古い順に描画

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDisplayName } from '@/lib/user'
import { EventChatClient } from './event-chat-client'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ eventId: string }> }

export default async function EventChatPage({ params }: Params) {
  const { eventId } = await params
  const session = await auth()
  if (!session) redirect('/auth?next=' + encodeURIComponent(`/dashboard/chat/event/${eventId}`))

  // 権限判定 + メンバー一覧 + イベント要約 を 1 クエリで取得
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      startAt: true,
      creatorId: true,
      creator: { select: { id: true, name: true, displayName: true, avatarUrl: true } },
      participants: {
        where: { status: 'CONFIRMED' },
        select: {
          user: { select: { id: true, name: true, displayName: true, avatarUrl: true } },
        },
      },
    },
  })
  if (!event) notFound()

  const isCreator = event.creatorId === session.user.id
  const isConfirmedParticipant = event.participants.some((p) => p.user.id === session.user.id)
  if (!isCreator && !isConfirmedParticipant) {
    // メンバーでない場合は Event 詳細に流す (そこで参加動線が出る)
    redirect(`/events/${eventId}`)
  }

  const initialMessagesDesc = await prisma.message.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      sender: { select: { id: true, name: true, displayName: true, avatarUrl: true } },
    },
  })
  // 古い順 → 新しい順で描画するため reverse
  const initialMessages = initialMessagesDesc.reverse().map((m) => ({
    id: m.id,
    senderId: m.senderId,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    sender: m.sender,
  }))

  // メンバー一覧（creator + CONFIRMED participants）を dedupe して渡す
  const memberMap = new Map<
    string,
    { id: string; name: string; displayName: string | null; avatarUrl: string | null }
  >()
  memberMap.set(event.creator.id, event.creator)
  for (const p of event.participants) memberMap.set(p.user.id, p.user)
  const members = Array.from(memberMap.values())

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-3 pb-3 border-b flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Link
            href={`/events/${eventId}`}
            className="text-xs text-gray-500 hover:text-purple-600 hover:underline"
          >
            ← イベントに戻る
          </Link>
          <h1 className="text-lg sm:text-xl font-bold truncate mt-1">{event.title}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            グループチャット · メンバー {members.length} 名 · 主催{' '}
            {getDisplayName(event.creator)}
          </p>
        </div>
      </div>
      <EventChatClient
        eventId={eventId}
        currentUserId={session.user.id}
        initialMessages={initialMessages}
        members={members}
      />
    </div>
  )
}
