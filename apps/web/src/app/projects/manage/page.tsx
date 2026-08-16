// app/projects/manage/page.tsx — 案件管理（発注者）(SSR)

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ManageMatchButtons } from './manage-match-buttons'
import { getDisplayName } from '@/lib/user'
import { formatCurrency, formatDate } from '@/lib/utils'
import { COMMITMENT_LEVEL_LABELS, type CommitmentLevel } from '@creator-links/shared'
import { PaymentBadge, type PaymentStatus } from '@/components/payments/payment-badge'

const LEVEL_BADGE_CLASS: Record<CommitmentLevel, string> = {
  HOBBY: 'bg-emerald-100 text-emerald-700',
  SEMI_PRO: 'bg-sky-100 text-sky-700',
  PRO: 'bg-amber-100 text-amber-800',
}

export default async function ProjectManagePage() {
  const session = await auth()
  if (!session) redirect('/auth')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let projects: any[] = []
  try {
    projects = await prisma.project.findMany({
      where: { clientId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        matches: {
          include: {
            artist: {
              select: {
                id: true,
                name: true,
                displayName: true,
                avatarUrl: true,
                averageRating: true,
                genres: true,
              },
            },
            payment: { select: { status: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  } catch {
    // DB unreachable — show empty state
  }

  const STATUS_LABEL: Record<string, string> = {
    OPEN: '募集中',
    MATCHING: 'マッチング中',
    CLOSED: 'クローズ',
    PRIVATE: '非公開（相互紹介）',
  }

  // 「オファー送信済み」= 自分が発注者として SCOUTED を送っているが、まだアーティストが応答していない Match
  // プロジェクトを跨いで一覧化することで、送りっぱなしを把握できるようにする
  const sentScouts = projects.flatMap((p) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p.matches as any[])
      .filter((m) => m.status === 'SCOUTED')
      .map((m) => ({
        matchId: m.id,
        projectId: p.id,
        projectTitle: p.title,
        artist: m.artist,
        createdAt: m.createdAt,
      })),
  )

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">案件管理</h1>
        <Link
          href="/projects/new"
          className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition"
        >
          + 新しい案件
        </Link>
      </div>

      {/* 送信済みスカウト（応答待ち）: プロジェクト横断で 1 箇所に集約 */}
      {sentScouts.length > 0 && (
        <section className="mb-8">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span aria-hidden className="text-lg">📤</span>
              <h2 className="font-bold text-amber-900 text-sm sm:text-base">
                送信済みスカウト <span className="text-amber-700">({sentScouts.length}件)</span>
              </h2>
              <span className="text-xs text-amber-700 ml-auto">アーティストの応答待ち</span>
            </div>
            <ul className="space-y-2">
              {sentScouts.map((s) => (
                <li key={s.matchId}>
                  <div className="bg-white border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Link href={`/artists/${s.artist.id}`}>
                        <div className="w-9 h-9 rounded-full bg-amber-100 overflow-hidden shrink-0">
                          {s.artist.avatarUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.artist.avatarUrl}
                              alt={getDisplayName(s.artist)}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      </Link>
                      <div className="min-w-0">
                        <Link
                          href={`/artists/${s.artist.id}`}
                          className="font-medium text-sm hover:text-purple-600 truncate block"
                        >
                          {getDisplayName(s.artist)}
                        </Link>
                        <p className="text-xs text-gray-500 truncate">
                          {s.projectTitle} · {formatDate(s.createdAt)} 送信
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/chat/${s.matchId}`}
                      className="shrink-0 text-xs bg-amber-100 text-amber-800 hover:bg-amber-200 px-3 py-1.5 rounded-lg font-medium transition"
                    >
                      チャットを開く
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="mb-4">まだ案件を作成していません</p>
          <Link href="/projects/new" className="text-purple-600 hover:underline font-medium">
            最初の案件を作成する →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {projects.map((project) => (
            <div key={project.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm">
              {/* 案件ヘッダー */}
              <div className="px-6 py-5 border-b bg-gray-50 flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        project.status === 'OPEN'
                          ? 'bg-green-100 text-green-700'
                          : project.status === 'MATCHING'
                          ? 'bg-blue-100 text-blue-700'
                          : project.status === 'PRIVATE'
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {STATUS_LABEL[project.status]}
                    </span>
                    {(() => {
                      const level = (project.commitmentLevel ?? 'HOBBY') as CommitmentLevel
                      return (
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${LEVEL_BADGE_CLASS[level]}`}
                          title={COMMITMENT_LEVEL_LABELS[level].description}
                        >
                          {COMMITMENT_LEVEL_LABELS[level].label}
                        </span>
                      )
                    })()}
                    <span className="text-xs text-gray-400">
                      {project.contractType === 'SPOT' ? 'スポット' : 'サブスク'}
                    </span>
                  </div>
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-bold text-lg hover:text-purple-600 transition"
                  >
                    {project.title}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(project.createdAt)} 掲載</p>
                </div>
                <div className="text-right shrink-0">
                  {project.budget && (
                    <p className="text-purple-600 font-bold">{formatCurrency(project.budget)}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">応募 {project.matches.length}件</p>
                </div>
              </div>

              {/* 応募者一覧 */}
              {project.matches.length === 0 ? (
                <p className="px-6 py-5 text-sm text-gray-400">まだ応募者がいません</p>
              ) : (
                <div className="divide-y">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {project.matches.map((match: any) => (
                    <div key={match.id} className="px-6 py-4 flex items-start justify-between gap-4">
                      {/* アーティスト情報 */}
                      <div className="flex items-start gap-3 min-w-0">
                        <Link href={`/artists/${match.artist.id}`}>
                          <div className="w-10 h-10 rounded-full bg-purple-100 overflow-hidden shrink-0">
                            {match.artist.avatarUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={match.artist.avatarUrl}
                                alt={getDisplayName(match.artist)}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        </Link>
                        <div className="min-w-0">
                          <Link
                            href={`/artists/${match.artist.id}`}
                            className="font-medium text-sm hover:text-purple-600"
                          >
                            {getDisplayName(match.artist)}
                          </Link>
                          <p className="text-xs text-gray-400">
                            評価 {Number(match.artist.averageRating).toFixed(1)}
                            {match.artist.genres.length > 0 &&
                              ` · ${match.artist.genres.slice(0, 2).join(', ')}`}
                          </p>
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            {/* Match direction/status バッジ: 応募 vs スカウト送信 で色分け */}
                            {match.status === 'SCOUTED' && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-semibold">
                                📤 送信スカウト (応答待ち)
                              </span>
                            )}
                            {match.status === 'APPLIED' && (
                              <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-full font-semibold">
                                📥 応募あり
                              </span>
                            )}
                            {match.payment && (
                              <PaymentBadge status={match.payment.status as PaymentStatus} size="sm" />
                            )}
                          </div>
                          {match.message && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2 max-w-md">
                              「{match.message}」
                            </p>
                          )}
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <ManageMatchButtons match={match} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
