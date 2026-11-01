'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { unblockUserAction } from '@/server/actions/block'

export function UnblockButton({ targetUserId }: { targetUserId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    if (!confirm('ブロックを解除します。よろしいですか？')) return
    setError(null)
    startTransition(async () => {
      const r = await unblockUserAction(targetUserId)
      if (!r.success) setError(r.error)
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="px-3 py-1 text-xs rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? '解除中...' : '解除'}
      </button>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
