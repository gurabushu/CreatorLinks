// app/api/pusher/auth/route.ts — Pusher private チャンネル認証
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPusherServer } from '@/lib/pusher-server'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pusher = await getPusherServer()
  if (!pusher) {
    return NextResponse.json({ error: 'Pusher not configured' }, { status: 503 })
  }

  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId = params.get('socket_id')
  const channelName = params.get('channel_name')

  if (!socketId || !channelName) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  // ユーザー通知チャンネル: 自分自身の userId のみ許可
  if (channelName.startsWith('private-user-')) {
    const targetUserId = channelName.slice('private-user-'.length)
    if (targetUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json(pusher.authorizeChannel(socketId, channelName))
  }

  // Event グループチャットチャンネル: private-event-chat-{eventId}
  // creator または EventParticipant.CONFIRMED のみ許可（応募中・INVITED は不可）
  // 判定は event-chat action と一致させる。
  if (channelName.startsWith('private-event-chat-')) {
    const eventId = channelName.slice('private-event-chat-'.length)
    const { prisma } = await import('@/lib/prisma')
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        creatorId: true,
        participants: {
          where: { userId: session.user.id, status: 'CONFIRMED' },
          select: { id: true },
          take: 1,
        },
      },
    })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const isMember =
      event.creatorId === session.user.id || event.participants.length > 0
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json(pusher.authorizeChannel(socketId, channelName))
  }

  // チャットチャンネル: private-chat-{matchId} — 参加者のみ許可
  if (channelName.startsWith('private-chat-')) {
    const matchId = channelName.slice('private-chat-'.length)
    const { prisma } = await import('@/lib/prisma')
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { project: { select: { clientId: true } } },
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const isParticipant =
      match.artistId === session.user.id ||
      match.partnerUserId === session.user.id ||
      match.project?.clientId === session.user.id

    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(pusher.authorizeChannel(socketId, channelName))
  }

  return NextResponse.json({ error: 'Unknown channel' }, { status: 400 })
}
