'use client'

// PromoCode 発行フォーム + 各行の操作 UI

import { useState, useTransition } from 'react'
import {
  createPromoCodeAction,
  deletePromoCodeAction,
  expirePromoCodeAction,
  type AdminPromoResult,
} from '@/server/actions/admin-promo'

export function NewPromoCodeForm() {
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [maxRedemptions, setMaxRedemptions] = useState<string>('') // 空文字 = 無制限
  const [expiresAt, setExpiresAt] = useState('') // datetime-local
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<AdminPromoResult | null>(null)

  const submit = () => {
    setResult(null)
    startTransition(async () => {
      const r = await createPromoCodeAction({
        code,
        label: label || undefined,
        maxRedemptions: maxRedemptions === '' ? null : Number(maxRedemptions),
        expiresAt: expiresAt || null,
      })
      setResult(r)
      if (r.success) {
        setCode('')
        setLabel('')
        setMaxRedemptions('')
        setExpiresAt('')
      }
    })
  }

  const generateSuggestion = () => {
    const now = new Date()
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
    setCode(`GIFT-${yyyymm}-${rand}`)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            コード <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="例: GIFT-202608-A1B2"
              maxLength={32}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase"
            />
            <button
              type="button"
              onClick={generateSuggestion}
              className="text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 px-3 py-2 rounded-lg transition whitespace-nowrap"
              title="ランダム生成"
            >
              🎲 自動生成
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">英数字と - _ のみ、4〜32 文字</p>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">ラベル（管理用メモ）</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="例: 山田さん向け永年無料"
            maxLength={100}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">最大 redeem 回数</label>
          <input
            type="number"
            min={1}
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            placeholder="空欄=無制限"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-[11px] text-gray-400 mt-1">恩人向け 1 名なら 1、キャンペーン全体なら 100 など</p>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">有効期限</label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-[11px] text-gray-400 mt-1">空欄=無期限</p>
        </div>
      </div>

      {result && (
        <div
          className={`text-sm px-4 py-2 rounded-lg border ${
            result.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {result.success ? (result.message ?? '発行しました') : `❌ ${result.error}`}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !code}
        className="text-sm bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? '発行中…' : 'コードを発行する'}
      </button>
    </form>
  )
}

export function PromoCodeActions({
  codeId,
  redemptionCount,
  isActive,
}: {
  codeId: string
  redemptionCount: number
  isActive: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState<'expire' | 'delete' | null>(null)

  const run = (fn: () => Promise<AdminPromoResult>) => {
    startTransition(async () => {
      const r = await fn()
      if (!r.success) alert(r.error)
      setConfirming(null)
    })
  }

  // 未使用なら削除可能、使用済みなら expire のみ
  if (redemptionCount > 0) {
    return isActive ? (
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          confirming === 'expire' ? run(() => expirePromoCodeAction(codeId)) : setConfirming('expire')
        }
        className={`text-[10px] font-bold px-2 py-1 rounded transition disabled:opacity-50 ${
          confirming === 'expire'
            ? 'bg-red-600 text-white'
            : 'bg-white text-red-700 border border-red-300 hover:bg-red-50'
        }`}
      >
        {confirming === 'expire' ? '確定' : '無効化'}
      </button>
    ) : (
      <span className="text-[10px] text-gray-400">—</span>
    )
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        confirming === 'delete' ? run(() => deletePromoCodeAction(codeId)) : setConfirming('delete')
      }
      className={`text-[10px] font-bold px-2 py-1 rounded transition disabled:opacity-50 ${
        confirming === 'delete'
          ? 'bg-red-600 text-white'
          : 'bg-white text-red-700 border border-red-300 hover:bg-red-50'
      }`}
    >
      {confirming === 'delete' ? '確定' : '削除'}
    </button>
  )
}
