'use client'

import { useState, useTransition } from 'react'

type Props = {
  userId: string
}

// RevenueCat Web Billing の SDK は動的 import する。
// - ビルド時に @revenuecat/purchases-js が無くても Next.js のバンドルが壊れないように
// - サーバー側で評価されないように
export function ProCheckoutClient({ userId }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const publicApiKey = process.env.NEXT_PUBLIC_REVENUECAT_WEB_BILLING_PUBLIC_API_KEY
  const offeringId = process.env.NEXT_PUBLIC_REVENUECAT_PRO_OFFERING_ID // 例: "default"

  const handleCheckout = () => {
    setError(null)
    startTransition(async () => {
      if (!publicApiKey) {
        setError('決済が設定されていません。運営にお問い合わせください。')
        return
      }
      try {
        const { Purchases } = await import('@revenuecat/purchases-js')
        Purchases.configure({ apiKey: publicApiKey, appUserId: userId })

        const offerings = await Purchases.getSharedInstance().getOfferings()
        const offering = offeringId
          ? offerings.all[offeringId]
          : offerings.current
        const pkg = offering?.availablePackages?.[0]
        if (!pkg) {
          setError('現在購入できるプランがありません。')
          return
        }

        await Purchases.getSharedInstance().purchase({ rcPackage: pkg })

        // 購入完了。Webhook 経由で User.role が PRO に更新される。
        // 楽観的に success ページへ遷移する（ロール反映は次回セッションで反映）
        window.location.href = '/pro/subscribe?success=1'
      } catch (e) {
        setError((e as { message?: string })?.message ?? '決済に失敗しました。')
      }
    })
  }

  return (
    <>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-center">
          {error}
        </p>
      )}
      <button
        onClick={handleCheckout}
        disabled={isPending}
        className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-3"
      >
        {isPending ? (
          <>
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            決済ページを準備中...
          </>
        ) : (
          'PRO プランに登録する →'
        )}
      </button>
      <p className="text-xs text-gray-400 text-center mt-4">
        RevenueCat の安全な決済フォームが表示されます
      </p>
    </>
  )
}
