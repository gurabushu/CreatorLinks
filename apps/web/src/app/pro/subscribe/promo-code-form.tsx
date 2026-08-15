'use client'

import { useState, useTransition } from 'react'
import { redeemPromoCodeAction } from '@/server/actions/promo'

// プロモコード redeem 用の入力欄。認証済みが前提。
// 成功したら永年無料 PRO に切り替わるので、page reload で状態を反映させる
export function PromoCodeForm({ compact = false }: { compact?: boolean }) {
  const [code, setCode] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pending || !code.trim()) return
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await redeemPromoCodeAction(code)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(result.label ?? 'コードを適用しました。永年無料 PRO が有効化されました。')
      setCode('')
      // 状態反映のため少し待って reload
      setTimeout(() => window.location.reload(), 1200)
    })
  }

  return (
    <div
      className={`border rounded-2xl bg-white ${compact ? 'p-5' : 'p-6'}`}
    >
      <p className={`font-bold ${compact ? 'text-sm mb-1' : 'text-base mb-2'}`}>
        特典コードをお持ちの方
      </p>
      <p className={`text-gray-500 ${compact ? 'text-xs mb-3' : 'text-sm mb-4'}`}>
        コードを入力すると、月額料金が永年無料の PRO プランに切り替わります。
        受注案件の手数料は自動で 5%（通常 7%）に減額されます。
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="例: FOUNDING2027"
          maxLength={64}
          disabled={pending || !!success}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 disabled:bg-gray-50 disabled:text-gray-400"
        />
        <button
          type="submit"
          disabled={pending || !!success || !code.trim()}
          className="bg-purple-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-purple-700 transition disabled:opacity-50 whitespace-nowrap"
        >
          {pending ? '確認中...' : success ? '適用済み' : '適用する'}
        </button>
      </form>
      {error && (
        <p className="text-xs text-red-600 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-emerald-700 mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          ✓ {success}
        </p>
      )}
    </div>
  )
}
