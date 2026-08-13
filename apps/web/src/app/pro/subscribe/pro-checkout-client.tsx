'use client'

// PRO プラン新規受付は一時停止中。UI・特典説明・価格表示は残しつつボタンだけ操作不可。
// 再開時は git 履歴から RevenueCat checkout 実装（handleCheckout / @revenuecat/purchases-js 動的 import）を復帰させる。

type Props = {
  userId: string
}

export function ProCheckoutClient(_props: Props) {
  return (
    <>
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="w-full bg-gray-200 text-gray-500 py-4 rounded-xl font-bold text-lg cursor-not-allowed"
      >
        準備中
      </button>
      <p className="text-xs text-gray-400 text-center mt-4">
        現在このプランは新規受付を一時停止しています
      </p>
    </>
  )
}
