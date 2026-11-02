// app/dashboard/chat/[id]/page.tsx — チャット (SSR + CSR ポーリング)

import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ChatClient } from './chat-client'
import { listMyPrivateProjectsAction } from '@/server/actions/project'
import { checkPaymentStatusAction } from '@/server/actions/payments'
import { calcArtistPayout, calcPlatformFee } from '@/lib/stripe'
import { getDisplayName } from '@/lib/user'
import { hasZeroFeeAccess } from '@/lib/early-bird'

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
        select: {
          id: true, title: true, clientId: true, budget: true,
          client: {
            select: {
              isFounderExempt: true,
              earlyBirdSlot: true,
              earlyBirdExpiresAt: true,
            },
          },
        },
      },
      artist: {
        // isFounderExempt (恩人枠, 永年 0%) または earlyBirdSlot + 期限内 (創設メンバー 6ヶ月 0%)
        // どちらか一方でも 0% 対象なら手数料 0% 表示 (hasZeroFeeAccess で判定)
        select: {
          id: true, name: true, displayName: true, avatarUrl: true, isOfficial: true,
          role: true, isFounderExempt: true,
          earlyBirdSlot: true, earlyBirdExpiresAt: true,
        },
      },
      partner: {
        select: {
          id: true, name: true, displayName: true, avatarUrl: true, isOfficial: true,
          earlyBirdSlot: true, isFounderExempt: true,
        },
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
  let partnerEarlyBirdSlot: number | null = null
  let partnerIsFounderExempt = false
  if (isP2P) {
    // P2P: 自分でない方が相手
    if (isArtist) {
      partnerName = match.partner ? getDisplayName(match.partner) : '相手'
      partnerAvatar = match.partner?.avatarUrl ?? null
      partnerIsOfficial = match.partner?.isOfficial ?? false
      partnerEarlyBirdSlot = match.partner?.earlyBirdSlot ?? null
      partnerIsFounderExempt = match.partner?.isFounderExempt ?? false
    } else {
      partnerName = getDisplayName(match.artist)
      partnerAvatar = match.artist.avatarUrl
      partnerIsOfficial = match.artist.isOfficial
      partnerEarlyBirdSlot = match.artist.earlyBirdSlot
      partnerIsFounderExempt = match.artist.isFounderExempt
    }
  } else {
    // Project: アーティスト側から見ると発注者、発注者側から見るとアーティスト
    if (isArtist) {
      const client = await prisma.user.findUnique({
        where: { id: match.project!.clientId },
        select: {
          name: true, displayName: true, avatarUrl: true, isOfficial: true,
          earlyBirdSlot: true, isFounderExempt: true,
        },
      })
      partnerName = client ? getDisplayName(client) : '発注者'
      partnerAvatar = client?.avatarUrl ?? null
      partnerIsOfficial = client?.isOfficial ?? false
      partnerEarlyBirdSlot = client?.earlyBirdSlot ?? null
      partnerIsFounderExempt = client?.isFounderExempt ?? false
    } else {
      partnerName = getDisplayName(match.artist)
      partnerAvatar = match.artist.avatarUrl
      partnerIsOfficial = match.artist.isOfficial
      partnerEarlyBirdSlot = match.artist.earlyBirdSlot
      partnerIsFounderExempt = match.artist.isFounderExempt
    }
  }

  // P2P マッチの場合のみ、自分の非公開案件を取得して共有候補にする
  const myPrivateProjects = isP2P ? await listMyPrivateProjectsAction() : []

  const budget = isP2P ? null : match.project!.budget
  // 2026-11-02 fee-only pivot v2: 手数料 0% は 2 条件。
  // 恩人枠 (isFounderExempt) または 創設メンバー 100 名の期限内 (earlyBirdSlot + expiresAt > now)
  // どちらか一方の当事者でも対象なら 0% 表示 (payments action と同一ロジック)
  const isFounderExempt =
    hasZeroFeeAccess(match.artist) || (match.project ? hasZeroFeeAccess(match.project.client) : false)
  const feeBreakdown =
    budget && budget > 0
      ? {
          platformFeeYen: calcPlatformFee(budget, { isFounderExempt }),
          artistPayoutYen: calcArtistPayout(budget, { isFounderExempt }),
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
        partnerEarlyBirdSlot,
        partnerIsFounderExempt,
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
