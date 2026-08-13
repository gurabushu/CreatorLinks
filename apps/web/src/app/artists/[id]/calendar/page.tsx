// アーティスト個別カレンダー: Phase A.6
// - visibility に応じて閲覧可能なイベントのみ月グリッドで表示
// - ?ym=YYYY-MM で月切替、日番号クリック → イベント詳細一覧を下に展開
// - スタイルは /dashboard/calendar と揃える

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDisplayName } from '@/lib/user'
import { EVENT_TYPE_LABELS, EVENT_VISIBILITY_ICONS } from '@creator-links/shared'
import type { EventType, EventVisibility } from '@creator-links/shared'
import { jstCurrentMonth, jstDateKey, jstParts, jstTime } from '@/lib/jst-date'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ym?: string }>
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

function parseYm(ym: string | undefined): { year: number; month: number } {
  if (ym && /^\d{4}-\d{2}$/.test(ym)) {
    const [y, m] = ym.split('-').map(Number)
    if (m >= 1 && m <= 12) return { year: y, month: m }
  }
  return jstCurrentMonth()
}

function ymString(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

// JST 基準の日付キー
const dateKey = jstDateKey

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

const fmtTime = jstTime

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, displayName: true },
  })
  if (!user) return { title: 'アーティスト' }
  return { title: `${getDisplayName(user)} のカレンダー` }
}

export default async function ArtistCalendarPage({ params, searchParams }: Props) {
  const { id } = await params
  const { ym } = await searchParams
  const session = await auth()

  const artist = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, displayName: true, avatarUrl: true },
  })
  if (!artist) notFound()

  const viewerId = session?.user?.id ?? null
  const isSelf = viewerId === id

  const follows = viewerId && !isSelf
    ? await prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: viewerId, followingId: id },
        },
        select: { id: true },
      })
    : null
  const isFollower = !!follows

  const { year, month } = parseYm(ym)
  const monthStart = new Date(year, month - 1, 1)
  const gridStart = new Date(year, month - 1, 1 - monthStart.getDay())
  const gridEnd = new Date(gridStart)
  gridEnd.setDate(gridStart.getDate() + 41)
  gridEnd.setHours(23, 59, 59, 999)

  // visibility フィルタ構築
  const visibilityOr: Array<Record<string, unknown>> = [{ visibility: 'PUBLIC' }]
  if (isFollower || isSelf) visibilityOr.push({ visibility: 'FOLLOWERS' })
  if (viewerId) {
    visibilityOr.push({
      visibility: 'PARTICIPANTS_ONLY',
      participants: {
        some: {
          userId: viewerId,
          status: { in: ['INVITED', 'CONFIRMED'] },
        },
      },
    })
  }
  if (isSelf) visibilityOr.push({ visibility: 'PRIVATE' })

  const events = await prisma.event.findMany({
    where: {
      AND: [
        {
          OR: [
            { creatorId: id },
            {
              participants: {
                some: {
                  userId: id,
                  status: { in: ['INVITED', 'CONFIRMED'] },
                },
              },
            },
          ],
        },
        { startAt: { gte: gridStart, lte: gridEnd } },
        { status: { in: ['PUBLISHED', 'DRAFT', 'COMPLETED'] } },
        { OR: visibilityOr },
      ],
    },
    select: {
      id: true, title: true, startAt: true, type: true, visibility: true,
      venueName: true, creatorId: true,
    },
    orderBy: { startAt: 'asc' },
  })

  // 日付キー別にグループ化
  const byDate = new Map<string, typeof events>()
  for (const e of events) {
    const k = dateKey(e.startAt)
    if (!byDate.has(k)) byDate.set(k, [])
    byDate.get(k)!.push(e)
  }

  // 6 週 × 7 日のセル配列
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    cells.push(d)
  }

  const today = new Date()
  const todayKey = dateKey(today)
  const prev = shiftMonth(year, month, -1)
  const next = shiftMonth(year, month, 1)

  const monthEvents = events.filter((e) => {
    const p = jstParts(e.startAt)
    return p.year === year && p.month === month
  })

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-10 px-3 sm:px-6">
      <Link
        href={`/artists/${id}`}
        className="inline-flex items-center gap-2 mb-6 text-base sm:text-lg font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 -mx-3 px-4 py-2.5 rounded-xl transition-colors"
      >
        <span aria-hidden className="text-xl leading-none">←</span>
        <span>{getDisplayName(artist)} のプロフィールに戻る</span>
      </Link>

      {/* 誰のカレンダーか大きく表示 */}
      <div className="flex items-center gap-4 mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-purple-50/40 border border-purple-100/70">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-purple-200 overflow-hidden shrink-0">
          {artist.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.avatarUrl}
              alt={getDisplayName(artist)}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-purple-500 uppercase tracking-wider font-semibold">
            Calendar
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-800 truncate">
            {getDisplayName(artist)}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {isSelf
              ? 'すべての公開範囲を表示中'
              : isFollower
                ? 'フォロワー限定を含めて表示中'
                : '公開イベントのみ表示中'}
          </div>
        </div>
        <Link
          href={`/artists/${id}/events`}
          className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-purple-700 bg-white hover:bg-purple-100 border border-purple-200 px-4 py-2 rounded-xl transition-colors shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="4" cy="6" r="1" />
            <circle cx="4" cy="12" r="1" />
            <circle cx="4" cy="18" r="1" />
          </svg>
          <span>リスト表示</span>
        </Link>
      </div>

      {/* 月ナビ */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href={`?ym=${ymString(prev.year, prev.month)}`}
            aria-label="前月"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
          >
            ←
          </Link>
          <Link
            href={`?ym=${ymString(next.year, next.month)}`}
            aria-label="翌月"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
          >
            →
          </Link>
          <Link
            href={`/artists/${id}/calendar`}
            className="ml-1 text-sm px-3 py-1.5 rounded-lg text-purple-600 border border-purple-200 hover:bg-purple-50 transition-colors"
          >
            今日
          </Link>
          <h2 className="ml-2 sm:ml-3 text-xl sm:text-2xl font-bold text-gray-800">
            {year}年 {month}月
          </h2>
        </div>
        <Link
          href={`/artists/${id}/events`}
          className="sm:hidden text-sm text-purple-700 hover:underline"
        >
          リスト表示 →
        </Link>
      </div>

      {/* 曜日行 */}
      <div className="grid grid-cols-7 text-center text-xs sm:text-sm border border-purple-100/60 rounded-t-xl overflow-hidden bg-gradient-to-b from-purple-50/60 to-white">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`py-2 font-semibold ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 grid-rows-6 border-l border-r border-b border-purple-100/60 rounded-b-xl overflow-hidden">
        {cells.map((d, idx) => {
          const inMonth = d.getMonth() + 1 === month
          const k = dateKey(d)
          const isToday = k === todayKey
          const dow = d.getDay()
          const dayEvents = byDate.get(k) ?? []
          const visible = dayEvents.slice(0, 3)
          const overflow = dayEvents.length - visible.length
          return (
            <div
              key={k}
              className={`min-h-[92px] sm:min-h-[112px] border-t border-purple-100/60 ${
                idx % 7 !== 0 ? 'border-l' : ''
              } p-1 sm:p-1.5 flex flex-col gap-1 ${
                inMonth ? 'bg-white' : 'bg-gray-50/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs sm:text-sm w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-purple-600 text-white font-bold'
                      : !inMonth
                        ? 'text-gray-300'
                        : dow === 0
                          ? 'text-red-500'
                          : dow === 6
                            ? 'text-blue-500'
                            : 'text-gray-700'
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
              <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                {visible.map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    title={`${fmtTime(e.startAt)} ${e.title}`}
                    className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded truncate transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200 ${!inMonth ? 'opacity-60' : ''}`}
                  >
                    <span className="font-medium mr-1">{fmtTime(e.startAt)}</span>
                    <span aria-hidden className="mr-0.5">
                      {EVENT_VISIBILITY_ICONS[e.visibility as EventVisibility]}
                    </span>
                    {e.title}
                  </Link>
                ))}
                {overflow > 0 && (
                  <div className="text-[10px] text-gray-500 px-1">+{overflow} 件</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 当月イベントリスト */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          {month}月のイベント（{monthEvents.length}件）
        </h2>
        {monthEvents.length === 0 ? (
          <p className="text-sm text-gray-500">この月にイベントはありません。</p>
        ) : (
          <ul className="space-y-2">
            {monthEvents.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/events/${e.id}`}
                  className="block rounded-xl border border-gray-200 bg-white hover:shadow-sm transition p-3"
                >
                  <div className="flex items-center gap-2 text-xs text-purple-700 mb-1 flex-wrap">
                    {(() => {
                      const p = jstParts(e.startAt)
                      return <span>{String(p.month).padStart(2, '0')}/{String(p.day).padStart(2, '0')}</span>
                    })()}
                    <span>{fmtTime(e.startAt)}</span>
                    <span>·</span>
                    <span>{EVENT_TYPE_LABELS[e.type as EventType]}</span>
                    {e.venueName && (
                      <>
                        <span>·</span>
                        <span>{e.venueName}</span>
                      </>
                    )}
                    <span className="ml-auto text-gray-500">
                      {EVENT_VISIBILITY_ICONS[e.visibility as EventVisibility]}
                    </span>
                  </div>
                  <div className="font-medium text-gray-900 line-clamp-1">{e.title}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
