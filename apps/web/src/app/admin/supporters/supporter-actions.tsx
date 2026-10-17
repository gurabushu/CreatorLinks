'use client'

import { useTransition } from 'react'
import {
  grantFoundingSupporterAction,
  revokeFoundingSupporterAction,
  grantVerifiedBadgeAction,
} from '@/server/actions/admin-supporter'

type Props = {
  userId: string
  isFounder: boolean
  isVerified: boolean
}

export function SupporterActions({ userId, isFounder, isVerified }: Props) {
  const [isPending, startTransition] = useTransition()

  const onGrantFounder = () => {
    if (!confirm('このユーザーを Founding Supporter にします (fee 0% + 認証バッジ無償付与)。よろしいですか？')) return
    startTransition(async () => {
      const r = await grantFoundingSupporterAction(userId, true)
      if (!r.ok) alert(`失敗: ${r.error}`)
    })
  }

  const onRevokeFounder = () => {
    if (!confirm('Founding Supporter を取消します (認証バッジは残ります)。よろしいですか？')) return
    startTransition(async () => {
      const r = await revokeFoundingSupporterAction(userId, false)
      if (!r.ok) alert(`失敗: ${r.error}`)
    })
  }

  const onGrantVerified = () => {
    startTransition(async () => {
      const r = await grantVerifiedBadgeAction(userId)
      if (!r.ok) alert(`失敗: ${r.error}`)
    })
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
      {!isFounder && (
        <button
          type="button"
          disabled={isPending}
          onClick={onGrantFounder}
          className="text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          + Founding
        </button>
      )}
      {isFounder && (
        <button
          type="button"
          disabled={isPending}
          onClick={onRevokeFounder}
          className="text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          − Founding 解除
        </button>
      )}
      {!isVerified && (
        <button
          type="button"
          disabled={isPending}
          onClick={onGrantVerified}
          className="text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          + Verified
        </button>
      )}
    </div>
  )
}
