'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createFanSubscriptionAction } from '@/server/actions/subscription'

type Plan = 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

const PLAN_INFO: Record<Plan, { label: string; amount: string; description: string }> = {
  MONTHLY: { label: '月額プラン', amount: '¥500〜', description: '毎月支援を継続' },
  QUARTERLY: { label: '3ヶ月プラン', amount: '¥1,425〜', description: '5%割引でまとめ払い' },
  YEARLY: { label: '年額プラン', amount: '¥5,400〜', description: '10%割引でお得に年間支援' },
}

interface Props {
  artistId: string
  artistName: string
  success?: string
}

export default function FanSupportClient({ artistId, artistName, success }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [activePlan, setActivePlan] = useState<Plan | null>(null)

  const handleSubscribe = (plan: Plan) => {
    setError(null)
    setActivePlan(plan)
    startTransition(async () => {
      const result = await createFanSubscriptionAction(artistId, plan)
      if (result.success) {
        window.location.href = result.checkoutUrl
      } else {
        setError(result.error)
        setActivePlan(null)
      }
    })
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">支援ありがとうございます！</h1>
        <p className="text-gray-500 mb-6">アーティストへの支援が完了しました。</p>
        <button
          onClick={() => router.push(`/artists/${artistId}`)}
          className="bg-purple-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-purple-700 transition"
        >
          アーティストページへ
        </button>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <p className="text-gray-500 mb-4">ファン支援にはログインが必要です</p>
        <button
          onClick={() => router.push('/auth')}
          className="bg-purple-600 text-white px-8 py-3 rounded-lg font-bold"
        >
          ログイン / 登録
        </button>
      </div>
    )
  }

  if (session.user.role !== 'PRO' && session.user.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <p className="text-gray-500 mb-4">ファン支援は PRO ユーザーのみ利用できます</p>
        <button
          onClick={() => router.push('/pro/subscribe')}
          className="bg-amber-500 text-white px-8 py-3 rounded-lg font-bold"
        >
          PRO にアップグレード
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-2">
        {artistName} さんを支援する
      </h1>
      <p className="text-gray-500 mb-8">プランを選んで継続的にアーティストを応援しましょう</p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
          {error}
        </p>
      )}

      <div className="grid gap-4">
        {(Object.keys(PLAN_INFO) as Plan[]).map((plan) => (
          <button
            key={plan}
            onClick={() => handleSubscribe(plan)}
            disabled={isPending}
            className="w-full text-left border rounded-xl p-6 hover:border-purple-400 hover:bg-purple-50 transition disabled:opacity-50"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-lg">{PLAN_INFO[plan].label}</p>
                <p className="text-gray-500 text-sm mt-1">{PLAN_INFO[plan].description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-purple-600 font-bold text-xl">{PLAN_INFO[plan].amount}</p>
                {isPending && activePlan === plan && (
                  <span className="text-xs text-gray-400">処理中...</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        ※ Stripe Checkout にリダイレクトされます。いつでもキャンセル可能です。
      </p>
    </div>
  )
}
