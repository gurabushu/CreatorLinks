// app/dashboard/page.tsx — ダッシュボード (SSR)

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getDisplayName } from '@/lib/user'
import { HeroCta } from '@/components/dashboard-shell/hero-cta'

export const metadata: Metadata = { title: 'ダッシュボード' }
export const dynamic = 'force-dynamic'

type Match = {
  id: string
  status: string
  createdAt: Date
  project: { id: string; title: string; budget: number | null; clientId: string } | null
}
type MyProject = {
  id: string
  title: string
  budget: number | null
  status: string
  createdAt: Date
  _count: { matches: number }
}
type EventItem = {
  id: string
  title: string
  startAt: Date
  type: string
  venueName: string | null
  creator: { id: string; name: string; displayName: string | null }
  role: 'MINE' | 'FOLLOWING'
}

const STATUS_LABEL: Record<string, string> = {
  APPLIED: '応募中',
  SCOUTED: 'オファー',
  ACCEPTED: '進行中',
  COMPLETED: '完了',
  REJECTED: '却下',
}
const STATUS_CLASS: Record<string, string> = {
  APPLIED: 'bg-gray-100 text-gray-700',
  SCOUTED: 'bg-purple-50 text-purple-700',
  ACCEPTED: 'bg-purple-50 text-purple-700',
  COMPLETED: 'bg-gray-100 text-gray-700',
  REJECTED: 'bg-gray-100 text-gray-500',
}
const PROJECT_STATUS_LABEL: Record<string, string> = {
  OPEN: '公開中',
  IN_PROGRESS: '進行中',
  CLOSED: 'クローズ',
  DRAFT: '下書き',
}

function fmtDate(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  const userId = session.user.id
  const now = new Date()
  const weekLater = new Date(now)
  weekLater.setDate(now.getDate() + 7)
  weekLater.setHours(23, 59, 59, 999)

  let isGuest = false
  let guestExpiresAt: Date | null = null
  let appliedMatches: Match[] = []
  let scoutedMatches: Match[] = []
  let activeMatches: Match[] = []
  let myProjects: MyProject[] = []
  let upcomingEvents: EventItem[] = []
  let unreadCount = 0
  let thisMonthDocCount = 0

  try {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { isGuest: true, createdAt: true },
    })
    isGuest = me?.isGuest ?? false
    if (me?.isGuest) {
      guestExpiresAt = new Date(me.createdAt.getTime() + 24 * 60 * 60 * 1000)
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [applied, scouted, active, projects, unread, myEvents, followRows, monthDocCount] = await Promise.all([
      prisma.match.findMany({
        where: { artistId: userId, status: 'APPLIED' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { id: true, title: true, budget: true, clientId: true } } },
      }),
      prisma.match.findMany({
        where: { artistId: userId, status: 'SCOUTED' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { id: true, title: true, budget: true, clientId: true } } },
      }),
      prisma.match.findMany({
        where: { artistId: userId, status: 'ACCEPTED' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { id: true, title: true, budget: true, clientId: true } } },
      }),
      prisma.project.findMany({
        where: { clientId: userId, deletedAt: null },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, budget: true, status: true, createdAt: true,
          _count: { select: { matches: true } },
        },
      }),
      prisma.message.count({
        where: {
          match: { OR: [{ artistId: userId }, { project: { clientId: userId } }] },
          readAt: null,
          NOT: { senderId: userId },
        },
      }),
      prisma.event.findMany({
        where: {
          creatorId: userId,
          startAt: { gte: now, lte: weekLater },
          status: { in: ['PUBLISHED', 'DRAFT'] },
        },
        orderBy: { startAt: 'asc' },
        select: {
          id: true, title: true, startAt: true, type: true, venueName: true,
          creator: { select: { id: true, name: true, displayName: true } },
        },
      }),
      prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      }),
      prisma.payment.count({
        where: {
          match: { artistId: userId },
          status: { in: ['HELD', 'RELEASED'] },
          paidAt: { gte: monthStart },
        },
      }),
    ])

    appliedMatches = applied
    scoutedMatches = scouted
    activeMatches = active
    myProjects = projects
    unreadCount = unread
    thisMonthDocCount = monthDocCount

    const followingIds = followRows.map((f) => f.followingId)
    const followingEvents = followingIds.length === 0
      ? []
      : await prisma.event.findMany({
          where: {
            creatorId: { in: followingIds },
            status: 'PUBLISHED',
            visibility: { in: ['PUBLIC', 'FOLLOWERS'] },
            startAt: { gte: now, lte: weekLater },
          },
          orderBy: { startAt: 'asc' },
          take: 5,
          select: {
            id: true, title: true, startAt: true, type: true, venueName: true,
            creator: { select: { id: true, name: true, displayName: true } },
          },
        })

    upcomingEvents = [
      ...myEvents.map((e) => ({ ...e, role: 'MINE' as const })),
      ...followingEvents.map((e) => ({ ...e, role: 'FOLLOWING' as const })),
    ]
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
      .slice(0, 5)
  } catch {
    // DB unreachable — show empty state
  }

  return (
    <div className="max-w-6xl mx-auto py-8 sm:py-10 px-4">
      {isGuest && (
        <div className="mb-6 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-800">
          <span className="font-bold">ゲストモード</span>
          <span className="ml-2">
            このアカウントは{guestExpiresAt ? ` ${guestExpiresAt.toLocaleString('ja-JP')} ` : 'まもなく'}に自動削除されます。引き続き利用するには
            <Link href="/auth" className="ml-1 underline font-medium hover:text-gray-900">
              正式登録
            </Link>
            をお願いします。
          </span>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500 mt-1 text-sm">
          こんにちは、{session.user.name} さん
        </p>
      </div>

      <HeroCta />

      {/* ステータスサマリー — 統一された色味 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatusCard href="/dashboard/matches" label="進行中の依頼" value={activeMatches.length} />
        <StatusCard href="/dashboard/calendar" label="今週の予定" value={upcomingEvents.length} />
        <StatusCard href="/dashboard/chat" label="未読メッセージ" value={unreadCount} highlight={unreadCount > 0} />
        <StatusCard href="/dashboard/matches" label="応募中" value={appliedMatches.length} />
      </div>

      {/* オファー受信 — 返信要なので薄い purple で注意喚起 */}
      {scoutedMatches.length > 0 && (
        <section className="mb-8">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-bold text-gray-900 text-base">
                オファー受信
                <span className="ml-2 text-sm font-medium text-gray-600">({scoutedMatches.length} 件)</span>
              </h2>
              <span className="text-xs text-gray-600">承諾 / 辞退の返信を</span>
            </div>
            <ul className="space-y-2">
              {scoutedMatches.map((m) => {
                if (!m.project) return null
                return (
                  <li key={m.id}>
                    <Link
                      href="/dashboard/matches"
                      className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-purple-300 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{m.project.title}</p>
                          {m.project.budget && (
                            <p className="text-xs text-gray-500 mt-0.5">¥{m.project.budget.toLocaleString()}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-purple-700 font-medium">
                          応答する →
                        </span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <section>
          <SectionHeader title="進行中の依頼" href="/dashboard/matches" hrefLabel="すべて見る" />
          {activeMatches.length === 0 ? (
            <EmptyCard>
              進行中の依頼はまだありません。
              <div className="mt-2">
                <Link href="/projects" className="text-purple-700 hover:underline">案件を探す →</Link>
              </div>
            </EmptyCard>
          ) : (
            <ul className="space-y-2">
              {activeMatches.map((m) => {
                if (!m.project) return null
                return (
                  <li key={m.id}>
                    <Link
                      href={`/projects/${m.project.id}`}
                      className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{m.project.title}</p>
                          {m.project.budget && (
                            <p className="text-xs text-gray-500 mt-0.5">¥{m.project.budget.toLocaleString()}</p>
                          )}
                        </div>
                        <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full ${STATUS_CLASS[m.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABEL[m.status] ?? m.status}
                        </span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section>
          <SectionHeader title="今週の予定" href="/dashboard/calendar" hrefLabel="カレンダー" />
          {upcomingEvents.length === 0 ? (
            <EmptyCard>
              今後 7 日以内の予定はありません。
              <div className="mt-2 flex gap-3 justify-center flex-wrap">
                <Link href="/events/new" className="text-purple-700 hover:underline">イベント告知</Link>
                <Link href="/artists" className="text-purple-700 hover:underline">アーティストをフォロー</Link>
              </div>
            </EmptyCard>
          ) : (
            <ul className="space-y-2">
              {upcomingEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/events/${e.id}`}
                    className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition"
                  >
                    <div className="flex items-center gap-2 text-xs mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        e.role === 'MINE' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {e.role === 'MINE' ? '自分' : 'フォロー中'}
                      </span>
                      <span className="text-gray-500">{fmtDate(e.startAt)}</span>
                      {e.venueName && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-gray-500 truncate">{e.venueName}</span>
                        </>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 truncate">{e.title}</p>
                    {e.role === 'FOLLOWING' && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        by {getDisplayName(e.creator)}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mb-8">
        <SectionHeader title="掲載中の案件" href="/projects/manage" hrefLabel="管理" />
        {myProjects.length === 0 ? (
          <EmptyCard>
            まだ案件を掲載していません。
            <div className="mt-2">
              <Link href="/projects/new" className="text-purple-700 hover:underline">新しい案件を作成</Link>
            </div>
          </EmptyCard>
        ) : (
          <ul className="space-y-2">
            {myProjects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{p.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        {p.budget && <span>¥{p.budget.toLocaleString()}</span>}
                        <span>·</span>
                        <span>応募 {p._count.matches} 件</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                      {PROJECT_STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {thisMonthDocCount > 0 && (
        <section className="mb-8">
          <Link
            href="/dashboard/payouts"
            className="block bg-purple-50 border border-purple-200 rounded-xl p-4 hover:border-purple-300 transition"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-purple-700 font-medium mb-0.5">今月の帳票</p>
                <p className="text-sm text-gray-800">
                  今月支払いが発生した案件{' '}
                  <span className="font-bold text-purple-700">{thisMonthDocCount} 件</span>
                  {' '}
                  <span className="text-gray-500 text-xs">見積 / 契約 / 請求 / 領収 が発行できます</span>
                </p>
              </div>
              <span className="text-purple-600">→</span>
            </div>
          </Link>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">クイックアクション</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction href="/projects/new" title="新規案件" hint="依頼テンプレから" />
          <QuickAction href="/events/new" title="イベント告知" hint="ライブ・セッション" />
          <QuickAction href="/onboarding" title="仲間を招待" hint="LINE / メール / QR" />
          <QuickAction href="/dashboard/profile" title="プロフィール編集" hint="自己紹介・実績" />
        </div>
      </section>
    </div>
  )
}

function StatusCard({
  href, label, value, highlight = false,
}: { href: string; label: string; value: number; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-purple-300 transition"
    >
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-purple-700' : 'text-gray-900'}`}>{value}</p>
    </Link>
  )
}

function SectionHeader({ title, href, hrefLabel }: { title: string; href: string; hrefLabel: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h2 className="text-base sm:text-lg font-bold text-gray-900">{title}</h2>
      <Link href={href} className="text-xs sm:text-sm text-purple-700 hover:underline">
        {hrefLabel} →
      </Link>
    </div>
  )
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-sm text-gray-600">
      {children}
    </div>
  )
}

function QuickAction({
  href, title, hint,
}: { href: string; title: string; hint: string }) {
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition"
    >
      <p className="font-semibold text-sm text-gray-900">{title}</p>
      <p className="text-[11px] text-gray-500 mt-1 leading-snug">{hint}</p>
    </Link>
  )
}
