// オンボーディング: サインアップ直後の「よく仕事する仲間を招待」ステップ
// 岩田さんフィードバック: β では既存関係を LINE/DM からアプリに移す価値検証が最優先。

import Link from 'next/link'
import { redirect } from 'next/navigation'
import QRCode from 'qrcode'
import { auth } from '@/lib/auth'
import { APP_URL } from '@/lib/resend'
import { InviteShare } from './invite-share'

export const dynamic = 'force-dynamic'
export const metadata = { title: '仕事仲間を招待' }

export default async function OnboardingPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  const inviteUrl = `${APP_URL}/auth?ref=${session.user.id}`
  const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
    width: 320,
    margin: 1,
    color: { dark: '#4c1d95', light: '#ffffff' },
  })

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-14 px-4">
      <div className="mb-8">
        <span className="inline-block text-xs font-bold tracking-wider text-purple-600 bg-purple-50 border border-purple-200/70 px-3 py-1 rounded-full mb-3">
          ようこそ 🎉
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
          よく仕事する仲間を、
          <br className="sm:hidden" />
          最初に招待しよう。
        </h1>
        <p className="text-gray-600 mt-4 leading-relaxed">
          β 期間中は、すでに <b>LINE や DM で仕事をお願いし合っている人たち</b> を招待して、
          <b>そのやり取りをアプリに移す</b> と価値を実感しやすいです。
          <br />
          ミュージシャン・発注者・スタッフ、思いつく人を数人だけでも呼んでみましょう。
        </p>
      </div>

      <InviteShare inviteUrl={inviteUrl} qrDataUrl={qrDataUrl} />

      <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
        >
          あとで招待する（スキップ）
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-md hover:shadow-lg hover:opacity-95 transition"
        >
          ダッシュボードへ <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  )
}
