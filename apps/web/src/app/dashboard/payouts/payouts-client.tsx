'use client'

import { useTransition } from 'react'
import {
  refreshConnectStatusAction,
  startConnectOnboardingAction,
} from '@/server/actions/payouts'

type Props = {
  hasAccount: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  completedAt: string | null
}

export function PayoutsClient({
  hasAccount,
  chargesEnabled,
  payoutsEnabled,
  completedAt,
}: Props) {
  const [starting, startTransition] = useTransition()
  const [refreshing, refreshTransition] = useTransition()

  const ready = chargesEnabled && payoutsEnabled

  return (
    <div className="border rounded-2xl p-6 bg-white space-y-5">
      {!hasAccount ? (
        <>
          <StatusBadge state="none" />
          <p className="text-sm text-gray-600">
            まだ Stripe アカウントに接続されていません。ボタンを押すと Stripe のホスト画面に移動し、
            本人情報と入金先口座を登録できます。
          </p>
        </>
      ) : ready ? (
        <>
          <StatusBadge state="ready" />
          {completedAt && (
            <p className="text-sm text-gray-500">
              有効化日: {new Date(completedAt).toLocaleDateString('ja-JP')}
            </p>
          )}
          <p className="text-sm text-gray-600">
            報酬の受け取り準備が完了しています。案件完了後、クライアントの送金確認をもって入金されます。
          </p>
        </>
      ) : (
        <>
          <StatusBadge state="incomplete" />
          <ul className="text-sm space-y-1">
            <li className={chargesEnabled ? 'text-emerald-700' : 'text-amber-700'}>
              {chargesEnabled ? '✓' : '⚠'} 支払い受付
            </li>
            <li className={payoutsEnabled ? 'text-emerald-700' : 'text-amber-700'}>
              {payoutsEnabled ? '✓' : '⚠'} 銀行口座への出金
            </li>
          </ul>
          <p className="text-sm text-gray-600">
            必要な情報が揃っていません。「設定を続ける」から Stripe に戻って残りを入力してください。
          </p>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={() => startTransition(() => startConnectOnboardingAction())}
          disabled={starting}
          className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition disabled:opacity-50"
        >
          {starting
            ? '準備中...'
            : !hasAccount
              ? 'Stripe で銀行口座を登録する →'
              : ready
                ? '登録情報を編集する'
                : '設定を続ける →'}
        </button>
        {hasAccount && (
          <button
            type="button"
            onClick={() => refreshTransition(() => refreshConnectStatusAction())}
            disabled={refreshing}
            className="w-full sm:w-auto border border-gray-300 text-gray-700 px-5 py-3 rounded-xl font-medium hover:bg-gray-50 transition disabled:opacity-50"
            title="Stripe 側の最新ステータスを取得します"
          >
            {refreshing ? '更新中...' : '状態を更新'}
          </button>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ state }: { state: 'none' | 'incomplete' | 'ready' }) {
  const config =
    state === 'ready'
      ? { label: '設定完了', className: 'bg-emerald-100 text-emerald-800' }
      : state === 'incomplete'
        ? { label: '設定中', className: 'bg-amber-100 text-amber-800' }
        : { label: '未設定', className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${config.className}`}>
      {config.label}
    </span>
  )
}
