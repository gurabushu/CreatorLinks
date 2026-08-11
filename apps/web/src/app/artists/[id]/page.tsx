// app/artists/[id]/page.tsx — アーティスト詳細 (SSR)
// OGP動的生成 / ポートフォリオギャラリー / レビュー

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDisplayName } from '@/lib/user'
import { PortfolioGallery } from './portfolio-gallery'
import { FoundingMemberBadge } from '@/components/early-bird/founding-member-badge'
import { ProfileFacts } from '@/components/artist/profile-facts'
import { FollowButton, FollowerCountBadge } from './follow-button'
import { ArtistLikeButton } from './like-button'
import {
  EVENT_TYPE_LABELS,
  EVENT_VISIBILITY_ICONS,
} from '@creator-links/shared'
import type { EventType, EventVisibility } from '@creator-links/shared'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { name: true, displayName: true, bio: true, avatarUrl: true },
    })
    if (!user) return { title: 'アーティストが見つかりません' }
    const displayName = getDisplayName(user)
    return {
      title: `${displayName} | アーティストプロフィール`,
      description: user.bio ?? `${displayName} のポートフォリオ・実績をチェック`,
      openGraph: {
        images: user.avatarUrl ? [{ url: user.avatarUrl }] : [],
      },
    }
  } catch {
    return { title: 'アーティストプロフィール' }
  }
}

export default async function ArtistDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = null
  try {
    user = await prisma.user.findUnique({
      where: { id },
      include: {
        portfolios: { orderBy: { createdAt: 'desc' } },
        reviewsGiven: false,
        featuredEntry: {
          select: { note: true, expiresAt: true },
        },
      },
      omit: { passwordHash: true },
    })
  } catch {
    notFound()
  }

  if (!user) notFound()

  // Phase A.6: フォロー状態・フォロワー数 + Like 状態
  const viewerId = session?.user?.id ?? null
  const isSelf = viewerId === id
  const [followerCount, initialIsFollowing, initialLiked] = await Promise.all([
    prisma.follow.count({ where: { followingId: id } }),
    viewerId && !isSelf
      ? prisma.follow
          .findUnique({
            where: {
              followerId_followingId: { followerId: viewerId, followingId: id },
            },
            select: { id: true },
          })
          .then((f) => !!f)
      : Promise.resolve(false),
    viewerId && !isSelf
      ? prisma.like
          .findUnique({
            where: { likerId_likedId: { likerId: viewerId, likedId: id } },
            select: { id: true },
          })
          .then((l) => !!l)
      : Promise.resolve(false),
  ])
  const isFollower = initialIsFollowing

  // 今後のイベント（visibility に応じて）
  const eventVisibilityOr: Array<Record<string, unknown>> = [{ visibility: 'PUBLIC' }]
  if (isFollower || isSelf) eventVisibilityOr.push({ visibility: 'FOLLOWERS' })
  if (viewerId) {
    eventVisibilityOr.push({
      visibility: 'PARTICIPANTS_ONLY',
      participants: {
        some: {
          userId: viewerId,
          status: { in: ['INVITED', 'CONFIRMED'] } as const,
        },
      },
    })
  }
  if (isSelf) eventVisibilityOr.push({ visibility: 'PRIVATE' })

  const upcomingEvents = await prisma.event.findMany({
    where: {
      AND: [
        {
          OR: [
            { creatorId: id },
            {
              participants: {
                some: {
                  userId: id,
                  status: { in: ['INVITED', 'CONFIRMED'] } as const,
                },
              },
            },
          ],
        },
        { status: 'PUBLISHED' },
        { startAt: { gte: new Date() } },
        { OR: eventVisibilityOr },
      ],
    },
    take: 5,
    orderBy: { startAt: 'asc' },
    select: {
      id: true, title: true, startAt: true, type: true, visibility: true,
      venueName: true,
    },
  })

  const isFeatured =
    !!user.featuredEntry &&
    (!user.featuredEntry.expiresAt || user.featuredEntry.expiresAt.getTime() > Date.now())

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4">
      <Link
        href="/artists"
        className="inline-flex items-center gap-2 mb-6 text-base sm:text-lg font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 -mx-3 px-4 py-2.5 rounded-xl transition-colors"
      >
        <span aria-hidden className="text-xl leading-none">←</span>
        <span>アーティスト一覧に戻る</span>
      </Link>
      {isFeatured && (
        <div className="mb-4 flex items-center gap-2 text-xs sm:text-sm bg-purple-50 border border-purple-200 text-purple-800 rounded-lg px-3 py-2">
          <span className="font-bold text-[10px] sm:text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full shrink-0">
            公式ピックアップ中
          </span>
          {user.featuredEntry?.note && (
            <span className="italic truncate">「{user.featuredEntry.note}」</span>
          )}
        </div>
      )}
      {/* プロフィールヘッダー */}
      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-purple-200 overflow-hidden shrink-0">
          {user.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={getDisplayName(user)} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold break-words">{getDisplayName(user)}</h1>
            {user.role === 'PRO' && (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-bold shrink-0">
                PRO
              </span>
            )}
            <FoundingMemberBadge slot={user.earlyBirdSlot} size="md" />
          </div>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {user.genres.map((g: string) => (
              <span key={g} className="bg-gray-100 text-gray-600 text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 rounded">
                {g}
              </span>
            ))}
          </div>
          {(user.gender != null || user.heightCm != null || user.activityYears != null) && (
            <div className="mt-3">
              <ProfileFacts
                gender={user.gender}
                heightCm={user.heightCm}
                activityYears={user.activityYears}
                size="md"
              />
            </div>
          )}
          {user.bio && <p className="text-sm sm:text-base text-gray-600 mt-3 whitespace-pre-wrap">{user.bio}</p>}
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            評価 {Number(user.averageRating).toFixed(1)}
          </p>

          {/* いいね（大きめ、目立つ位置） */}
          {!isSelf && (
            <div className="mt-5">
              <ArtistLikeButton
                targetUserId={id}
                initialLiked={initialLiked}
                isSelf={isSelf}
                isLoggedIn={!!viewerId}
              />
            </div>
          )}

          {/* Phase A.6: フォローボタン・フォロワー数 / イベント・カレンダー動線 */}
          <div className="mt-4 flex items-center gap-2.5 flex-wrap">
            {viewerId && !isSelf ? (
              <FollowButton
                targetUserId={id}
                initialIsFollowing={initialIsFollowing}
                initialFollowerCount={followerCount}
              />
            ) : (
              <FollowerCountBadge count={followerCount} />
            )}

            <Link
              href={`/artists/${id}/events`}
              className="inline-flex items-center gap-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/70 px-4 py-2 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l18-8-6 18-2-8-10-2z" />
              </svg>
              <span>イベント</span>
            </Link>
            <Link
              href={`/artists/${id}/calendar`}
              className="inline-flex items-center gap-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/70 px-4 py-2 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M3 10h18M8 2v4M16 2v4" />
              </svg>
              <span>カレンダー</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Phase A.6: 今後のイベント（掲示板役割・常時表示） */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xl font-bold">今後のイベント</h2>
          {upcomingEvents.length > 0 && (
            <Link
              href={`/artists/${id}/events`}
              className="text-sm text-purple-700 hover:underline"
            >
              全部見る →
            </Link>
          )}
        </div>
        {upcomingEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-purple-200 bg-purple-50/40 p-5 text-center text-sm text-gray-600">
            {isSelf ? (
              <>
                告知中のイベントはまだありません。
                <p className="mt-2">
                  <Link href="/events/new" className="text-purple-700 hover:underline">
                    + 新しいイベントを告知する
                  </Link>
                </p>
              </>
            ) : (
              <>現在告知中のイベントはありません。</>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {upcomingEvents.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/events/${e.id}`}
                  className="block rounded-xl border border-gray-200 bg-white hover:shadow-sm transition p-3"
                >
                  <div className="flex items-center gap-2 text-xs text-purple-700 mb-1 flex-wrap">
                    <span>{EVENT_TYPE_LABELS[e.type as EventType]}</span>
                    <span>·</span>
                    <span>
                      {String(e.startAt.getMonth() + 1).padStart(2, '0')}/
                      {String(e.startAt.getDate()).padStart(2, '0')}{' '}
                      {String(e.startAt.getHours()).padStart(2, '0')}:
                      {String(e.startAt.getMinutes()).padStart(2, '0')}
                    </span>
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
      </section>

      {/* ポートフォリオ */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">ポートフォリオ</h2>
        <PortfolioGallery
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          portfolios={user.portfolios.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            mediaType: p.mediaType,
            fileKey: p.fileKey,
          }))}
        />
      </section>
    </div>
  )
}

