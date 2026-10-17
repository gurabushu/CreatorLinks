import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { VerifyPurchaseButton } from './VerifyPurchaseButton'
import { VERIFY_BADGE_PRICE_YEN } from '@/lib/verify-badge'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '認証バッジを取得' }

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/auth')

  const sp = await searchParams
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { isVerified: true, isFounderExempt: true },
  })

  if (user.isFounderExempt) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <h1 className="text-xl font-bold mb-2">Founding Supporter 枠が有効です</h1>
        <p className="text-zinc-500 mb-6">
          認証バッジは無償で付与されており、追加の購入は不要です。
        </p>
        <a
          href="/dashboard"
          className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-purple-700 transition"
        >
          ダッシュボードへ
        </a>
      </div>
    )
  }

  if (user.isVerified) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <h1 className="text-xl font-bold mb-2">認証バッジが有効です</h1>
        <p className="text-zinc-500 mb-6">永年バッジが付与されています。追加の購入は不要です。</p>
        <a
          href="/dashboard"
          className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-purple-700 transition"
        >
          ダッシュボードへ
        </a>
      </div>
    )
  }

  if (sp.success) {
    // webhook 反映に数秒ラグがあるため、isVerified=false のまま success 戻りすることがある。
    // そのケース用の案内（この分岐に来るのは user.isVerified===false のときのみ）
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <h1 className="text-2xl font-bold mb-2">お支払いありがとうございます</h1>
        <p className="text-zinc-500 mb-6">
          決済の反映後、ダッシュボードに認証バッジが表示されます（数秒〜1 分ほど）。
        </p>
        <a
          href="/dashboard"
          className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-purple-700 transition"
        >
          ダッシュボードへ
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">認証バッジを取得</h1>
        <p className="text-zinc-500">¥{VERIFY_BADGE_PRICE_YEN.toLocaleString()}（買切・永年）</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 p-6 mb-8 bg-white">
        <h2 className="text-lg font-bold mb-3">このバッジが示すこと</h2>
        <ul className="text-sm text-zinc-700 space-y-2 list-disc pl-5">
          <li>プロフィール・案件一覧で認証バッジが表示されます</li>
          <li>一回払い（¥3,000・税込）、更新や月額課金はありません</li>
          <li>月額サブスクではなく任意の濾過剤。登録・案件機能は無償のまま使えます</li>
          <li>手数料率には影響しません（全員 7% のまま、恩人枠のみ 0%）</li>
        </ul>
      </div>

      {sp.canceled && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          決済はキャンセルされました。もう一度購入する場合は下のボタンから進めます。
        </div>
      )}

      <VerifyPurchaseButton />

      <p className="mt-6 text-xs text-zinc-500 text-center">
        ※ 決済は Stripe を使用します。カード情報は EncoreCue では保持しません。
      </p>
    </div>
  )
}
