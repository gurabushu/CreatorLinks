// app/dashboard/page.tsx — マイページ (SSR)
// 3 軸ステータス一覧: 進行中の依頼(仕事DX) / 今週の予定(掲示板+カレンダー) / 掲載中の案件 / クイックアクション
// ログイン直後の主動線。岩田さんフィードバック反映 (2026-08-11)。

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getDisplayName } from '@/lib/user'
import { PLATFORM_FEE_RATE_PRO } from '@/lib/stripe'

export const metadata: Metadata = { title: 'マイページ' }
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
  SCOUTED: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
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
  // 今月の帳票ウィジェット用: 受注アーティスト側で今月支払い/送金が発生した件数
  let thisMonthDocCount = 0
  // S4: 直近 90 日の手数料実績と PRO 換算差額 (Free のみ表示)
  let feeWindowPaidYen = 0
  let feeWindowProEquivYen = 0
  let feeWindowMatchCount = 0

  try {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { isGuest: true, createdAt: true },
    })
    isGuest = me?.isGuest ?? false
    if (me?.isGuest) {
      guestExpiresAt = new Date(me.createdAt.getTime() + 24 * 60 * 60 * 1000)
    }

    // 今月の帳票発行対象件数: Payment 支払い (paidAt) が今月に入った受注案件
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    // S4: 直近 90 日の手数料 uplift ウィンドウ
    const feeWindowStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    const [applied, scouted, active, projects, unread, myEvents, followRows, monthDocCount, feePayments] = await Promise.all([
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
        where: { clientId: userId },
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
      // S4: 直近 90 日で自分がアーティストとして受注 & 支払確定した Payment。
      // Free だけに見せる帯なので session.user.role が PRO の時はクエリしない。
      session.user.role === 'PRO'
        ? Promise.resolve([] as { amountYen: number; platformFeeYen: number }[])
        : prisma.payment.findMany({
            where: {
              match: { artistId: userId },
              status: { in: ['HELD', 'RELEASED'] },
              paidAt: { gte: feeWindowStart },
            },
            select: { amountYen: true, platformFeeYen: true },
          }),
    ])

    appliedMatches = applied
    scoutedMatches = scouted
    activeMatches = active
    myProjects = projects
    unreadCount = unread
    thisMonthDocCount = monthDocCount

    // S4 aggregate: 実際に支払った platformFee 合計 vs PRO (5%) 換算合計
    for (const p of feePayments) {
      feeWindowPaidYen += p.platformFeeYen
      feeWindowProEquivYen += Math.round(p.amountYen * PLATFORM_FEE_RATE_PRO)
      feeWindowMatchCount += 1
    }

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
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-bold">ゲストモード</span>
          <span className="ml-2">
            このアカウントは{guestExpiresAt ? ` ${guestExpiresAt.toLocaleString('ja-JP')} ` : 'まもなく'}に自動削除されます。引き続き利用するには
            <Link href="/auth" className="ml-1 underline font-medium hover:text-amber-900">
              正式登録
            </Link>
            をお願いします。
          </span>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">マイページ</h1>
          <p className="text-gray-500 mt-1 text-sm">
            こんにちは、{session.user.name} さん
            {session.user.role === 'PRO' && (
              <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full">PRO</span>
            )}
          </p>
        </div>
        {session.user.role !== 'PRO' && (
          // PRO 新規受付は一時停止中。CTA は残しつつ操作不可 (準備中)
          <span
            aria-disabled="true"
            className="bg-gray-200 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed select-none"
          >
            準備中
          </span>
        )}
      </div>

      {/* ステータスサマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatusCard href="/dashboard/matches" label="進行中の依頼" value={activeMatches.length} tone="emerald" />
        <StatusCard href="/dashboard/calendar" label="今週の予定" value={upcomingEvents.length} tone="purple" />
        <StatusCard href="/dashboard/chat" label="未読メッセージ" value={unreadCount} tone={unreadCount > 0 ? 'red' : 'gray'} />
        <StatusCard href="/dashboard/matches" label="応募中" value={appliedMatches.length} tone="gray" />
      </div>

      {/* S4: 直近 90 日の手数料実績 → PRO 差額 (Free のみ / 実データがある時のみ) */}
      {session.user.role !== 'PRO' && feeWindowMatchCount > 0 && feeWindowPaidYen > feeWindowProEquivYen && (
        <Link
          href="/pro/subscribe"
          className="block mb-8 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-indigo-50/70 p-5 hover:shadow-md hover:border-purple-300 transition"
        >
          <div className="flex items-start gap-4 flex-wrap">
            <div className="text-3xl leading-none shrink-0" aria-hidden>💸</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-purple-700 font-medium mb-1">直近 90 日の手数料実績</p>
              <p className="text-sm text-gray-800 leading-relaxed">
                受注 <span className="font-bold text-purple-700">{feeWindowMatchCount} 件</span> で
                <span className="font-bold text-gray-900"> ¥{feeWindowPaidYen.toLocaleString()}</span>
                {' '}を手数料として支払いました。
                <br />
                PRO なら
                <span className="font-bold text-purple-700"> ¥{feeWindowProEquivYen.toLocaleString()}</span>
                {' '}で済み、
                <span className="font-bold text-emerald-700"> ¥{(feeWindowPaidYen - feeWindowProEquivYen).toLocaleString()}</span>
                {' '}が手元に残っていました。
              </p>
              <p className="text-[11px] text-purple-600 mt-2 underline">
                PRO の詳細を見る →
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* オファー受信 (SCOUTED) — 発注者からのスカウトは承諾/辞退が必要なので目立たせる */}
      {scoutedMatches.length > 0 && (
        <section className="mb-8">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg" aria-hidden>📩</span>
              <h2 className="font-bold text-amber-900 text-sm sm:text-base">
                オファー受信 <span className="text-amber-700">({scoutedMatches.length}件)</span>
              </h2>
              <span className="text-xs text-amber-700 ml-auto">承諾/辞退の返信をお願いします</span>
            </div>
            <ul className="space-y-2">
              {scoutedMatches.map((m) => {
                if (!m.project) return null
                return (
                  <li key={m.id}>
                    <Link
                      href="/dashboard/matches"
                      className="block bg-white border border-amber-200 rounded-lg p-3 hover:shadow-sm transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{m.project.title}</p>
                          {m.project.budget && (
                            <p className="text-xs text-gray-500 mt-0.5">¥{m.project.budget.toLocaleString()}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-medium">
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
        {/* 進行中の依頼 (仕事DX) */}
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
                      className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition"
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

        {/* 今週の予定 (掲示板 + カレンダー) */}
        <section>
          <SectionHeader title="今週の予定" href="/dashboard/calendar" hrefLabel="カレンダー" />
          {upcomingEvents.length === 0 ? (
            <EmptyCard>
              今後 7 日以内の予定はありません。
              <div className="mt-2 flex gap-3 justify-center flex-wrap">
                <Link href="/events/new" className="text-purple-700 hover:underline">+ イベント告知</Link>
                <Link href="/artists" className="text-purple-700 hover:underline">アーティストをフォロー</Link>
              </div>
            </EmptyCard>
          ) : (
            <ul className="space-y-2">
              {upcomingEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/events/${e.id}`}
                    className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition"
                  >
                    <div className="flex items-center gap-2 text-xs mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        e.role === 'MINE' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
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
                      <p className="text-xs text-indigo-700 mt-0.5">
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

      {/* 掲載中の案件 */}
      <section className="mb-8">
        <SectionHeader title="掲載中の案件" href="/projects/manage" hrefLabel="管理" />
        {myProjects.length === 0 ? (
          <EmptyCard>
            まだ案件を掲載していません。
            <div className="mt-2">
              <Link href="/projects/new" className="text-purple-700 hover:underline">+ 新しい案件を作成</Link>
            </div>
          </EmptyCard>
        ) : (
          <ul className="space-y-2">
            {myProjects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition"
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
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                      {PROJECT_STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 今月の帳票（受注アーティスト向け）: 支払いが発生したら見積/契約/請求/領収が発行可能 */}
      {thisMonthDocCount > 0 && (
        <section className="mb-8">
          <Link
            href="/dashboard/payouts"
            className="block bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 hover:shadow-sm transition"
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
              <span className="text-purple-600 text-lg">→</span>
            </div>
          </Link>
        </section>
      )}

      {/* クイックアクション */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">クイックアクション</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction href="/projects/new" emoji="📝" title="新規案件" hint="依頼テンプレから開始" />
          <QuickAction href="/events/new" emoji="📢" title="イベント告知" hint="ライブ・セッション・リリース" />
          <QuickAction href="/onboarding" emoji="👥" title="仲間を招待" hint="LINE / メール / QR" />
          <QuickAction href="/dashboard/profile" emoji="🎨" title="プロフィール編集" hint="アイコン・自己紹介・実績" />
        </div>
      </section>
    </div>
  )
}

function StatusCard({
  href, label, value, tone,
}: { href: string; label: string; value: number; tone: 'emerald' | 'purple' | 'red' | 'gray' }) {
  const toneClass = {
    emerald: 'text-emerald-600',
    purple: 'text-purple-600',
    red: 'text-red-500',
    gray: 'text-gray-600',
  }[tone]
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-purple-300 hover:shadow-sm transition"
    >
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
    </Link>
  )
}

function SectionHeader({ title, href, hrefLabel }: { title: string; href: string; hrefLabel: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h2 className="text-base sm:text-lg font-bold text-gray-800">{title}</h2>
      <Link href={href} className="text-xs sm:text-sm text-purple-700 hover:underline">
        {hrefLabel} →
      </Link>
    </div>
  )
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-purple-200 bg-purple-50/40 p-5 text-center text-sm text-gray-600">
      {children}
    </div>
  )
}

function QuickAction({
  href, emoji, title, hint,
}: { href: string; emoji: string; title: string; hint: string }) {
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-sm transition"
    >
      <div className="text-2xl mb-1">{emoji}</div>
      <p className="font-semibold text-sm text-gray-800">{title}</p>
      <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{hint}</p>
    </Link>
  )
}
