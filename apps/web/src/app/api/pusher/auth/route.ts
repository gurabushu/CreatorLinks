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

  // チャンネル名から matchId を取得して権限確認
  // private-chat-{matchId} の形式
  const matchId = channelName.replace('private-chat-', '')

  // 参加確認は DB で行う（prisma はここでも使える）
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

  const authResponse = pusher.authorizeChannel(socketId, channelName)
  return NextResponse.json(authResponse)
}
