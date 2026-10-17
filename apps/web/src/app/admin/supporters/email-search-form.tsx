'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function EmailSearchForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter()
  const [email, setEmail] = useState(initialEmail)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = email.trim()
    if (!q) {
      router.push('/admin/supporters')
    } else {
      router.push(`/admin/supporters?email=${encodeURIComponent(q)}`)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="search"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス (部分一致)"
        className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
      />
      <button
        type="submit"
        className="text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
      >
        検索
      </button>
    </form>
  )
}
