// app/pro/subscribe/page.tsx — プロプラン登録
'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { trpc } from '@/lib/trpc'

function ProSubscribeContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const [redirecting, setRedirecting] = useState(false)

  const createCheckout = trpc.subscription.createProCheckout.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    },
    onError: (err) => {
      alert(err.message)
      setRedirecting(false)
    },
  })

  // 登録完了後
  if (success) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-2xl font-bold mb-2">PRO プラン登録完了！</h1>
        <p className="text-gray-500 mb-8">
          おめでとうございます。PRO プランが有効になりました。
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-purple-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-purple-700 transition"
        >
          ダッシュボードへ
        </button>
      </div>
    )
  }

  // すでに PRO
  if (session?.user?.role === 'PRO') {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="text-5xl mb-4">⭐</div>
        <h1 className="text-xl font-bold mb-2">すでに PRO プランです</h1>
        <p className="text-gray-500 mb-6">PRO 特典をフルでご利用いただけます。</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-purple-600 text-white px-8 py-3 rounded-lg font-bold"
        >
          ダッシュボードへ
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <span className="inline-block bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1 rounded-full mb-4">
          β 期間中 初月無料
        </span>
        <h1 className="text-3xl font-bold mb-2">PRO プランに登録する</h1>
        <p className="text-gray-500">月額 ¥980 で優先表示・ファン支援機能が使えます</p>
      </div>

      {/* 特典リスト */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-8 mb-8">
        <h2 className="font-bold text-lg mb-5">PRO プランの特典</h2>
        <div className="space-y-4">
          {[
            { icon: '🔝', title: '案件一覧での優先表示', desc: '検索結果の上位に PROマーク付きで掲載' },
            { icon: '💝', title: 'ファン支援サブスク機能', desc: 'ファンから継続的な支援を受けられる' },
            { icon: '🤖', title: 'レコメンドアルゴリズム優遇', desc: 'AIマッチングでの上位掲載' },
            { icon: '💸', title: '手数料 10%（業界最安）', desc: '他プラットフォームの半分以下' },
          ].map((item) => (
            <div key={item.title} className="flex gap-4 items-start">
              <div className="text-2xl flex-shrink-0">{item.icon}</div>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 料金カード */}
      <div className="border-2 border-purple-400 rounded-2xl p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
          おすすめ
        </div>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-4xl font-bold text-purple-700">¥980</span>
          <span className="text-gray-500">/ 月</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">β 期間中は初月無料。いつでもキャンセル可能。</p>
        <p className="text-xs text-gray-400">税込。Stripe で安全に決済。</p>
      </div>

      {/* 登録ボタン */}
      {!session ? (
        <button
          onClick={() => router.push('/auth')}
          className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition"
        >
          ログインして登録する
        </button>
      ) : (
        <button
          onClick={() => {
            setRedirecting(true)
            createCheckout.mutate()
          }}
          disabled={redirecting || createCheckout.isPending}
          className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {redirecting || createCheckout.isPending ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Stripe へリダイレクト中...
            </>
          ) : (
            'PRO プランに登録する →'
          )}
        </button>
      )}

      <p className="text-xs text-gray-400 text-center mt-4">
        Stripe の安全な決済ページへ遷移します
      </p>
    </div>
  )
}

export default function ProSubscribePage() {
  return (
    <Suspense>
      <ProSubscribeContent />
    </Suspense>
  )
}
