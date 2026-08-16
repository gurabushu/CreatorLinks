// イベント詳細: Phase A 最小 UI
// 主催者・出演者・公募枠・参加ボタンを表示。応募・興味表明は client island で。

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDisplayName } from '@/lib/user'
import {
  EVENT_TYPE_LABELS,
  EVENT_PARTICIPANT_ROLE_LABELS,
  EVENT_STATUS_LABELS,
  EVENT_VISIBILITY_LABELS,
  EVENT_VISIBILITY_ICONS,
  parseVideoEmbed,
} from '@creator-links/shared'
import type {
  EventType,
  EventParticipantRole,
  EventStatus,
  EventVisibility,
} from '@creator-links/shared'
import { EventInterestButton, ApplyToRoleButton } from './client-actions'
import { jstDatetime } from '@/lib/jst-date'
import { JsonLd } from '@/components/seo/json-ld'
import { eventJsonLd } from '@/lib/seo'

export const dynamic = 'force-dynamic'

// Vercel Node runtime は UTC 動作。JST で表示するため jst-date ヘルパー経由に統一。
const fmt = jstDatetime

// 既存レコードに javascript: 等が混ざっていても <a href> を発火させないための防衛層。
// スキーマ側でも http/https のみを受け付けているが、旧データや直接 DB 経由を想定して二重で弾く。
function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params) {
  const { id } = await params
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        title: true, description: true, coverUrl: true,
        visibility: true, status: true,
      },
    })
    if (!event) return { title: 'イベントが見つかりません' }
    // 非公開・下書きは検索エンジンに晒さない
    const noindex = event.visibility !== 'PUBLIC' || event.status !== 'PUBLISHED'
    return {
      title: event.title,
      description: event.description?.slice(0, 200) ?? undefined,
      alternates: { canonical: `/events/${id}` },
      openGraph: event.coverUrl ? { images: [{ url: event.coverUrl }] } : undefined,
      robots: noindex ? { index: false, follow: false } : undefined,
    }
  } catch {
    return { title: 'イベント詳細' }
  }
}

export default async function EventDetailPage({ params }: Params) {
  const { id } = await params
  const session = await auth()

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      creator: {
        select: { id: true, name: true, displayName: true, avatarUrl: true, averageRating: true },
      },
      participants: {
        include: {
          user: { select: { id: true, name: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { invitedAt: 'asc' },
      },
      openRoles: {
        orderBy: { createdAt: 'asc' },
      },
      media: {
        orderBy: { position: 'asc' },
        select: { id: true, type: true, url: true, caption: true },
      },
    },
  })

  if (!event) notFound()

  // Phase A.5: visibility チェック
  const viewerId = session?.user?.id ?? null
  const isCreator = viewerId && viewerId === event.creatorId
  const isParticipant = viewerId
    ? event.participants.some((p) => p.userId === viewerId)
    : false

  const canView = await (async () => {
    if (isCreator || isParticipant) return true
    if (event.visibility === 'PUBLIC') return true
    if (event.visibility === 'FOLLOWERS' && viewerId) {
      // Phase A.6: Follow モデルで判定（EventFollow は通知購読専用）
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: event.creatorId,
          },
        },
        select: { id: true },
      })
      return !!follow
    }
    return false
  })()

  if (!canView) notFound()

  // Event グループチャットへのアクセス権: creator + CONFIRMED participant のみ
  // (INVITED や AUDIENCE/DECLINED は含めない。event-chat.ts checkMembership と一致)
  const canAccessChat = !!(
    isCreator ||
    (viewerId && event.participants.some((p) => p.userId === viewerId && p.status === 'CONFIRMED'))
  )

  const myInterest = session
    ? await prisma.eventInterest.findUnique({
        where: { userId_eventId: { userId: session.user.id, eventId: id } },
      })
    : null

  const isPublished = event.status === 'PUBLISHED'

  // Google Event リッチリザルト用 JSON-LD
  // 公開 (PUBLIC + PUBLISHED) のイベントのみ検索対象。それ以外は emit しない。
  const eventLd =
    event.visibility === 'PUBLIC' && event.status === 'PUBLISHED'
      ? eventJsonLd(event)
      : null

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {eventLd && <JsonLd data={eventLd} />}
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-purple-700 mb-2 flex-wrap">
          <span className="font-medium">
            {EVENT_TYPE_LABELS[event.type as EventType]}
          </span>
          <span>·</span>
          <span>{EVENT_STATUS_LABELS[event.status as EventStatus]}</span>
          <span>·</span>
          <span title={EVENT_VISIBILITY_LABELS[event.visibility as EventVisibility]}>
            {EVENT_VISIBILITY_ICONS[event.visibility as EventVisibility]}{' '}
            {EVENT_VISIBILITY_LABELS[event.visibility as EventVisibility]}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {event.title}
        </h1>
        <p className="text-sm text-gray-500">
          主催 <Link href={`/artists/${event.creator.id}`} className="text-purple-700 hover:underline">
            {getDisplayName(event.creator)}
          </Link>
        </p>
      </div>

      {/* メディア:
          - hero = 先頭画像 (EventMedia の IMAGE 先頭、無ければ既存 coverUrl フォールバック)
          - additional images = 2 枚目以降をグリッド表示 (クリックで別タブに開く)
          - videos = YouTube / Vimeo 埋め込み iframe */}
      {(() => {
        const images = event.media.filter((m) => m.type === 'IMAGE')
        const videos = event.media.filter((m) => m.type === 'VIDEO')
        const heroUrl = images[0]?.url ?? event.coverUrl
        const extraImages = images.slice(1)
        return (
          <>
            {heroUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroUrl}
                alt={images[0]?.caption ?? ''}
                className="w-full aspect-video object-cover rounded-xl mb-4"
              />
            )}
            {extraImages.length > 0 && (
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                {extraImages.map((img) => (
                  <li key={img.id}>
                    <a
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-video rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.caption ?? ''}
                        className="w-full h-full object-cover"
                      />
                    </a>
                    {img.caption && (
                      <p className="mt-1 text-[11px] text-gray-500 truncate">{img.caption}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!extraImages.length && heroUrl && <div className="mb-6" />}
            {videos.length > 0 && (
              <div className="mb-6 space-y-3">
                {videos.map((v) => {
                  const embed = parseVideoEmbed(v.url)
                  if (!embed) return null
                  return (
                    <div key={v.id}>
                      <div className="aspect-video rounded-xl overflow-hidden bg-black">
                        <iframe
                          src={embed.embedUrl}
                          title={v.caption ?? '動画'}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      {v.caption && (
                        <p className="mt-1 text-xs text-gray-500">{v.caption}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )
      })()}

      {/* 基本情報 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6 space-y-2 text-sm">
        <div>
          <span className="text-gray-500 mr-2">開始</span>
          <span className="font-medium">{fmt(event.startAt)}</span>
        </div>
        {event.endAt && (
          <div>
            <span className="text-gray-500 mr-2">終了</span>
            <span className="font-medium">{fmt(event.endAt)}</span>
          </div>
        )}
        {event.venueName && (
          <div>
            <span className="text-gray-500 mr-2">会場</span>
            <span className="font-medium">{event.venueName}</span>
            {event.venueAddress && <span className="text-gray-500 ml-2">{event.venueAddress}</span>}
          </div>
        )}
        {event.city && (
          <div>
            <span className="text-gray-500 mr-2">エリア</span>
            <span>{event.city}</span>
          </div>
        )}
        {event.genres.length > 0 && (
          <div>
            <span className="text-gray-500 mr-2">ジャンル</span>
            <span>{event.genres.join(' · ')}</span>
          </div>
        )}
        {(() => {
          const href = safeHttpUrl(event.ticketUrl)
          if (!href) return null
          return (
            <div>
              <span className="text-gray-500 mr-2">チケット</span>
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:underline">
                {event.isFree ? '無料' : event.ticketPriceYen ? `¥${event.ticketPriceYen.toLocaleString()}` : 'チケット情報'}
              </a>
            </div>
          )
        })()}
      </div>

      {/* 参加表明ボタン（ログインユーザーのみ、非主催者） */}
      {session && !isCreator && isPublished && (
        <div className="mb-6">
          <EventInterestButton
            eventId={event.id}
            currentIsAttending={myInterest?.isAttending ?? null}
          />
        </div>
      )}

      {/* グループチャット導線（creator + CONFIRMED participant のみ） */}
      {canAccessChat && (
        <div className="mb-6">
          <Link
            href={`/dashboard/chat/event/${event.id}`}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>グループチャットへ</span>
          </Link>
        </div>
      )}

      {/* 説明 */}
      {event.description && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">詳細</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </div>
      )}

      {/* 公募枠 */}
      {event.openRoles.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">出演・スタッフ募集</h2>
          <ul className="space-y-2">
            {event.openRoles.map((role) => (
              <li key={role.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="text-xs text-emerald-700 mb-1">
                      {EVENT_PARTICIPANT_ROLE_LABELS[role.roleType as EventParticipantRole]}
                    </div>
                    <div className="font-medium text-gray-900">{role.title}</div>
                    {role.description && (
                      <p className="text-xs text-gray-600 mt-1">{role.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                      <span>募集 {role.filledCount} / {role.requiredCount}</span>
                      {role.compensation !== null && (
                        <span className="text-purple-700">
                          ¥{role.compensation.toLocaleString()}
                        </span>
                      )}
                      {!role.isPaid && <span>ボランティア</span>}
                      <span>{role.status === 'OPEN' ? '募集中' : role.status === 'FILLED' ? '定員到達' : '締切'}</span>
                    </div>
                  </div>
                  {session && !isCreator && role.status === 'OPEN' && (
                    <ApplyToRoleButton openRoleId={role.id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 参加者 */}
      {event.participants.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">
            出演者・スタッフ ({event.participants.filter(p => p.status === 'CONFIRMED').length})
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {event.participants
              .filter((p) => p.status === 'CONFIRMED')
              .map((p) => (
                <li key={p.id} className="rounded-lg border border-gray-200 bg-white p-3 flex items-center gap-3">
                  {p.user.avatarUrl ? (
                    <img src={p.user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-200" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{getDisplayName(p.user)}</div>
                    <div className="text-[11px] text-gray-500">
                      {EVENT_PARTICIPANT_ROLE_LABELS[p.role as EventParticipantRole]}
                      {p.note && ` · ${p.note}`}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* 主催者操作 */}
      {isCreator && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">主催者操作</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/events/${event.id}/edit`}
              className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
            >
              編集
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            公募枠追加・招待送信・公開/中止 は近日追加予定
          </p>
        </div>
      )}
    </div>
  )
}
