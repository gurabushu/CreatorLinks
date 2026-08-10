'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { listArtistsAction } from '@/server/actions/artist'
import { toggleLikeAction } from '@/server/actions/like'
import { getDisplayName } from '@/lib/user'
import {
  resolveMediaSource,
  pickLeadPortfolio,
  buildYouTubeEmbed,
  buildVimeoEmbed,
} from '@/lib/media-source'
import { FoundingMemberBadge } from '@/components/early-bird/founding-member-badge'
import { ProfileFacts } from '@/components/artist/profile-facts'
import {
  COMMITMENT_LEVELS,
  COMMITMENT_LEVEL_LABELS,
  GENDERS,
  GENDER_LABELS,
  HEIGHT_BUCKETS,
  HEIGHT_BUCKET_LABELS,
  INSTRUMENT_PRESETS,
  type CommitmentLevel,
  type HeightBucket,
} from '@creator-links/shared'

const SOUND_PREF_KEY = 'creatorlinks.artist-list.hover-sound'

const GENRES = ['ボーカル', '作曲', '作詞', '編曲', '演奏', 'ミックス・マスタリング', 'DTM・トラックメイキング', 'ライブサポート・PA・照明', 'その他']
const LIMIT = 12

type Portfolio = { id: string; mediaType: string; title: string; fileKey: string }
type Gender = 'MALE' | 'FEMALE' | 'NOT_SPECIFIED'

type ArtistItem = {
  id: string
  name: string
  displayName: string | null
  role: string
  genres: string[]
  bio: string | null
  avatarUrl: string | null
  coverUrl: string | null
  averageRating: number
  earlyBirdSlot: number | null
  featuredPortfolioId: string | null
  gender: Gender | null
  heightCm: number | null
  activityYears: number | null
  skillLevel: CommitmentLevel | null
  instruments: string[]
  portfolios: Portfolio[]
}

const SKILL_BADGE_CLASS: Record<CommitmentLevel, string> = {
  HOBBY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SEMI_PRO: 'bg-sky-50 text-sky-700 border-sky-200',
  PRO: 'bg-amber-50 text-amber-800 border-amber-200',
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
          alt={lead?.title ?? `${getDisplayName(artist)}の動画`}
          fill
          className={`object-cover transition-opacity duration-200 ${isActive ? 'opacity-0' : 'opacity-100'}`}
          unoptimized
        />
        {isActive && (
          <iframe
            key={withSound ? 'on' : 'off'}
            src={embedUrl}
            title={lead?.title ?? `${getDisplayName(artist)}の動画`}
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
            alt={getDisplayName(artist)}
            fill
            className={`object-cover transition-opacity duration-200 ${isActive ? 'opacity-0' : 'opacity-100'}`}
            unoptimized
          />
        )}
        {isActive && (
          <iframe
            key={withSound ? 'on' : 'off'}
            src={embedUrl}
            title={lead?.title ?? `${getDisplayName(artist)}の動画`}
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
          <Image src={coverUrl} alt={getDisplayName(artist)} fill className="object-cover" unoptimized />
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
        alt={`${getDisplayName(artist)}の作品`}
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
              ? '音声'
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

// ---- いいねボタン ----
function LikeButton({
  artistId,
  liked,
  onChange,
  onMatched,
  loggedIn,
}: {
  artistId: string
  liked: boolean
  onChange: (next: boolean) => void
  onMatched: (matchId: string) => void
  loggedIn: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    if (!loggedIn) {
      router.push('/login?next=/artists')
      return
    }
    setBusy(true)
    onChange(!liked) // 楽観的更新
    const result = await toggleLikeAction({ targetId: artistId })
    setBusy(false)
    if (!result.success) {
      onChange(liked) // ロールバック
      return
    }
    if (result.status === 'matched') {
      onMatched(result.matchId)
    } else if (result.status === 'unliked') {
      onChange(false)
    } else if (result.status === 'liked') {
      onChange(true)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? 'いいねを取り消す' : 'いいねする'}
      className={`shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center transition shadow-sm ${
        liked
          ? 'bg-pink-50 border-pink-400 text-pink-600 hover:bg-pink-100 shadow-pink-200/60'
          : 'bg-white border-gray-200 text-gray-400 hover:border-pink-400 hover:text-pink-500 hover:shadow-pink-100'
      } ${busy ? 'opacity-60' : ''}`}
    >
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
      </svg>
    </button>
  )
}

// ---- アーティストカード ----
function ArtistCard({
  artist,
  withSound,
  liked,
  onLikeChange,
  onMatched,
  loggedIn,
  isMe,
}: {
  artist: ArtistItem
  withSound: boolean
  liked: boolean
  onLikeChange: (next: boolean) => void
  onMatched: (matchId: string) => void
  loggedIn: boolean
  isMe: boolean
}) {
  const resolvedCover = artist.coverUrl
    ? artist.coverUrl.startsWith('http')
      ? artist.coverUrl
      : `https://utfs.io/f/${artist.coverUrl}`
    : null
  const { lead, coverUrl } = pickLeadPortfolio(
    artist.portfolios,
    resolvedCover,
    artist.featuredPortfolioId,
  )
  const others = artist.portfolios.filter((p) => p.id !== lead?.id).slice(0, 4)
  const [hoverActive, setHoverActive] = useState(false)
  const [viewportActive, setViewportActive] = useState(false)
  const cardRef = useRef<HTMLAnchorElement | null>(null)
  const [hasHover, setHasHover] = useState(true)
  // 音あり再生は user gesture 必須なので、hover/focus 起因のときだけ withSound を尊重し、
  // viewport 自動再生は常にミュート（ブラウザの autoplay-with-sound ポリシー回避）。
  const isActive = hoverActive || viewportActive
  const effectiveWithSound = hoverActive ? withSound : false

  useEffect(() => {
    const mql = window.matchMedia('(hover: none)')
    const update = () => setHasHover(!mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  // ホバー不可端末（スマホ等）はビューポートで半分以上見えたら自動再生
  useEffect(() => {
    if (hasHover) return
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        setViewportActive(entry.intersectionRatio >= 0.5)
      },
      { threshold: [0, 0.5, 1] },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasHover])

  return (
    <Link
      ref={cardRef}
      href={`/artists/${artist.id}`}
      onMouseEnter={() => setHoverActive(true)}
      onMouseLeave={() => setHoverActive(false)}
      onFocus={() => setHoverActive(true)}
      onBlur={() => setHoverActive(false)}
      className="bg-white border rounded-2xl overflow-hidden hover:shadow-md hover:border-purple-300 transition group block"
    >
      {/* メインメディア */}
      <div className="relative aspect-[16/10] bg-gradient-to-br from-purple-100 to-indigo-100 overflow-hidden">
        <MediaHero
          artist={artist}
          lead={lead}
          coverUrl={coverUrl}
          isActive={isActive}
          withSound={effectiveWithSound}
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
                alt={getDisplayName(artist)}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              getDisplayName(artist).charAt(0)
            )}
          </div>
          <p className="font-bold text-gray-900 group-hover:text-purple-700 transition truncate flex-1 min-w-0">
            {getDisplayName(artist)}
          </p>
          {artist.skillLevel && (
            <span
              title={COMMITMENT_LEVEL_LABELS[artist.skillLevel].description}
              className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${SKILL_BADGE_CLASS[artist.skillLevel]}`}
            >
              {COMMITMENT_LEVEL_LABELS[artist.skillLevel].label}
            </span>
          )}
          {artist.role === 'PRO' && (
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold shrink-0">
              PRO
            </span>
          )}
          <FoundingMemberBadge slot={artist.earlyBirdSlot} />

          {!isMe && (
            <LikeButton
              artistId={artist.id}
              liked={liked}
              onChange={onLikeChange}
              onMatched={onMatched}
              loggedIn={loggedIn}
            />
          )}
        </div>

        <div className="flex gap-1 flex-wrap mb-2">
          {artist.genres.slice(0, 3).map((g) => (
            <span key={g} className="bg-purple-50 text-purple-600 text-xs px-2 py-0.5 rounded">
              {g}
            </span>
          ))}
        </div>

        {(artist.gender != null || artist.heightCm != null || artist.activityYears != null) && (
          <div className="mb-2">
            <ProfileFacts
              gender={artist.gender}
              heightCm={artist.heightCm}
              activityYears={artist.activityYears}
              size="sm"
            />
          </div>
        )}

        {artist.instruments.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-2">
            {artist.instruments.slice(0, 4).map((inst) => (
              <span
                key={inst}
                className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
              >
                {inst}
              </span>
            ))}
            {artist.instruments.length > 4 && (
              <span className="text-[10px] text-gray-400">+{artist.instruments.length - 4}</span>
            )}
          </div>
        )}

        {artist.bio ? (
          <p className="text-sm text-gray-500 line-clamp-2 mb-2">{artist.bio}</p>
        ) : (
          <p className="text-sm text-gray-300 italic mb-2">自己紹介未設定</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-400">
          {artist.averageRating > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.9 6.9L22 9.7l-5.5 4.8L18 22l-6-3.6L6 22l1.5-7.5L2 9.7l7.1-.8L12 2z" />
              </svg>
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

// ---- 詳細絞り込みのチップボタン ----
function FilterChip({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean
  onClick: () => void
  label: string
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-full text-sm border transition ${
        active
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
      }`}
    >
      {label}
    </button>
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
  initialLikedIds,
  currentUserId,
  initialQuery = '',
}: {
  initialArtists: ArtistItem[]
  initialNextCursor: string | null
  initialLikedIds: string[]
  currentUserId: string | null
  initialQuery?: string
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = (searchParams.get('q') ?? initialQuery).trim()
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null)
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<CommitmentLevel | null>(null)
  const [selectedHeightBuckets, setSelectedHeightBuckets] = useState<HeightBucket[]>([])
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [artists, setArtists] = useState<ArtistItem[]>(initialArtists)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [withSound, setWithSound] = useState(false)
  const [likedSet, setLikedSet] = useState<Set<string>>(() => new Set(initialLikedIds))
  const [matchBanner, setMatchBanner] = useState<{ matchId: string; name: string } | null>(null)
  const loaderRef = useRef<HTMLDivElement>(null)

  const activeFilterCount =
    (selectedGender ? 1 : 0) +
    (selectedSkillLevel ? 1 : 0) +
    (selectedHeightBuckets.length > 0 ? 1 : 0) +
    (selectedInstruments.length > 0 ? 1 : 0)

  const toggleHeightBucket = (b: HeightBucket) => {
    setSelectedHeightBuckets((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    )
  }

  const toggleInstrumentFilter = (name: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    )
  }

  const resetAdvanced = () => {
    setSelectedGender(null)
    setSelectedSkillLevel(null)
    setSelectedHeightBuckets([])
    setSelectedInstruments([])
  }

  const setLiked = (artistId: string, next: boolean) => {
    setLikedSet((prev) => {
      const copy = new Set(prev)
      if (next) copy.add(artistId)
      else copy.delete(artistId)
      return copy
    })
  }

  const handleMatched = (artist: ArtistItem, matchId: string) => {
    setLiked(artist.id, true)
    setMatchBanner({ matchId, name: getDisplayName(artist) })
  }

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
          q: query || undefined,
          gender: selectedGender ?? undefined,
          skillLevel: selectedSkillLevel ?? undefined,
          heightBuckets: selectedHeightBuckets.length > 0 ? selectedHeightBuckets : undefined,
          instruments: selectedInstruments.length > 0 ? selectedInstruments : undefined,
          limit: LIMIT,
        })
        setArtists(result.items)
        setNextCursor(result.nextCursor)
      } catch {
        setIsError(true)
      }
    })
  }, [
    selectedGenres,
    query,
    selectedGender,
    selectedSkillLevel,
    selectedHeightBuckets,
    selectedInstruments,
  ])

  const loadMore = async () => {
    if (!nextCursor || isFetchingMore) return
    setIsFetchingMore(true)
    try {
      const result = await listArtistsAction({
        genres: selectedGenres.length > 0 ? selectedGenres : undefined,
        q: query || undefined,
        gender: selectedGender ?? undefined,
        skillLevel: selectedSkillLevel ?? undefined,
        heightBuckets: selectedHeightBuckets.length > 0 ? selectedHeightBuckets : undefined,
        instruments: selectedInstruments.length > 0 ? selectedInstruments : undefined,
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

  const clearQuery = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    const qs = params.toString()
    router.push(qs ? `/artists?${qs}` : '/artists')
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
      {/* マッチ成立バナー */}
      {matchBanner && (
        <div className="mb-6 rounded-xl border border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-pink-700 text-sm sm:text-base">マッチング成立！</p>
              <p className="text-xs sm:text-sm text-gray-600">{matchBanner.name} さんとマッチしました。チャットで案件を相互紹介できます。</p>
            </div>
            <button
              type="button"
              onClick={() => setMatchBanner(null)}
              aria-label="閉じる"
              className="text-gray-400 hover:text-gray-600 shrink-0 sm:hidden"
            >
              ✕
            </button>
          </div>
          <Link
            href={`/dashboard/chat/${matchBanner.matchId}`}
            className="bg-pink-600 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-lg hover:bg-pink-700 transition shrink-0 w-full sm:w-auto text-center"
          >
            チャットを開く
          </Link>
          <button
            type="button"
            onClick={() => setMatchBanner(null)}
            aria-label="閉じる"
            className="text-gray-400 hover:text-gray-600 shrink-0 hidden sm:block"
          >
            ✕
          </button>
        </div>
      )}

      {/* 検索キーワード表示 */}
      {query && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-gray-500">検索:</span>
          <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full font-medium">
            {query}
            <button
              type="button"
              onClick={clearQuery}
              aria-label="検索を解除"
              className="text-purple-400 hover:text-purple-700 -mr-1"
            >
              ✕
            </button>
          </span>
        </div>
      )}

      {/* フィルタ + 音声トグル */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-6 sm:mb-8">
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          <button
            onClick={() => setSelectedGenres([])}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm border transition ${
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
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm border transition ${
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
          aria-label={withSound ? 'ホバー音声 ON' : 'ホバー音声 OFF'}
          title={withSound ? 'ホバー音声 ON（クリックで OFF）' : 'ホバー音声 OFF（クリックで ON）'}
          className={`relative shrink-0 px-3 py-2 rounded-full text-sm border transition flex items-center gap-1.5 ${
            withSound
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
          }`}
        >
          <span aria-hidden className="inline-flex">
            {withSound ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                <path d="M18 5a9 9 0 0 1 0 14" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4z" />
                <path d="M23 9l-6 6M17 9l6 6" />
              </svg>
            )}
          </span>
          <span className="hidden sm:inline">{withSound ? 'ホバー音声 ON' : 'ホバー音声 OFF'}</span>
          <span
            aria-hidden
            className={`sm:hidden absolute -top-1.5 -right-1.5 px-1 text-[10px] leading-tight font-bold rounded-full border bg-white shadow-sm ${
              withSound
                ? 'text-purple-700 border-purple-400'
                : 'text-gray-600 border-gray-300'
            }`}
          >
            {withSound ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {/* 詳細絞り込み（開閉） */}
      <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium bg-gray-50 hover:bg-gray-100 transition"
        >
          <span className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
            詳細絞り込み
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-purple-600 text-white rounded-full text-[11px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </span>
          <span className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  resetAdvanced()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    resetAdvanced()
                  }
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                すべて解除
              </span>
            )}
            <svg
              viewBox="0 0 24 24"
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>

        {showAdvanced && (
          <div className="p-3 sm:p-4 space-y-4 sm:space-y-5 bg-white">
            {/* 熟練度 */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">熟練度</p>
              <div className="flex gap-1.5 flex-wrap">
                <FilterChip
                  active={selectedSkillLevel === null}
                  onClick={() => setSelectedSkillLevel(null)}
                  label="指定なし"
                />
                {COMMITMENT_LEVELS.map((lv) => (
                  <FilterChip
                    key={lv}
                    active={selectedSkillLevel === lv}
                    onClick={() => setSelectedSkillLevel(lv)}
                    label={COMMITMENT_LEVEL_LABELS[lv].label}
                    title={COMMITMENT_LEVEL_LABELS[lv].description}
                  />
                ))}
              </div>
            </div>

            {/* 性別 */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">性別</p>
              <div className="flex gap-1.5 flex-wrap">
                <FilterChip
                  active={selectedGender === null}
                  onClick={() => setSelectedGender(null)}
                  label="指定なし"
                />
                {GENDERS.map((g) => (
                  <FilterChip
                    key={g}
                    active={selectedGender === g}
                    onClick={() => setSelectedGender(g)}
                    label={GENDER_LABELS[g]}
                  />
                ))}
              </div>
            </div>

            {/* 身長段階（複数選択可） */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">
                身長 <span className="text-[11px] font-normal text-gray-400">（複数選択可）</span>
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {HEIGHT_BUCKETS.map((b) => (
                  <FilterChip
                    key={b}
                    active={selectedHeightBuckets.includes(b)}
                    onClick={() => toggleHeightBucket(b)}
                    label={HEIGHT_BUCKET_LABELS[b]}
                  />
                ))}
              </div>
            </div>

            {/* 楽器 */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">
                楽器 / 担当 <span className="text-[11px] font-normal text-gray-400">（音楽系のみ・複数選択可）</span>
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {INSTRUMENT_PRESETS.map((inst) => (
                  <FilterChip
                    key={inst}
                    active={selectedInstruments.includes(inst)}
                    onClick={() => toggleInstrumentFilter(inst)}
                    label={inst}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
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
              <ArtistCard
                key={artist.id}
                artist={artist}
                withSound={withSound}
                liked={likedSet.has(artist.id)}
                onLikeChange={(next) => setLiked(artist.id, next)}
                onMatched={(matchId) => handleMatched(artist, matchId)}
                loggedIn={!!currentUserId}
                isMe={currentUserId === artist.id}
              />
            ))}
        {isFetchingMore &&
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`more-${i}`} />)}
      </div>

      {!isPending && !isError && artists.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="font-medium">該当するアーティストが見つかりません</p>
          <p className="text-sm mt-1">
            {query ? '別のキーワードやジャンルで検索してみましょう' : '別のジャンルで検索してみましょう'}
          </p>
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
