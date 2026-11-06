// イベント一覧（公開）
// - searchParams で絞り込み・並び替え
// - 大きめアイキャッチで視認性 UP

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { EVENT_TYPE_LABELS, EVENT_TYPES } from '@creator-links/shared'
import type { EventType } from '@creator-links/shared'
import { getDisplayName } from '@/lib/user'
import { jstDatetime } from '@/lib/jst-date'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'イベント一覧',
  alternates: { canonical: '/events' },
}

const formatDate = jstDatetime

type Search = {
  q?: string
  type?: string
  genre?: string
  city?: string
  place?: string      // 'all' | 'offline' | 'online'
  fee?: string        // 'all' | 'free' | 'paid'
  followed?: string   // 'true'
  sort?: string       // 'date' | 'new' | 'popular'
}

function sanitizeType(v?: string): EventType | undefined {
  if (!v) return undefined
  return (EVENT_TYPES as readonly string[]).includes(v) ? (v as EventType) : undefined
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const session = await auth()
  const now = new Date()
  const sp = await searchParams

  const q = (sp.q ?? '').trim()
  const type = sanitizeType(sp.type)
  const genre = (sp.genre ?? '').trim()
  const city = (sp.city ?? '').trim()
  const place = sp.place ?? 'all'
  const fee = sp.fee ?? 'all'
  const followedOnly = sp.followed === 'true'
  const sort = sp.sort ?? 'date'

  const followRows = session?.user?.id
    ? await prisma.follow.findMany({
        where: { followerId: session.user.id },
        select: { followingId: true },
      })
    : []
  const myFollowingIds = new Set(followRows.map((f) => f.followingId))

  const where: Prisma.EventWhereInput = {
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    OR: [{ startAt: { gte: now } }, { endAt: { gte: now } }],
  }
  const andConds: Prisma.EventWhereInput[] = []

  if (q) {
    andConds.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { venueName: { contains: q, mode: 'insensitive' } },
      ],
    })
  }
  if (type) andConds.push({ type })
  if (genre) andConds.push({ genres: { has: genre } })
  if (city) andConds.push({ city: { contains: city, mode: 'insensitive' } })
  if (place === 'offline') andConds.push({ isOnline: false })
  if (place === 'online') andConds.push({ isOnline: true })
  if (fee === 'free') andConds.push({ isFree: true })
  if (fee === 'paid') andConds.push({ isFree: false })
  if (followedOnly && myFollowingIds.size > 0) {
    andConds.push({ creatorId: { in: Array.from(myFollowingIds) } })
  }
  if (andConds.length > 0) where.AND = andConds

  const orderBy: Prisma.EventOrderByWithRelationInput | Prisma.EventOrderByWithRelationInput[] =
    sort === 'new'
      ? { createdAt: 'desc' }
      : sort === 'popular'
        ? [{ interests: { _count: 'desc' } }, { startAt: 'asc' }]
        : { startAt: 'asc' }

  const events = await prisma.event.findMany({
    where,
    take: 60,
    orderBy,
    include: {
      creator: {
        select: { id: true, name: true, displayName: true, avatarUrl: true },
      },
      _count: { select: { openRoles: true, participants: true, interests: true } },
    },
  })

  // 人気ジャンル候補 (絞り込みの suggest 用)
  const allGenres = Array.from(
    new Set(events.flatMap((e) => e.genres)),
  ).sort()

  const hasAnyFilter =
    !!q || !!type || !!genre || !!city || place !== 'all' || fee !== 'all' || followedOnly || sort !== 'date'

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-12 px-4">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">イベント一覧</h1>
          <p className="text-sm text-gray-500 mt-1">
            音楽業界のライブ・セッション・レコーディング等を告知
          </p>
        </div>
        {session && (
          <Link
            href="/events/new"
            className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition whitespace-nowrap"
          >
            + 新規作成
          </Link>
        )}
      </div>

      {/* フィルタ / 並び替え */}
      <form
        method="GET"
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3 shadow-sm"
      >
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <div className="sm:col-span-6">
            <label className="block text-xs font-medium text-gray-600 mb-1">キーワード</label>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="タイトル・会場名・説明から検索"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">種別</label>
            <select
              name="type"
              defaultValue={type ?? ''}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
            >
              <option value="">すべて</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">ジャンル</label>
            <input
              type="text"
              name="genre"
              defaultValue={genre}
              placeholder="例: ジャズ"
              list="genre-suggest"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
            />
            {allGenres.length > 0 && (
              <datalist id="genre-suggest">
                {allGenres.map((g) => <option key={g} value={g} />)}
              </datalist>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">開催地 (市区町村)</label>
            <input
              type="text"
              name="city"
              defaultValue={city}
              placeholder="例: 下北沢・渋谷・新宿"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">開催形式</label>
            <select
              name="place"
              defaultValue={place}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
            >
              <option value="all">すべて</option>
              <option value="offline">会場</option>
              <option value="online">オンライン</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">料金</label>
            <select
              name="fee"
              defaultValue={fee}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
            >
              <option value="all">すべて</option>
              <option value="free">無料</option>
              <option value="paid">有料</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">並び替え</label>
            <select
              name="sort"
              defaultValue={sort}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
            >
              <option value="date">開催日が近い順</option>
              <option value="new">新着順</option>
              <option value="popular">人気順 (行きたい数)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
          {session ? (
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="followed"
                value="true"
                defaultChecked={followedOnly}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              フォロー中のアーティストのみ
            </label>
          ) : <span />}

          <div className="flex gap-2 ml-auto">
            {hasAnyFilter && (
              <Link
                href="/events"
                className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                リセット
              </Link>
            )}
            <button
              type="submit"
              className="text-sm px-5 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700"
            >
              絞り込む
            </button>
          </div>
        </div>
      </form>

      {events.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600">
          {hasAnyFilter
            ? '該当するイベントが見つかりませんでした。条件を変えてお試しください。'
            : '公開中のイベントはまだありません。'}
          {session && !hasAnyFilter && (
            <p className="mt-2">
              <Link href="/events/new" className="text-purple-700 hover:underline">
                最初のイベントを作成する →
              </Link>
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3">{events.length} 件</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {events.map((e) => {
              const isFollowed = myFollowingIds.has(e.creator.id)
              return (
                <li
                  key={e.id}
                  className={`rounded-2xl border bg-white overflow-hidden hover:shadow-lg transition ${
                    isFollowed ? 'border-purple-300' : 'border-gray-200'
                  }`}
                >
                  <Link href={`/events/${e.id}`} className="block">
                    {/* アイキャッチ: 16:9 大きめ */}
                    <div className={`relative w-full aspect-[16/9] ${e.coverUrl ? '' : 'bg-gradient-to-br from-purple-100 via-purple-50 to-zinc-100'}`}>
                      {e.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={e.coverUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-purple-300 text-5xl font-bold">
                          {EVENT_TYPE_LABELS[e.type as EventType].slice(0, 2)}
                        </div>
                      )}
                      {/* 種別チップ (右上) */}
                      <span className="absolute top-3 right-3 text-xs font-bold bg-white/95 text-gray-800 px-2.5 py-1 rounded-full shadow-sm">
                        {EVENT_TYPE_LABELS[e.type as EventType]}
                      </span>
                      {/* フォロー中バッジ (左上) */}
                      {isFollowed && (
                        <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-xs font-bold text-white bg-purple-600/95 px-2.5 py-1 rounded-full shadow-sm">
                          <span aria-hidden>★</span>
                          フォロー中
                        </span>
                      )}
                    </div>

                    <div className="p-4 sm:p-5">
                      <div className="flex items-center gap-2 mb-2 text-xs text-purple-700 flex-wrap">
                        <span className="font-medium">{formatDate(e.startAt)}</span>
                        {e.venueName && (
                          <>
                            <span>·</span>
                            <span className="truncate">{e.venueName}</span>
                          </>
                        )}
                        {e.isOnline && (
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">オンライン</span>
                        )}
                        {e.isFree && (
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">無料</span>
                        )}
                      </div>
                      <h2 className="font-bold text-base sm:text-lg text-gray-900 mb-1.5 line-clamp-2">
                        {e.title}
                      </h2>
                      <p className={`text-xs line-clamp-1 ${isFollowed ? 'text-purple-700 font-medium' : 'text-gray-500'}`}>
                        主催 {getDisplayName(e.creator)}
                      </p>
                      {e.genres.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {e.genres.slice(0, 3).map((g) => (
                            <span key={g} className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-500">
                        {e._count.openRoles > 0 && (
                          <span>出演・スタッフ募集 {e._count.openRoles} 件</span>
                        )}
                        {e._count.participants > 0 && (
                          <span>出演者 {e._count.participants} 名</span>
                        )}
                        {e._count.interests > 0 && (
                          <span>行きたい {e._count.interests} 名</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
