'use client'

// Payment 詳細ページの操作 UI（Client Component）。
// Server Action を呼び、結果を toast 風に表示。

import { useState, useTransition } from 'react'
import {
  syncPaymentFromStripeAction,
  adminReleasePaymentAction,
  adminRefundPaymentAction,
  type AdminActionResult,
} from '@/server/actions/admin-payments'

type Props = {
  paymentId: string
  currentStatus: string
}

export function PaymentAdminActions({ paymentId, currentStatus }: Props) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<AdminActionResult | null>(null)
  const [confirmingAction, setConfirmingAction] = useState<'release' | 'refund' | null>(null)

  const run = (fn: () => Promise<AdminActionResult>) => {
    setResult(null)
    startTransition(async () => {
      try {
        const r = await fn()
        setResult(r)
      } catch (e) {
        setResult({ success: false, error: (e as Error).message })
      }
    })
  }

  return (
    <div className="bg-white border rounded-2xl p-6 space-y-4">
      <h2 className="font-bold">操作</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Stripe sync — 常時可能 */}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => syncPaymentFromStripeAction(paymentId))}
          className="text-sm bg-white text-purple-700 border border-purple-300 hover:bg-purple-50 px-4 py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 Stripe と同期
        </button>

        {/* Release — HELD のみ */}
        {currentStatus === 'HELD' && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              confirmingAction === 'release'
                ? run(() => adminReleasePaymentAction(paymentId))
                : setConfirmingAction('release')
            }
            className={`text-sm px-4 py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed ${
              confirmingAction === 'release'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            {confirmingAction === 'release' ? '✅ 確定: 送金する' : '💸 手動 release'}
          </button>
        )}

        {/* Refund — HELD のみ */}
        {currentStatus === 'HELD' && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              confirmingAction === 'refund'
                ? run(() => adminRefundPaymentAction(paymentId))
                : setConfirmingAction('refund')
            }
            className={`text-sm px-4 py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed ${
              confirmingAction === 'refund'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-white text-red-700 border border-red-300 hover:bg-red-50'
            }`}
          >
            {confirmingAction === 'refund' ? '⚠️ 確定: 返金する' : '↩️ 手動 refund'}
          </button>
        )}
      </div>

      {confirmingAction && (
        <p className="text-xs text-gray-500">
          もう一度クリックで確定します。キャンセルするならボタンから離れてください。
        </p>
      )}

      {pending && (
        <p className="text-sm text-gray-500">実行中…</p>
      )}

      {result && (
        <div
          className={`text-sm px-4 py-3 rounded-xl border ${
            result.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {result.success ? (result.message ?? '成功') : `❌ ${result.error}`}
        </div>
      )}
    </div>
  )
}
