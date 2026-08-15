// app/dashboard/chat/[id]/page.tsx — チャット (SSR + CSR ポーリング)

import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ChatClient } from './chat-client'
import { listMyPrivateProjectsAction } from '@/server/actions/project'
import { checkPaymentStatusAction } from '@/server/actions/payments'
import { calcArtistPayout, calcPlatformFee } from '@/lib/stripe'
import { getDisplayName } from '@/lib/user'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ paid?: string }>
}

export default async function ChatPage({ params, searchParams }: Props) {
  const { id: matchId } = await params
  const { paid } = await searchParams
  const session = await auth()
  if (!session) redirect('/auth')

  // Stripe Checkout から戻ってきた場合、Payment ステータスを確定させる
  // Webhook (P6) 実装後はこの一手間が不要になる
  if (paid === '1') {
    try {
      await checkPaymentStatusAction(matchId)
    } catch {
      // Stripe 到達不能でも画面表示は続行
    }
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      project: {
        select: { id: true, title: true, clientId: true, budget: true },
      },
      artist: {
        // role は Checkout 前 fee 表示 (5%/7%) を actions/payments 側の記録と一致させるため
        select: { id: true, name: true, displayName: true, avatarUrl: true, isOfficial: true, role: true },
      },
      partner: {
        select: { id: true, name: true, displayName: true, avatarUrl: true, isOfficial: true },
      },
      payment: {
        select: {
          status: true,
          amountYen: true,
          artistPayoutYen: true,
          paidAt: true,
        },
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
      sender: { select: { id: true, name: true, displayName: true, avatarUrl: true } },
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
  let partnerIsOfficial = false
  if (isP2P) {
    // P2P: 自分でない方が相手
    if (isArtist) {
      partnerName = match.partner ? getDisplayName(match.partner) : '相手'
      partnerAvatar = match.partner?.avatarUrl ?? null
      partnerIsOfficial = match.partner?.isOfficial ?? false
    } else {
      partnerName = getDisplayName(match.artist)
      partnerAvatar = match.artist.avatarUrl
      partnerIsOfficial = match.artist.isOfficial
    }
  } else {
    // Project: アーティスト側から見ると発注者、発注者側から見るとアーティスト
    if (isArtist) {
      const client = await prisma.user.findUnique({
        where: { id: match.project!.clientId },
        select: { name: true, displayName: true, avatarUrl: true, isOfficial: true },
      })
      partnerName = client ? getDisplayName(client) : '発注者'
      partnerAvatar = client?.avatarUrl ?? null
      partnerIsOfficial = client?.isOfficial ?? false
    } else {
      partnerName = getDisplayName(match.artist)
      partnerAvatar = match.artist.avatarUrl
      partnerIsOfficial = match.artist.isOfficial
    }
  }

  // P2P マッチの場合のみ、自分の非公開案件を取得して共有候補にする
  const myPrivateProjects = isP2P ? await listMyPrivateProjectsAction() : []

  const budget = isP2P ? null : match.project!.budget
  const isProArtist = match.artist.role === 'PRO'
  const feeBreakdown =
    budget && budget > 0
      ? {
          platformFeeYen: calcPlatformFee(budget, { isProArtist }),
          artistPayoutYen: calcArtistPayout(budget, { isProArtist }),
        }
      : null

  return (
    <ChatClient
      matchId={matchId}
      currentUserId={session.user.id}
      isArtist={isArtist}
      isClient={isClient}
      match={{
        status: match.status,
        projectTitle: isP2P ? null : match.project!.title,
        projectId: isP2P ? null : match.project!.id,
        projectBudget: budget,
        isP2P,
        partnerName,
        partnerAvatar,
        partnerIsOfficial,
      }}
      feeBreakdown={feeBreakdown}
      payment={
        match.payment
          ? {
              status: match.payment.status,
              amountYen: match.payment.amountYen,
              artistPayoutYen: match.payment.artistPayoutYen,
              paidAt: match.payment.paidAt?.toISOString() ?? null,
            }
          : null
      }
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
