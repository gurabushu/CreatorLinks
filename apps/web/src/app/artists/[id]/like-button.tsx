'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toggleLikeAction } from '@/server/actions/like'

// アーティスト詳細画面のインライン Like ボタン（mono + purple-600）
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
      router.push(`/auth?next=${encodeURIComponent(`/artists/${targetUserId}`)}`)
      return
    }
    setError(null)
    const next = !liked
    setLiked(next)

    startTransition(async () => {
      const result = await toggleLikeAction({ targetId: targetUserId })
      if (!result.success) {
        setLiked(!next)
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
        className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors disabled:opacity-60 ${
          liked
            ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700'
            : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
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
        <div className="rounded-xl bg-zinc-900 text-white px-3 py-2 text-sm max-w-xs">
          <div className="font-semibold mb-0.5 text-xs">マッチしました</div>
          <Link
            href={`/dashboard/chat/${matchId}`}
            className="text-purple-300 hover:text-white hover:underline text-xs"
          >
            チャットを開く →
          </Link>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
