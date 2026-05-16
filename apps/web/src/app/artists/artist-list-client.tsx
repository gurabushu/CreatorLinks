'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { listArtistsAction } from '@/server/actions/artist'
import {
  resolveMediaSource,
  pickLeadPortfolio,
  buildYouTubeEmbed,
  buildVimeoEmbed,
} from '@/lib/media-source'

const SOUND_PREF_KEY = 'creatorlinks.artist-list.hover-sound'

const GENRES = ['音楽', 'イラスト', '動画', 'デザイン', '写真', '文章', '声優', 'その他']
const LIMIT = 12

type Portfolio = { id: string; mediaType: string; title: string; fileKey: string }

type ArtistItem = {
  id: string
  name: string
  role: string
  genres: string[]
  bio: string | null
  avatarUrl: string | null
  coverUrl: string | null
  averageRating: number
  portfolios: Portfolio[]
}

// ---- メインメディア（ホバー時のみ再生：TikTok 風） ----
function MediaHero({
  artist,
  lead,
  coverUrl,
  isActive,
  withSound,
}: {
  artist: ArtistItem
  lead: Portfolio | null
  coverUrl: string | null
  isActive: boolean
  withSound: boolean
}) {
  const source = lead ? resolveMediaSource(lead.fileKey) : null
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // 動画ファイル: isActive で play/pause を切り替え
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (isActive) {
      v.currentTime = 0
      v.muted = !withSound
      void v.play().catch(() => {
        // 音ありで autoplay が弾かれた場合は muted にしてリトライ
        v.muted = true
        void v.play().catch(() => {})
      })
    } else {
      v.pause()
    }
  }, [isActive, withSound])

  // 1) 動画ファイル → ホバーで再生
  if (lead && source?.kind === 'file' && lead.mediaType === 'VIDEO') {
    return (
      <>
        <video
          ref={videoRef}
          src={`${source.url}#t=0.1`}
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <HoverHint visible={!isActive} label="動画" />
      </>
    )
  }

  // 2) YouTube → ホバー時に iframe を mount
  if (source?.kind === 'youtube') {
    const embedUrl = buildYouTubeEmbed(source.videoId, { muted: !withSound })
    return (
      <>
        <Image
          src={source.thumbnailUrl}
          alt={lead?.title ?? `${artist.name}の動画`}
          fill
          className={`object-cover transition-opacity duration-200 ${isActive ? 'opacity-0' : 'opacity-100'}`}
          unoptimized
        />
        {isActive && (
          <iframe
            key={withSound ? 'on' : 'off'}
            src={embedUrl}
            title={lead?.title ?? `${artist.name}の動画`}
            className="absolute inset-0 w-full h-full pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture"
            loading="lazy"
          />
        )}
        <HoverHint visible={!isActive} label="YouTube" />
      </>
    )
  }

  // 3) Vimeo → ホバー時に iframe を mount
  if (source?.kind === 'vimeo') {
    const embedUrl = buildVimeoEmbed(source.videoId, { muted: !withSound })
    return (
      <>
        {coverUrl && (
          <Image
            src={coverUrl}
            alt={artist.name}
            fill
            className={`object-cover transition-opacity duration-200 ${isActive ? 'opacity-0' : 'opacity-100'}`}
            unoptimized
          />
        )}
        {isActive && (
          <iframe
            key={withSound ? 'on' : 'off'}
            src={embedUrl}
            title={lead?.title ?? `${artist.name}の動画`}
            className="absolute inset-0 w-full h-full pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture"
            loading="lazy"
          />
        )}
        <HoverHint visible={!isActive} label="Vimeo" />
      </>
    )
  }

  // 4) Twitter / その他URL → 再生はできないので ▶ アイコンのみ
  if (source && (source.kind === 'twitter' || source.kind === 'other')) {
    return (
      <>
        {coverUrl && (
          <Image src={coverUrl} alt={artist.name} fill className="object-cover" unoptimized />
        )}
        <HoverHint visible label={source.kind === 'twitter' ? 'X' : 'リンク'} />
      </>
    )
  }

  // 5) 画像 portfolio が lead → そのまま表示
  if (lead && source?.kind === 'file' && lead.mediaType === 'IMAGE') {
    return (
      <Image
        src={source.url}
        alt={lead.title}
        fill
        className="object-cover"
        unoptimized
        onError={(e) => {
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }

  // 6) カバー画像のみ
  if (coverUrl) {
    return (
      <Image
        src={coverUrl}
        alt={`${artist.name}の作品`}
        fill
        className="object-cover"
        unoptimized
        onError={(e) => {
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }

  return null
}

function HoverHint({ visible, label }: { visible: boolean; label: string }) {
  return (
    <>
      <div
        className={`absolute inset-0 bg-black/20 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="w-14 h-14 rounded-full bg-white/90 shadow-lg flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 ml-1 text-purple-700 fill-current">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      <span
        className={`absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        {label}
      </span>
    </>
  )
}

// ---- サムネ列（lead 以外を最大4件） ----
function ThumbnailStrip({ works }: { works: Portfolio[] }) {
  if (works.length === 0) return null
  return (
    <div className="grid grid-cols-4 gap-1.5 px-4 pb-4">
      {works.map((p) => {
        const src = resolveMediaSource(p.fileKey)
        const isImageFile = p.mediaType === 'IMAGE' && src.kind === 'file'
        const previewUrl =
          isImageFile ? src.url : src.kind === 'youtube' ? src.thumbnailUrl : null
        const overlay =
          p.mediaType === 'VIDEO' || src.kind === 'youtube' || src.kind === 'vimeo'
            ? '▶'
            : p.mediaType === 'AUDIO'
              ? '🎵'
              : null
        return (
          <div
            key={p.id}
            className="relative aspect-square rounded-md overflow-hidden bg-gradient-to-br from-purple-100 to-indigo-100"
            title={p.title}
          >
            {previewUrl && (
              <Image
                src={previewUrl}
                alt={p.title}
                fill
                className="object-cover"
                unoptimized
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
            {overlay && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                  {overlay}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---- アーティストカード ----
function ArtistCard({ artist, withSound }: { artist: ArtistItem; withSound: boolean }) {
  const resolvedCover = artist.coverUrl
    ? artist.coverUrl.startsWith('http')
      ? artist.coverUrl
      : `https://utfs.io/f/${artist.coverUrl}`
    : null
  const { lead, coverUrl } = pickLeadPortfolio(artist.portfolios, resolvedCover)
  const others = artist.portfolios.filter((p) => p.id !== lead?.id).slice(0, 4)
  const [isActive, setIsActive] = useState(false)

  return (
    <Link
      href={`/artists/${artist.id}`}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
      className="bg-white border rounded-2xl overflow-hidden hover:shadow-md hover:border-purple-300 transition group block"
    >
      {/* メインメディア */}
      <div className="relative aspect-[16/10] bg-gradient-to-br from-purple-100 to-indigo-100 overflow-hidden">
        <MediaHero
          artist={artist}
          lead={lead}
          coverUrl={coverUrl}
          isActive={isActive}
          withSound={withSound}
        />
      </div>

      {/* 本文 */}
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center gap-2 mb-1">
          {/* アバター（名前の左） */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 overflow-hidden flex items-center justify-center text-white text-sm font-bold shrink-0">
            {artist.avatarUrl ? (
              <Image
                src={artist.avatarUrl}
                alt={artist.name}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              artist.name.charAt(0)
            )}
          </div>
          <p className="font-bold text-gray-900 group-hover:text-purple-700 transition truncate flex-1 min-w-0">
            {artist.name}
          </p>
          {artist.role === 'PRO' && (
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold shrink-0">
              PRO
            </span>
          )}
        </div>

        <div className="flex gap-1 flex-wrap mb-2">
          {artist.genres.slice(0, 3).map((g) => (
            <span key={g} className="bg-purple-50 text-purple-600 text-xs px-2 py-0.5 rounded">
              {g}
            </span>
          ))}
        </div>

        {artist.bio ? (
          <p className="text-sm text-gray-500 line-clamp-2 mb-2">{artist.bio}</p>
        ) : (
          <p className="text-sm text-gray-300 italic mb-2">自己紹介未設定</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-400">
          {artist.averageRating > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-yellow-400">★</span>
              {artist.averageRating.toFixed(1)}
            </span>
          )}
          {artist.portfolios.length > 0 && <span>作品 {artist.portfolios.length} 件</span>}
        </div>
      </div>

      {/* サムネ列 */}
      <ThumbnailStrip works={others} />
    </Link>
  )
}

// ---- スケルトンカード ----
function SkeletonCard() {
  return (
    <div className="bg-white border rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-gray-200" />
      <div className="px-4 pt-3 pb-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-4/5" />
      </div>
      <div className="grid grid-cols-4 gap-1.5 px-4 pb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square bg-gray-100 rounded-md" />
        ))}
      </div>
    </div>
  )
}

// ---- メインコンポーネント ----
export function ArtistListClient({
  initialArtists,
  initialNextCursor,
}: {
  initialArtists: ArtistItem[]
  initialNextCursor: string | null
}) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [artists, setArtists] = useState<ArtistItem[]>(initialArtists)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [withSound, setWithSound] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  // localStorage から音声設定を復元
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SOUND_PREF_KEY)
      if (saved === '1') setWithSound(true)
    } catch {
      // localStorage 不可（プライベートモード等）はデフォルト（OFF）のまま
    }
  }, [])

  const toggleSound = () => {
    setWithSound((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SOUND_PREF_KEY, next ? '1' : '0')
      } catch {
        // 保存できなくても挙動には影響しない
      }
      return next
    })
  }

  useEffect(() => {
    setIsError(false)
    startTransition(async () => {
      try {
        const result = await listArtistsAction({
          genres: selectedGenres.length > 0 ? selectedGenres : undefined,
          limit: LIMIT,
        })
        setArtists(result.items)
        setNextCursor(result.nextCursor)
      } catch {
        setIsError(true)
      }
    })
  }, [selectedGenres])

  const loadMore = async () => {
    if (!nextCursor || isFetchingMore) return
    setIsFetchingMore(true)
    try {
      const result = await listArtistsAction({
        genres: selectedGenres.length > 0 ? selectedGenres : undefined,
        cursor: nextCursor,
        limit: LIMIT,
      })
      setArtists((prev) => [...prev, ...result.items])
      setNextCursor(result.nextCursor)
    } catch {
      setIsError(true)
    } finally {
      setIsFetchingMore(false)
    }
  }

  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor && !isFetchingMore && !isPending) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [nextCursor, isFetchingMore, isPending]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    )
  }

  return (
    <div>
      {/* フィルタ + 音声トグル */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedGenres([])}
            className={`px-4 py-2 rounded-full text-sm border transition ${
              selectedGenres.length === 0
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
            }`}
          >
            すべて
          </button>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => toggleGenre(g)}
              className={`px-4 py-2 rounded-full text-sm border transition ${
                selectedGenres.includes(g)
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <button
          onClick={toggleSound}
          aria-pressed={withSound}
          title="ホバー時に音声を再生するかを切り替え"
          className={`shrink-0 px-3 py-2 rounded-full text-sm border transition flex items-center gap-1.5 ${
            withSound
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
          }`}
        >
          <span aria-hidden>{withSound ? '🔊' : '🔇'}</span>
          <span className="hidden sm:inline">{withSound ? 'ホバー音声 ON' : 'ホバー音声 OFF'}</span>
        </button>
      </div>

      {isError && (
        <div className="text-center py-12 text-red-500">
          読み込みに失敗しました。リロードしてください。
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isPending
          ? Array.from({ length: LIMIT }).map((_, i) => <SkeletonCard key={i} />)
          : artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} withSound={withSound} />
            ))}
        {isFetchingMore &&
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`more-${i}`} />)}
      </div>

      {!isPending && !isError && artists.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">🎨</p>
          <p className="font-medium">該当するアーティストが見つかりません</p>
          <p className="text-sm mt-1">別のジャンルで検索してみましょう</p>
        </div>
      )}

      <div ref={loaderRef} className="h-1" />

      {!nextCursor && artists.length > 0 && !isPending && (
        <p className="text-center text-sm text-gray-400 mt-8">
          全 {artists.length} 件を表示しました
        </p>
      )}
    </div>
  )
}
