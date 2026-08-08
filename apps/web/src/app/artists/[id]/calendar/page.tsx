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
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function ymString(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function fmtTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

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

  const monthEvents = events.filter(
    (e) => e.startAt.getFullYear() === year && e.startAt.getMonth() + 1 === month,
  )

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-10 px-3 sm:px-6">
      <Link
        href={`/artists/${id}`}
        className="inline-flex items-center gap-2 mb-4 text-sm text-purple-700 hover:underline"
      >
        ← {getDisplayName(artist)} のプロフィール
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href={`?ym=${ymString(prev.year, prev.month)}`}
            aria-label="前月"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-purple-600 hover:bg-purple-50"
          >
            ←
          </Link>
          <Link
            href={`?ym=${ymString(next.year, next.month)}`}
            aria-label="翌月"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-purple-600 hover:bg-purple-50"
          >
            →
          </Link>
          <Link
            href={`/artists/${id}/calendar`}
            className="ml-1 text-sm px-3 py-1.5 rounded-lg text-purple-600 border border-purple-200 hover:bg-purple-50"
          >
            今日
          </Link>
          <h1 className="ml-2 text-xl sm:text-2xl font-bold text-gray-800">
            {year}年 {month}月
          </h1>
        </div>
        <Link
          href={`/artists/${id}/events`}
          className="text-sm text-purple-700 hover:underline"
        >
          リスト表示 →
        </Link>
      </div>

      <p className="text-xs text-gray-500 mb-5">
        {getDisplayName(artist)} のカレンダー ·{' '}
        {isSelf
          ? 'すべての公開範囲を表示'
          : isFollower
            ? 'フォロワー限定を含む'
            : 'PUBLIC のみ表示'}
      </p>

      {/* 曜日行 */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-xl overflow-hidden border border-gray-200">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`bg-white text-center text-xs py-2 font-medium ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border-x border-b border-gray-200 rounded-b-xl overflow-hidden">
        {cells.map((d) => {
          const inMonth = d.getMonth() + 1 === month
          const k = dateKey(d)
          const isToday = k === todayKey
          const dayEvents = byDate.get(k) ?? []
          return (
            <div
              key={k}
              className={`bg-white min-h-[80px] sm:min-h-[100px] p-1.5 text-xs ${
                inMonth ? '' : 'bg-gray-50'
              }`}
            >
              <div
                className={`text-right mb-1 ${
                  isToday
                    ? 'inline-block bg-purple-600 text-white rounded-full w-6 h-6 text-center leading-6 font-bold'
                    : inMonth
                      ? d.getDay() === 0
                        ? 'text-red-500'
                        : d.getDay() === 6
                          ? 'text-blue-500'
                          : 'text-gray-700'
                      : 'text-gray-400'
                }`}
              >
                {d.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    className="block bg-purple-100 text-purple-700 rounded px-1 py-0.5 truncate hover:bg-purple-200"
                    title={e.title}
                  >
                    {EVENT_VISIBILITY_ICONS[e.visibility as EventVisibility]}{' '}
                    {e.title}
                  </Link>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-gray-500 px-1">
                    +{dayEvents.length - 3}件
                  </div>
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
                    <span>{String(e.startAt.getMonth() + 1).padStart(2, '0')}/{String(e.startAt.getDate()).padStart(2, '0')}</span>
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
