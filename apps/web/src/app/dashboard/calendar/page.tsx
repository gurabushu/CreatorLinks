// カレンダー: 月ビュー（Google カレンダー風グリッド）
// - ?ym=YYYY-MM で表示月を切替（省略時は当月）
// - 7 曜 × 6 週の grid、当日ハイライト、前後月はグレー
// - 各セルにロール色付き event pill、溢れは "+N 件"
// - 日番号クリック → /events/new?date=YYYY-MM-DD、pill クリック → /events/[id]
// - グリッド下に今後のイベントリスト（アジェンダ）も残す

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDisplayName } from '@/lib/user'
import { EVENT_TYPE_LABELS } from '@creator-links/shared'
import type { EventType } from '@creator-links/shared'
import {
  jstCurrentMonth,
  jstDateKey,
  jstParts,
  jstTime,
} from '@/lib/jst-date'

type View = 'mine' | 'following'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'カレンダー' }

type Artist = {
  id: string
  name: string
  displayName: string | null
  avatarUrl: string | null
}

type EventSummary = {
  id: string
  title: string
  startAt: Date
  type: string
  venueName: string | null
  city: string | null
  creator?: Artist
}

type Role =
  | 'ORGANIZER'
  | 'PERFORMER'
  | 'STAFF'
  | 'GUEST'
  | 'AUDIENCE'
  | 'FOLLOWING'
  | 'PROJECT' // Match ACCEPTED (Project.scheduledStartAt) 案件予定
type Entry = { event: EventSummary; role: Role; href: string }

const ROLE_LABELS: Record<Role, string> = {
  ORGANIZER: '主催',
  PERFORMER: '出演',
  STAFF: 'スタッフ',
  GUEST: 'ゲスト',
  AUDIENCE: '観覧',
  FOLLOWING: 'フォロー中',
  PROJECT: '案件',
}

// カレンダーセル内 pill 用（軽め）
const ROLE_PILL: Record<Role, string> = {
  ORGANIZER: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  PERFORMER: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
  STAFF: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
  GUEST: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
  AUDIENCE: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
  FOLLOWING: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
  PROJECT: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
}

// アジェンダ用（濃さ調整）
const ROLE_BADGE: Record<Role, string> = {
  ORGANIZER: 'bg-slate-100 text-slate-700',
  PERFORMER: 'bg-zinc-100 text-zinc-700',
  STAFF: 'bg-zinc-100 text-zinc-700',
  GUEST: 'bg-zinc-100 text-zinc-700',
  AUDIENCE: 'bg-zinc-100 text-zinc-700',
  FOLLOWING: 'bg-zinc-100 text-zinc-700',
  PROJECT: 'bg-zinc-100 text-zinc-700',
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const
const PRIORITY: Record<Role, number> = {
  ORGANIZER: 0,
  PROJECT: 1, // 確定した案件は自分の予定として最優先レベル
  PERFORMER: 2,
  STAFF: 3,
  GUEST: 4,
  AUDIENCE: 5,
  FOLLOWING: 6,
}

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

// カレンダーの日付キー。JST 基準で "YYYY-MM-DD"。
const dateKey = jstDateKey

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

const fmtTime = jstTime

function fmtDate(d: Date) {
  const p = jstParts(d)
  return `${String(p.month).padStart(2, '0')}/${String(p.day).padStart(2, '0')} (${WEEKDAYS[p.weekday]}) ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; view?: string; artists?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/auth')

  const { ym, view: rawView, artists: artistsParam } = await searchParams
  const view: View = rawView === 'following' ? 'following' : 'mine'
  const { year, month } = parseYm(ym)

  // 選択されたアーティスト ID (フォロー中ビュー専用の絞り込み)
  const selectedArtistIds = artistsParam
    ? artistsParam.split(',').filter(Boolean)
    : []
  const selectedSet = new Set(selectedArtistIds)

  // フォロー中ビューで表示する「絞り込みチップ」用に、フォロー中アーティストのプロフィールを取得
  let followedArtists: Artist[] = []

  // グリッドの表示範囲: 月初の日の週の日曜 〜 6 週後の土曜（42 セル）
  const monthStart = new Date(year, month - 1, 1)
  const gridStart = new Date(year, month - 1, 1 - monthStart.getDay())
  const gridEnd = new Date(gridStart)
  gridEnd.setDate(gridStart.getDate() + 41) // 42 セル = 6 週
  gridEnd.setHours(23, 59, 59, 999)

  let entries: Entry[]

  if (view === 'following') {
    const follows = await prisma.follow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    })
    const followingIds = follows.map((f) => f.followingId)

    // フィルタ UI 用: フォロー中の全員 (アバター含む)
    if (followingIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: followingIds } },
        select: { id: true, name: true, displayName: true, avatarUrl: true },
        orderBy: { name: 'asc' },
      })
      followedArtists = users
    }

    // イベント取得 (artists 選択があれば絞り込み)
    const effectiveIds = selectedArtistIds.length > 0
      ? followingIds.filter((id) => selectedSet.has(id))
      : followingIds

    const followingEvents = effectiveIds.length === 0
      ? []
      : await prisma.event.findMany({
          where: {
            creatorId: { in: effectiveIds },
            status: 'PUBLISHED',
            visibility: { in: ['PUBLIC', 'FOLLOWERS'] },
            startAt: { gte: gridStart, lte: gridEnd },
          },
          orderBy: { startAt: 'asc' },
          select: {
            id: true, title: true, startAt: true, type: true, venueName: true, city: true,
            creator: {
              select: { id: true, name: true, displayName: true, avatarUrl: true },
            },
          },
        })

    entries = followingEvents.map((e) => ({
      event: e,
      role: 'FOLLOWING' as const,
      href: `/events/${e.id}`,
    }))
  } else {
    const [created, participations, interests, projectMatches] = await Promise.all([
      prisma.event.findMany({
        where: {
          creatorId: session.user.id,
          startAt: { gte: gridStart, lte: gridEnd },
          status: { in: ['PUBLISHED', 'DRAFT'] },
        },
        select: {
          id: true, title: true, startAt: true, type: true, venueName: true, city: true,
        },
      }),
      prisma.eventParticipant.findMany({
        where: {
          userId: session.user.id,
          status: 'CONFIRMED',
          event: { startAt: { gte: gridStart, lte: gridEnd } },
        },
        include: {
          event: {
            select: {
              id: true, title: true, startAt: true, type: true, venueName: true, city: true,
            },
          },
        },
      }),
      prisma.eventInterest.findMany({
        where: {
          userId: session.user.id,
          isAttending: true,
          event: { startAt: { gte: gridStart, lte: gridEnd }, status: 'PUBLISHED' },
        },
        include: {
          event: {
            select: {
              id: true, title: true, startAt: true, type: true, venueName: true, city: true,
            },
          },
        },
      }),
      // Match ACCEPTED (発注/受注どちらでも) + Project.scheduledStartAt がグリッド範囲内
      // 案件確定 = カレンダーに自動反映される、というプロダクト方針
      prisma.match.findMany({
        where: {
          status: { in: ['ACCEPTED', 'COMPLETED'] },
          project: { scheduledStartAt: { gte: gridStart, lte: gridEnd } },
          OR: [
            { artistId: session.user.id },
            { project: { clientId: session.user.id } },
          ],
        },
        select: {
          id: true,
          project: {
            select: {
              id: true,
              title: true,
              scheduledStartAt: true,
              scheduledEndAt: true,
            },
          },
        },
      }),
    ])

    const merged: Entry[] = [
      ...created.map((e) => ({
        event: e,
        role: 'ORGANIZER' as const,
        href: `/events/${e.id}`,
      })),
      ...participations.map((p) => ({
        event: p.event,
        role: p.role as Role,
        href: `/events/${p.event.id}`,
      })),
      ...interests.map((i) => ({
        event: i.event,
        role: 'AUDIENCE' as const,
        href: `/events/${i.event.id}`,
      })),
      ...projectMatches
        .filter((m) => m.project?.scheduledStartAt)
        .map((m) => ({
          event: {
            id: m.id, // Match id, カレンダー内キーとして使用
            title: m.project!.title,
            startAt: m.project!.scheduledStartAt!,
            type: 'PROJECT' as string, // アジェンダ EVENT_TYPE_LABELS に載らないが type ラベル出しは条件分岐
            venueName: null,
            city: null,
          },
          role: 'PROJECT' as const,
          href: `/dashboard/chat/${m.id}`,
        })),
    ]

    // 同一イベントは高優先度ロール（主催 > 出演 > その他）で 1 件に集約
    const dedup = new Map<string, Entry>()
    for (const entry of merged) {
      const existing = dedup.get(entry.event.id)
      if (!existing || PRIORITY[entry.role] < PRIORITY[existing.role]) {
        dedup.set(entry.event.id, entry)
      }
    }
    entries = Array.from(dedup.values()).sort(
      (a, b) => a.event.startAt.getTime() - b.event.startAt.getTime(),
    )
  }

  // 日付キー別にグループ化
  const byDate = new Map<string, Entry[]>()
  for (const entry of entries) {
    const k = dateKey(entry.event.startAt)
    if (!byDate.has(k)) byDate.set(k, [])
    byDate.get(k)!.push(entry)
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

  // アジェンダ: 当月に startAt があるものだけを昇順で (JST 基準)
  const monthEntries = entries.filter((e) => {
    const p = jstParts(e.event.startAt)
    return p.year === year && p.month === month
  })

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-10 px-3 sm:px-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href={`?ym=${ymString(prev.year, prev.month)}${view === 'following' ? '&view=following' : ''}`}
            aria-label="前月"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            ←
          </Link>
          <Link
            href={`?ym=${ymString(next.year, next.month)}${view === 'following' ? '&view=following' : ''}`}
            aria-label="翌月"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            →
          </Link>
          <Link
            href={`/dashboard/calendar${view === 'following' ? '?view=following' : ''}`}
            className="ml-1 text-sm px-3 py-1.5 rounded-lg text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            今日
          </Link>
          <h1 className="ml-2 sm:ml-3 text-xl sm:text-2xl font-bold text-gray-800">
            {year}年 {month}月
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/events" className="text-sm text-slate-700 hover:underline">
            全イベント一覧 →
          </Link>
          <Link
            href="/events/new"
            className="text-sm bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            + 新規
          </Link>
        </div>
      </div>

      {/* ビュー切替タブ */}
      <div className="mb-4 inline-flex rounded-lg border border-slate-100 bg-white p-0.5 text-sm">
        <Link
          href={`?ym=${ymString(year, month)}`}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            view === 'mine'
              ? 'bg-slate-600 text-white'
              : 'text-gray-600 hover:bg-slate-50'
          }`}
        >
          自分の予定
        </Link>
        <Link
          href={`?ym=${ymString(year, month)}&view=following`}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            view === 'following'
              ? 'bg-slate-600 text-white'
              : 'text-gray-600 hover:bg-slate-50'
          }`}
        >
          フォロー中
        </Link>
      </div>

      {/* フォロー中ビュー: アーティスト絞り込みチップ */}
      {view === 'following' && followedArtists.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="text-xs font-medium text-gray-600">
              表示するアーティスト
              {selectedArtistIds.length > 0 && (
                <span className="ml-1.5 text-slate-700 font-semibold">({selectedArtistIds.length} 人選択中)</span>
              )}
            </p>
            {selectedArtistIds.length > 0 && (
              <Link
                href={`?ym=${ymString(year, month)}&view=following`}
                className="text-[11px] text-slate-700 hover:underline"
              >
                すべて表示に戻す
              </Link>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {followedArtists.map((a) => {
              const selected = selectedSet.has(a.id)
              const nextIds = selected
                ? selectedArtistIds.filter((id) => id !== a.id)
                : [...selectedArtistIds, a.id]
              const nextParam = nextIds.length > 0 ? `&artists=${nextIds.join(',')}` : ''
              return (
                <Link
                  key={a.id}
                  href={`?ym=${ymString(year, month)}&view=following${nextParam}`}
                  className={`shrink-0 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs transition ${
                    selected
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-slate-300'
                  }`}
                >
                  {a.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${selected ? 'bg-white/20' : 'bg-slate-100 text-slate-700'}`}>
                      {getDisplayName(a).slice(0, 1)}
                    </span>
                  )}
                  <span className="whitespace-nowrap max-w-[8rem] truncate">{getDisplayName(a)}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 text-center text-xs sm:text-sm border border-slate-100/60 rounded-t-xl overflow-hidden bg-gradient-to-b from-slate-50/60 to-white">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`py-2 font-semibold ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-zinc-500' : 'text-gray-600'
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 月グリッド (ブランド透かし付き) */}
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/calendar-watermark.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto w-1/2 max-w-md opacity-45 select-none z-10"
        />
      <div className="grid grid-cols-7 grid-rows-6 border-l border-r border-b border-slate-100/60 rounded-b-xl overflow-hidden">
        {cells.map((d, idx) => {
          const k = dateKey(d)
          const inMonth = d.getMonth() + 1 === month
          const isToday = k === todayKey
          const dow = d.getDay()
          const dayEntries = byDate.get(k) ?? []
          const visible = dayEntries.slice(0, 3)
          const overflow = dayEntries.length - visible.length

          return (
            <div
              key={idx}
              className={`min-h-[92px] sm:min-h-[112px] border-t border-slate-100/60 ${
                idx % 7 !== 0 ? 'border-l' : ''
              } p-1 sm:p-1.5 flex flex-col gap-1 ${
                inMonth ? 'bg-white' : 'bg-gray-50/70'
              }`}
            >
              {/* 日番号（クリックで新規作成へ） */}
              <div className="flex items-center justify-between">
                <Link
                  href={`/events/new?date=${k}`}
                  aria-label={`${d.getMonth() + 1}月${d.getDate()}日に新規イベント作成`}
                  className={`text-xs sm:text-sm w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                    isToday
                      ? 'bg-slate-600 text-white font-bold hover:bg-slate-700'
                      : !inMonth
                        ? 'text-gray-300 hover:bg-slate-50 hover:text-slate-600'
                        : dow === 0
                          ? 'text-red-500 hover:bg-slate-50'
                          : dow === 6
                            ? 'text-zinc-500 hover:bg-slate-50'
                            : 'text-gray-700 hover:bg-slate-50'
                  }`}
                >
                  {d.getDate()}
                </Link>
              </div>

              {/* イベント pill */}
              <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                {visible.map((entry) => {
                  const artistName = entry.event.creator
                    ? getDisplayName(entry.event.creator)
                    : null
                  return (
                    <Link
                      key={entry.event.id}
                      href={entry.href}
                      title={`${fmtTime(entry.event.startAt)} ${artistName ? `[${artistName}] ` : ''}${entry.event.title}`}
                      className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded truncate transition-colors ${
                        ROLE_PILL[entry.role]
                      } ${!inMonth ? 'opacity-60' : ''}`}
                    >
                      <span className="font-medium mr-1">{fmtTime(entry.event.startAt)}</span>
                      {artistName && (
                        <span className="font-semibold mr-1">{artistName}</span>
                      )}
                      {entry.event.title}
                    </Link>
                  )
                })}
                {overflow > 0 && (
                  <div className="text-[10px] text-gray-500 px-1">+{overflow} 件</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </div>

      {/* 凡例 */}
      <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px] text-gray-500">
        <span>{view === 'following' ? '種別:' : 'ロール:'}</span>
        {(view === 'following'
          ? (['FOLLOWING'] as Role[])
          : (['ORGANIZER', 'PROJECT', 'PERFORMER', 'STAFF', 'GUEST', 'AUDIENCE'] as Role[])
        ).map((r) => (
          <span key={r} className={`px-1.5 py-0.5 rounded ${ROLE_BADGE[r]}`}>
            {ROLE_LABELS[r]}
          </span>
        ))}
      </div>

      {/* アジェンダ（当月のみ） */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">
          {year}年 {month}月のアジェンダ
        </h2>
        {monthEntries.length === 0 ? (
          <div className="rounded-xl border border-slate-100/60 bg-slate-50/30 p-6 text-center text-sm text-gray-600">
            {view === 'following'
              ? 'フォロー中のアーティストからの公開イベントはまだありません。'
              : 'この月の予定はまだありません。'}
            <p className="mt-2">
              <Link href="/events" className="text-slate-700 hover:underline">
                イベントを探す →
              </Link>
              {view === 'mine' && (
                <>
                  <span className="mx-2 text-gray-400">|</span>
                  <Link href="/events/new" className="text-slate-700 hover:underline">
                    新規作成 →
                  </Link>
                </>
              )}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {monthEntries.map((entry) => {
              const artistName = entry.event.creator
                ? getDisplayName(entry.event.creator)
                : null
              return (
                <li key={entry.event.id}>
                  <Link
                    href={entry.href}
                    className="block rounded-xl border border-slate-100/60 bg-white hover:shadow-sm hover:shadow-slate-200/40 transition p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[entry.role]}`}>
                        {ROLE_LABELS[entry.role]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 mb-1">
                          {fmtDate(entry.event.startAt)}
                          <span className="mx-1">·</span>
                          {entry.role === 'PROJECT'
                            ? '受注案件'
                            : EVENT_TYPE_LABELS[entry.event.type as EventType]}
                          {entry.event.venueName && (
                            <>
                              <span className="mx-1">·</span>
                              <span>{entry.event.venueName}</span>
                            </>
                          )}
                        </div>
                        {artistName && (
                          <div className="text-xs text-zinc-700 mb-0.5">
                            {artistName}
                          </div>
                        )}
                        <div className="font-medium text-gray-800 line-clamp-1">
                          {entry.event.title}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
