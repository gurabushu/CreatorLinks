// GET /api/account/export
// 自分の全 PII を JSON でダウンロード（APPI 32 条・開示請求への対応 UI）。
//
// 対象データ:
// - User (匿名化前の全プロフィール)
// - Portfolio 全件
// - Match (自分が artist / partner のいずれか)
// - Message (自分が送信した全メッセージ)
// - Review (自分が投稿した全レビュー)
// - PromoRedemption (自分の redeem 履歴)
// - Payment (自分が client の Match に紐づく全 Payment)
// - FeaturedArtist / EventInterest / EventFollow / Follow
//
// メールアドレスや内部 ID は残す。相手ユーザーの PII は含めない
// （自分の権利であって、他人の権利ではない）。

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const userId = session.user.id

  // 各テーブルから自分のデータを集約
  const [
    user,
    portfolios,
    matchesAsArtist,
    matchesAsPartner,
    sentMessages,
    reviewsGiven,
    likesGiven,
    likesReceived,
    promoRedemptions,
    eventsCreated,
    eventParticipations,
    eventFollows,
    eventInterests,
    followsGiven,
    followsReceived,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        role: true,
        bio: true,
        genres: true,
        instruments: true,
        gender: true,
        heightCm: true,
        activityYears: true,
        skillLevel: true,
        avatarUrl: true,
        coverUrl: true,
        averageRating: true,
        earlyBirdSlot: true,
        earlyBirdExpiresAt: true,
        hasPaidSubscription: true,
        hasLifetimeFreePro: true,
        stripeConnectAccountId: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeOnboardingCompletedAt: true,
        isGuest: true,
        isOfficial: true,
        announcementsReadAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.portfolio.findMany({ where: { userId } }),
    prisma.match.findMany({
      where: { artistId: userId },
      include: { project: { select: { id: true, title: true, budget: true } } },
    }),
    prisma.match.findMany({
      where: { partnerUserId: userId },
      include: { project: { select: { id: true, title: true, budget: true } } },
    }),
    prisma.message.findMany({
      where: { senderId: userId },
      select: { id: true, matchId: true, body: true, createdAt: true, readAt: true },
    }),
    prisma.review.findMany({ where: { reviewerId: userId } }),
    prisma.like.findMany({ where: { likerId: userId } }),
    prisma.like.findMany({ where: { likedId: userId } }),
    prisma.promoRedemption.findMany({
      where: { userId },
      include: { code: { select: { code: true, label: true } } },
    }),
    prisma.event.findMany({ where: { creatorId: userId } }),
    prisma.eventParticipant.findMany({ where: { userId } }),
    prisma.eventFollow.findMany({ where: { followerId: userId } }),
    prisma.eventInterest.findMany({ where: { userId } }),
    prisma.follow.findMany({ where: { followerId: userId } }),
    prisma.follow.findMany({ where: { followingId: userId } }),
  ])

  // 自分が client の Project → その Match の Payment
  const projects = await prisma.project.findMany({
    where: { clientId: userId },
    select: { id: true, title: true },
  })
  const projectIds = projects.map((p) => p.id)
  const payments = projectIds.length > 0
    ? await prisma.payment.findMany({
        where: { match: { projectId: { in: projectIds } } },
      })
    : []

  const exportData = {
    _meta: {
      exportedAt: new Date().toISOString(),
      exportedFor: userId,
      appliesTo: 'EncoreCue (TobojoLabs) - APPI 32 条 開示請求 対応',
      note:
        '本ファイルは開示請求の対象となる、あなたご自身の個人データです。' +
        '相手ユーザーの PII（メール・氏名等）は含まれません。',
    },
    user,
    portfolios,
    matches: {
      asArtist: matchesAsArtist,
      asPartner: matchesAsPartner,
    },
    sentMessages,
    reviewsGiven,
    likes: {
      given: likesGiven,
      received: likesReceived,
    },
    promoRedemptions,
    events: {
      created: eventsCreated,
      participations: eventParticipations,
      follows: eventFollows,
      interests: eventInterests,
    },
    follows: {
      given: followsGiven,
      received: followsReceived,
    },
    projectsAsClient: projects,
    paymentsAsClient: payments,
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `encorecue-account-export-${userId.slice(0, 8)}-${timestamp}.json`

  // Prisma の Decimal / Date は JSON.stringify で自動変換される
  const body = JSON.stringify(exportData, null, 2)

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
