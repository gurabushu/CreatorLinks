'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { listArtistsAction } from '@/server/actions/artist'

const GENRES = ['音楽', 'イラスト', '動画', 'デザイン', '写真', '文章', '声優', 'その他']
const LIMIT = 12

type ArtistItem = {
  id: string
  name: string
  role: string
  genres: string[]
  bio: string | null
  avatarUrl: string | null
  averageRating: number
  portfolios: { id: string; mediaType: string; title: string }[]
}

// ---- アーティストカード ----
function ArtistCard({ artist }: { artist: ArtistItem }) {
  const rating = artist.averageRating

  return (
    <Link
      href={`/artists/${artist.id}`}
      className="bg-white border rounded-2xl p-5 hover:shadow-md hover:border-purple-300 transition group block"
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 overflow-hidden shrink-0 flex items-center justify-center text-white text-xl font-bold">
          {artist.avatarUrl ? (
            <Image
              src={artist.avatarUrl}
              alt={artist.name}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          ) : (
            artist.name.charAt(0)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 group-hover:text-purple-700 transition truncate">
              {artist.name}
            </p>
            {artist.role === 'PRO' && (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold shrink-0">
                PRO
              </span>
            )}
          </div>

          <div className="flex gap-1 flex-wrap mt-1">
            {artist.genres.slice(0, 3).map((g) => (
              <span key={g} className="bg-purple-50 text-purple-600 text-xs px-2 py-0.5 rounded">
                {g}
              </span>
            ))}
          </div>

          {artist.bio && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{artist.bio}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            {rating > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                {rating.toFixed(1)}
              </span>
            )}
            {artist.portfolios.length > 0 && (
              <span>作品 {artist.portfolios.length} 件</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ---- スケルトンカード ----
function SkeletonCard() {
  return (
    <div className="bg-white border rounded-2xl p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-4/5" />
        </div>
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
  const loaderRef = useRef<HTMLDivElement>(null)

  // ジャンル変更時にリストを再取得
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

  // 無限スクロール: 次ページ取得
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

  // Intersection Observer で画面下端に達したら次ページ取得
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

  const isLoading = isPending

  return (
    <div>
      {/* ジャンルフィルタ */}
      <div className="flex gap-2 flex-wrap mb-8">
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

      {/* エラー */}
      {isError && (
        <div className="text-center py-12 text-red-500">
          読み込みに失敗しました。リロードしてください。
        </div>
      )}

      {/* アーティスト一覧グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: LIMIT }).map((_, i) => <SkeletonCard key={i} />)
          : artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}

        {/* 追加ロード中スケルトン */}
        {isFetchingMore &&
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`more-${i}`} />)}
      </div>

      {/* 検索結果ゼロ */}
      {!isLoading && !isError && artists.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">🎨</p>
          <p className="font-medium">該当するアーティストが見つかりません</p>
          <p className="text-sm mt-1">別のジャンルで検索してみましょう</p>
        </div>
      )}

      {/* 無限スクロール トリガー */}
      <div ref={loaderRef} className="h-1" />

      {/* 全件表示完了 */}
      {!nextCursor && artists.length > 0 && !isLoading && (
        <p className="text-center text-sm text-gray-400 mt-8">
          全 {artists.length} 件を表示しました
        </p>
      )}
    </div>
  )
}
