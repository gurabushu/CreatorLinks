'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toggleLikeAction } from '@/server/actions/like'

// アーティスト詳細画面用の大きめ LikeButton
// - ラベル付き
// - 相互マッチ成立時にインライン通知（チャットへのリンク）
export function ArtistLikeButton({
  targetUserId,
  initialLiked,
  isSelf,
  isLoggedIn,
}: {
  targetUserId: string
  initialLiked: boolean
  isSelf: boolean
  isLoggedIn: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [liked, setLiked] = useState(initialLiked)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (isSelf) return null

  const toggle = () => {
    if (!isLoggedIn) {
      // ログイン後にこの詳細ページへ戻す
      router.push(`/auth?next=${encodeURIComponent(`/artists/${targetUserId}`)}`)
      return
    }
    setError(null)
    const next = !liked
    setLiked(next) // optimistic

    startTransition(async () => {
      const result = await toggleLikeAction({ targetId: targetUserId })
      if (!result.success) {
        setLiked(!next) // rollback
        setError(result.error)
        return
      }
      if (result.status === 'matched') {
        setMatchId(result.matchId)
        router.refresh()
      } else if (result.status === 'unliked') {
        setLiked(false)
      } else if (result.status === 'liked') {
        setLiked(true)
      }
    })
  }

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        onClick={toggle}
        disabled={isPending}
        aria-pressed={liked}
        aria-label={liked ? 'いいねを取り消す' : 'いいねする'}
        className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors shadow-sm disabled:opacity-60 ${
          liked
            ? 'bg-pink-50 border-pink-300 text-pink-600 hover:bg-pink-100 shadow-pink-200/50'
            : 'bg-white border-gray-200 text-gray-500 hover:border-pink-300 hover:text-pink-500 hover:bg-pink-50/60'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
        </svg>
        <span>{liked ? 'いいね済み' : 'いいね'}</span>
      </button>

      {matchId && (
        <div className="rounded-xl bg-gradient-to-r from-pink-50 via-purple-50 to-pink-50 border border-pink-200 px-3 py-2 text-sm max-w-xs">
          <div className="font-semibold text-pink-700 mb-0.5 text-xs">🎉 マッチしました！</div>
          <Link
            href={`/dashboard/chat/${matchId}`}
            className="text-purple-700 hover:underline text-xs"
          >
            チャットを開く →
          </Link>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
