'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { followUserAction, unfollowUserAction } from '@/server/actions/follow'

// mono + purple-600 の 2 トーン。フォロワー数はヒーロー stat strip 側に移したため、
// このボタンは toggle UI のみ返す。
export function FollowButton({
  targetUserId,
  initialIsFollowing,
}: {
  targetUserId: string
  initialIsFollowing: boolean
  initialFollowerCount?: number // 互換のため受け取るが未使用
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [error, setError] = useState<string | null>(null)

  const toggle = () => {
    setError(null)
    const nextFollowing = !isFollowing
    setIsFollowing(nextFollowing)

    startTransition(async () => {
      const result = nextFollowing
        ? await followUserAction(targetUserId)
        : await unfollowUserAction(targetUserId)
      if (!result.success) {
        setIsFollowing(!nextFollowing)
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        onClick={toggle}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors disabled:opacity-50 ${
          isFollowing
            ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
            : 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700'
        }`}
      >
        {isPending ? '処理中...' : isFollowing ? '✓ フォロー中' : '＋ フォロー'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// 未ログイン / 他ユーザー向け: フォロワー数のみを stat strip 風に表示。
// mono + purple-600 の 2 トーン。
export function FollowerCountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-baseline gap-1 text-sm">
      <span className="font-bold tabular-nums text-zinc-900">
        {count.toLocaleString()}
      </span>
      <span className="text-zinc-500">フォロワー</span>
    </span>
  )
}
