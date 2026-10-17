'use client'

import { useTransition } from 'react'
import { startVerifyBadgeCheckoutAction } from '@/server/actions/verify-badge'

export function VerifyPurchaseButton() {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => startVerifyBadgeCheckoutAction())}
      className="block w-full bg-purple-600 text-white font-semibold text-lg px-6 py-4 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-60"
    >
      {pending ? '移動中…' : '¥3,000 で認証バッジを購入する'}
    </button>
  )
}
