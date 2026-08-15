// app/dashboard/matches/page.tsx — 応募管理 (SSR)

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PaymentBadge, type PaymentStatus } from '@/components/payments/payment-badge'
import { OfficialBadge } from '@/components/official-badge'
import { getDisplayName } from '@/lib/user'
import { ScoutResponseButtons } from './scout-response-buttons'

export default async function MatchesPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let matches: any[] = []
  try {
    matches = await prisma.match.findMany({
      where: {
        OR: [
          { artistId: session.user.id },
          { partnerUserId: session.user.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          include: {
            client: { select: { name: true, displayName: true, avatarUrl: true } },
          },
        },
        artist: { select: { id: true, name: true, displayName: true, avatarUrl: true, isOfficial: true } },
        partner: { select: { id: true, name: true, displayName: true, avatarUrl: true, isOfficial: true } },
        payment: { select: { status: true, artistPayoutYen: true } },
      },
    })
  } catch {
    // DB unreachable — show empty state
  }

  const p2pMatches = matches.filter((m) => m.projectId === null)
  const projectMatches = matches.filter((m) => m.projectId !== null)

  const statusGroups = {
    SCOUTED: projectMatches.filter((m) => m.status === 'SCOUTED'), // オファー受信 (承諾/辞退待ち) を先頭に
    APPLIED: projectMatches.filter((m) => m.status === 'APPLIED'),
    ACCEPTED: projectMatches.filter((m) => m.status === 'ACCEPTED'),
    COMPLETED: projectMatches.filter((m) => m.status === 'COMPLETED'),
    REJECTED: projectMatches.filter((m) => m.status === 'REJECTED'),
  }

  const STATUS_LABELS = {
    SCOUTED: 'オファー受信',
    APPLIED: '応募中',
    ACCEPTED: '承認済み',
    COMPLETED: '完了',
    REJECTED: '却下',
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-8">マッチング管理</h1>

      {/* P2P マッチ */}
      {p2pMatches.length > 0 && (
        <section className="mb-10">
          <h2 className="font-bold mb-3 text-lg">
            アーティスト同士のマッチ
            <span className="ml-2 text-sm text-gray-400">({p2pMatches.length}件)</span>
          </h2>
          <div className="space-y-3">
            {p2pMatches.map((match) => {
              const partner = match.artistId === session.user.id ? match.partner : match.artist
              return (
                <div
                  key={match.id}
                  className="bg-white border border-pink-100 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 overflow-hidden flex items-center justify-center text-white font-bold shrink-0">
                      {partner?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={partner.avatarUrl} alt={partner ? getDisplayName(partner) : ''} className="w-full h-full object-cover" />
                      ) : (
                        (partner ? getDisplayName(partner) : '?').charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate flex items-center gap-1.5">
                        <span className="truncate">{partner ? getDisplayName(partner) : '相手'}</span>
                        {partner?.isOfficial && <OfficialBadge size="sm" />}
                      </p>
                      <p className="text-xs text-gray-500">
                        {partner?.isOfficial
                          ? 'お知らせ・サポート'
                          : '相互いいねでマッチ — 非公開案件を相互紹介できます'}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/chat/${match.id}`}
                    className="text-sm bg-pink-100 text-pink-700 px-3 py-1.5 rounded-lg hover:bg-pink-200 transition shrink-0 text-center w-full sm:w-auto"
                  >
                    チャットへ
                  </Link>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {Object.entries(statusGroups).map(([status, items]) =>
        items.length > 0 ? (
          <section key={status} className="mb-8">
            <h2 className="font-bold mb-3 text-lg">
              {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
              <span className="ml-2 text-sm text-gray-400">({items.length}件)</span>
            </h2>
            <div className="space-y-3">
              {items.map((match) => (
                <div key={match.id} className="bg-white border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/projects/${match.projectId}`}
                      className="font-medium hover:text-purple-600 break-words"
                    >
                      {match.project.title}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      依頼者: {getDisplayName(match.project.client)}
                    </p>
                    {match.payment && (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <PaymentBadge status={match.payment.status as PaymentStatus} size="sm" />
                        {match.payment.status === 'RELEASED' && (
                          <span className="text-xs text-gray-500">
                            受取 ¥{match.payment.artistPayoutYen.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                    {match.message && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        「{match.message}」
                      </p>
                    )}
                  </div>
                  {status === 'ACCEPTED' && (
                    <Link
                      href={`/dashboard/chat/${match.id}`}
                      className="text-sm bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 transition shrink-0 text-center w-full sm:w-auto"
                    >
                      チャットへ
                    </Link>
                  )}
                  {status === 'SCOUTED' && (
                    <ScoutResponseButtons matchId={match.id} />
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null
      )}

      {matches.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p>まだマッチがありません</p>
          <div className="flex gap-3 justify-center mt-3">
            <Link href="/projects" className="text-purple-600 hover:underline">
              案件を探す →
            </Link>
            <Link href="/artists" className="text-pink-600 hover:underline">
              アーティストを探す →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
