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
