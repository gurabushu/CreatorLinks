// app/dashboard/chat/[id]/page.tsx — チャット (SSR + CSR ポーリング)

import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ChatClient } from './chat-client'
import { listMyPrivateProjectsAction } from '@/server/actions/project'

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
      partner: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  })

  if (!match) notFound()

  const isP2P = match.projectId === null

  // 当事者チェック
  const isArtist = match.artistId === session.user.id
  const isClient = !isP2P && match.project?.clientId === session.user.id
  const isPartner = isP2P && match.partnerUserId === session.user.id
  if (!isArtist && !isClient && !isPartner) redirect('/dashboard')

  // 権限チェック: ACCEPTED 以上のみチャット可（P2P は最初から ACCEPTED）
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

  // 相手の情報（P2P と Project Match で経路が異なる）
  let partnerName: string
  let partnerAvatar: string | null
  if (isP2P) {
    // P2P: 自分でない方が相手
    if (isArtist) {
      partnerName = match.partner?.name ?? '相手'
      partnerAvatar = match.partner?.avatarUrl ?? null
    } else {
      partnerName = match.artist.name
      partnerAvatar = match.artist.avatarUrl
    }
  } else {
    // Project: アーティスト側から見ると発注者、発注者側から見るとアーティスト
    if (isArtist) {
      const client = await prisma.user.findUnique({
        where: { id: match.project!.clientId },
        select: { name: true, avatarUrl: true },
      })
      partnerName = client?.name ?? '発注者'
      partnerAvatar = client?.avatarUrl ?? null
    } else {
      partnerName = match.artist.name
      partnerAvatar = match.artist.avatarUrl
    }
  }

  // P2P マッチの場合のみ、自分の非公開案件を取得して共有候補にする
  const myPrivateProjects = isP2P ? await listMyPrivateProjectsAction() : []

  return (
    <ChatClient
      matchId={matchId}
      currentUserId={session.user.id}
      isArtist={isArtist}
      match={{
        status: match.status,
        projectTitle: isP2P ? null : match.project!.title,
        projectId: isP2P ? null : match.project!.id,
        isP2P,
        partnerName,
        partnerAvatar,
      }}
      myPrivateProjects={myPrivateProjects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        budget: p.budget,
        contractType: p.contractType,
      }))}
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
