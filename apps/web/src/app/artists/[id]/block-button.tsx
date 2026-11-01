'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { blockUserAction, unblockUserAction } from '@/server/actions/block'

export function BlockButton({
  targetUserId,
  initialBlocked,
}: {
  targetUserId: string
  initialBlocked: boolean
}) {
  const router = useRouter()
  const [blocked, setBlocked] = useState(initialBlocked)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const toggle = () => {
    const confirmMsg = blocked
      ? 'ブロックを解除します。よろしいですか？'
      : 'このユーザーをブロックします。相手からのメッセージ・フォロー・スカウト・応募・通知が届かなくなります。'
    if (!confirm(confirmMsg)) return

    setError(null)
    startTransition(async () => {
      const r = blocked
        ? await unblockUserAction(targetUserId)
        : await blockUserAction(targetUserId)
      if (!r.success) {
        setError(r.error)
      } else {
        setBlocked(!blocked)
        router.refresh()
      }
    })
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        onClick={toggle}
        disabled={pending}
        className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors border ${
          blocked
            ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
            : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
        } disabled:opacity-50`}
        aria-pressed={blocked}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
        <span>{pending ? '処理中...' : blocked ? 'ブロック中' : 'ブロック'}</span>
      </button>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
