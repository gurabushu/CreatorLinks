// 帳票 3 種 (invoice / quote / contract) 共通の Match 読み込み + 権限判定。
// 発注者と受注者だけが自 Match の帳票を閲覧できる。

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CURRENCY, calcArtistPayout, calcPlatformFee } from '@/lib/stripe'

export type DocumentMatch = Awaited<ReturnType<typeof loadDocumentMatch>>

export async function loadDocumentMatch(matchId: string) {
  const session = await auth()
  if (!session) return { ok: false as const, reason: 'unauthorized' as const }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      status: true,
      completedAt: true,
      createdAt: true,
      artistId: true,
      artist: {
        select: {
          id: true, name: true, displayName: true, email: true,
          role: true, isFounderExempt: true,
        },
      },
      project: {
        select: {
          id: true,
          title: true,
          description: true,
          budget: true,
          clientId: true,
          contractType: true,
          client: {
            select: {
              id: true, name: true, displayName: true, email: true,
              isFounderExempt: true,
            },
          },
        },
      },
      payment: {
        select: {
          id: true,
          status: true,
          amountYen: true,
          platformFeeYen: true,
          artistPayoutYen: true,
          paidAt: true,
          releasedAt: true,
          stripeChargeId: true, // 領収書ページで Stripe receipt_url を取得するため
        },
      },
    },
  })
  if (!match || !match.project) return { ok: false as const, reason: 'not_found' as const }

  const isParticipant =
    match.artistId === session.user.id || match.project.clientId === session.user.id
  if (!isParticipant) return { ok: false as const, reason: 'forbidden' as const }

  // 帳票 (見積/契約/請求/領収) は「合意成立以降」に意味を持つ。
  // APPLIED (応募中) / SCOUTED (オファー待ち) / REJECTED (拒否済み) の状態で
  // 契約書等を出すのは commitment 誤解を招くため notFound とする。
  const canIssueDocuments = ['ACCEPTED', 'COMPLETED'].includes(match.status)
  if (!canIssueDocuments) return { ok: false as const, reason: 'not_found' as const }

  // Payment が未作成でも帳票は budget ベースで表示できるようフォールバック
  const budget = match.project.budget ?? 0
  const isProArtist = match.artist.role === 'PRO'
  const isFounderExempt =
    match.artist.isFounderExempt || match.project.client.isFounderExempt
  const platformFeeYen =
    match.payment?.platformFeeYen ?? calcPlatformFee(budget, { isProArtist, isFounderExempt })
  const artistPayoutYen =
    match.payment?.artistPayoutYen ?? calcArtistPayout(budget, { isProArtist, isFounderExempt })

  return {
    ok: true as const,
    match,
    viewer: { id: session.user.id, isClient: match.project.clientId === session.user.id },
    amounts: {
      amountYen: match.payment?.amountYen ?? budget,
      platformFeeYen,
      artistPayoutYen,
      currency: CURRENCY,
      isFounderExempt, // 帳票側で「手数料 0 の理由」を条件分岐して表示するため
      isProArtist,
    },
  }
}
