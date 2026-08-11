// /support — 公開サポートページ
// 上部: よくある質問 (details/summary で JS 不要のアコーディオン)
// 下部: 問い合わせフォーム（ログイン済み → 公式アカウントのチャットに投稿 / 未ログイン → ログイン CTA）

import Link from 'next/link'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ContactForm } from './contact-form'

export const metadata: Metadata = {
  title: 'サポート / お問い合わせ',
  description:
    'CreatorLinks に関するよくある質問と、公式アカウントへのお問い合わせフォームです。',
}
export const dynamic = 'force-dynamic'

type Faq = { q: string; a: React.ReactNode }

const FAQS: Faq[] = [
  {
    q: 'β 版で今できること／できないことは？',
    a: (
      <>
        現在は <b>イベント告知（掲示板）／依頼管理（仕事 DX）／マッチング</b> の 3 軸機能が動作します。
        カレンダーでフォロー中アーティストの予定共有、Stripe エスクローでの支払い、依頼テンプレからの案件作成が使えます。
        <br />
        β 期間中は登録者数が少ないため、まず <Link href="/onboarding" className="text-purple-700 hover:underline">よく仕事する仲間を招待</Link>
        して LINE / DM の依頼をアプリに移す使い方がおすすめです。
      </>
    ),
  },
  {
    q: '手数料はいくらですか？',
    a: (
      <>
        案件成立時に発注額の <b>7%</b>（業界最安クラス）を頂戴しています。
        イベント告知・カレンダー・フォロー等の掲示板機能は無料でお使いいただけます。
      </>
    ),
  },
  {
    q: '支払いの流れを教えてください',
    a: (
      <>
        依頼主は案件成立時に <b>Stripe エスクロー</b> で発注額を預け、納品完了の相互確認後にアーティストへ送金されます。
        Stripe Connect のアカウント接続が必要です。詳細は <Link href="/dashboard/payouts" className="text-purple-700 hover:underline">受取設定</Link> から。
      </>
    ),
  },
  {
    q: '創設メンバー枠とは？',
    a: (
      <>
        先着 100 名に <b>PRO プラン 6 ヶ月無料 + 永久バッジ</b> を進呈しています。
        β 版で早期にフィードバックをくださる方への感謝プランです。
      </>
    ),
  },
  {
    q: 'アカウントを削除したい',
    a: (
      <>
        <Link href="/dashboard/account" className="text-purple-700 hover:underline">アカウント設定</Link>
        ページ下部の「アカウント削除」から削除できます。進行中の案件や未受取の支払いがある場合は完了後に削除してください。
      </>
    ),
  },
  {
    q: 'メールが届かない / パスワードを忘れた',
    a: (
      <>
        パスワードリセットは <Link href="/auth/forgot" className="text-purple-700 hover:underline">こちら</Link> から。
        メールが届かない場合は迷惑メールフォルダをご確認いただき、それでも見当たらない場合は下記フォームから
        「アカウント」カテゴリでお問い合わせください。
      </>
    ),
  },
]

export default async function SupportPage() {
  const session = await auth()

  // ゲストは公式チャットが使えないため通常フォームは非表示
  let isGuest = false
  if (session) {
    const me = await prisma.user
      .findUnique({ where: { id: session.user.id }, select: { isGuest: true } })
      .catch(() => null)
    isGuest = me?.isGuest ?? false
  }

  const canSubmit = !!session && !isGuest

  return (
    <div className="max-w-3xl mx-auto py-10 sm:py-14 px-4">
      <div className="mb-8">
        <span className="inline-block text-xs font-bold tracking-wider text-purple-600 bg-purple-50 border border-purple-200/70 px-3 py-1 rounded-full mb-3">
          サポート
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          お困りごと・ご要望をお聞かせください
        </h1>
        <p className="text-gray-600 mt-3 leading-relaxed">
          まず下の <b>よくある質問</b> をご確認いただき、解決しない場合は
          フォームから公式アカウントへお問い合わせください。
        </p>
      </div>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-800 mb-4">よくある質問</h2>
        <ul className="space-y-2">
          {FAQS.map((f, i) => (
            <li key={i}>
              <details className="group rounded-xl border border-gray-200 bg-white open:border-purple-300 open:shadow-sm transition">
                <summary className="cursor-pointer list-none px-4 py-3.5 flex items-center justify-between gap-3 font-medium text-gray-800">
                  <span>{f.q}</span>
                  <span
                    aria-hidden
                    className="shrink-0 text-purple-500 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">
                  {f.a}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      {/* 問い合わせフォーム */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-4">お問い合わせフォーム</h2>
        {canSubmit ? (
          <div className="rounded-2xl border border-purple-100 bg-white p-5 sm:p-6">
            <ContactForm />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/40 p-6 text-center">
            {isGuest ? (
              <>
                <p className="text-sm text-gray-700 mb-3">
                  ゲストアカウントではお問い合わせフォームをご利用いただけません。
                  正式登録のうえでご送信ください。
                </p>
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-md hover:shadow-lg hover:opacity-95 transition"
                >
                  正式登録する →
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-700 mb-3">
                  お問い合わせにはログインが必要です。
                  <br />
                  ログイン後、公式アカウントとのチャットとして送信・追記できます。
                </p>
                <Link
                  href="/auth?callbackUrl=%2Fsupport"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-md hover:shadow-lg hover:opacity-95 transition"
                >
                  ログインして問い合わせる →
                </Link>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
