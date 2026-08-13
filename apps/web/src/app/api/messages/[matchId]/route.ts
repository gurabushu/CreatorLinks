// GET /api/messages/[matchId] — チャットポーリング用エンドポイント

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      artistId: true,
      partnerUserId: true,
      project: { select: { clientId: true } },
    },
  })

  if (!match) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isParticipant =
    match.artistId === session.user.id ||
    match.partnerUserId === session.user.id ||
    match.project?.clientId === session.user.id
  if (!isParticipant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const messages = await prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { id: true, name: true, displayName: true, avatarUrl: true } },
    },
  })

  // 自分宛ての未読を既読に
  await prisma.message.updateMany({
    where: { matchId, readAt: null, NOT: { senderId: session.user.id } },
    data: { readAt: new Date() },
  })

  return NextResponse.json(
    messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      readAt: m.readAt?.toISOString() ?? null,
      sender: m.sender,
    }))
  )
}
