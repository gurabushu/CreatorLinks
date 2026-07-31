'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ProCheckoutClient } from './pro-checkout-client'

function ProSubscribeContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const success = searchParams.get('success')

  if (success) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <h1 className="text-2xl font-bold mb-2">PRO プラン登録完了</h1>
        <p className="text-gray-500 mb-8">
          ご登録ありがとうございます。決済の反映後、PRO 特典が有効になります。
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

  if (session?.user?.role === 'PRO') {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
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
        <h1 className="text-3xl font-bold mb-2">PRO プランに登録する</h1>
        <p className="text-gray-500">月額 ¥980 で優先表示・レコメンド優遇が使えます</p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-8 mb-8">
        <h2 className="font-bold text-lg mb-5">PRO プランの特典</h2>
        <div className="space-y-4">
          {[
            { title: '案件一覧での優先表示', desc: '検索結果の上位に PRO マーク付きで掲載' },
            { title: 'レコメンドアルゴリズム優遇', desc: 'AI マッチングでの上位掲載' },
            { title: '手数料 7%（業界最安）', desc: '他プラットフォームの1/3以下' },
          ].map((item) => (
            <div key={item.title} className="flex gap-4 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-2.5 shrink-0" />
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-2 border-purple-400 rounded-2xl p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
          おすすめ
        </div>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-4xl font-bold text-purple-700">¥980</span>
          <span className="text-gray-500">/ 月</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">いつでもキャンセル可能。</p>
        <p className="text-xs text-gray-400">税込。RevenueCat による安全な決済。</p>
      </div>

      {!session ? (
        <button
          onClick={() => router.push('/auth')}
          className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition"
        >
          ログインして登録する
        </button>
      ) : (
        <ProCheckoutClient userId={session.user.id} />
      )}
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
