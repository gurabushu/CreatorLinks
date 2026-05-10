// app/dashboard/chat/[id]/page.tsx — チャット (SSR + CSR ポーリング)

import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ChatClient } from './chat-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ChatPage({ params }: Props) {
  const { id: matchId } = await params
  const session = await auth()
  if (!session) redirect('/auth')

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      project: {
        select: { id: true, title: true, clientId: true, budget: true },
      },
      artist: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  })

  if (!match) notFound()

  // 当事者チェック
  const isArtist = match.artistId === session.user.id
  const isClient = match.project.clientId === session.user.id
  if (!isArtist && !isClient) redirect('/dashboard')

  // 権限チェック: ACCEPTED 以上のみチャット可
  if (match.status === 'APPLIED' || match.status === 'REJECTED') {
    redirect('/dashboard/matches')
  }

  // 初回メッセージ取得（SSR）
  const initialMessages = await prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    },
  })

  // 自分の未読を既読に
  await prisma.message.updateMany({
    where: { matchId, readAt: null, NOT: { senderId: session.user.id } },
    data: { readAt: new Date() },
  })

  return (
    <ChatClient
      matchId={matchId}
      currentUserId={session.user.id}
      isArtist={isArtist}
      match={{
        status: match.status,
        projectTitle: match.project.title,
        projectId: match.project.id,
        partnerName: isArtist ? match.project.clientId : match.artist.name,
        partnerAvatar: isArtist ? null : match.artist.avatarUrl,
      }}
      initialMessages={initialMessages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
        sender: m.sender,
      }))}
    />
  )
}
