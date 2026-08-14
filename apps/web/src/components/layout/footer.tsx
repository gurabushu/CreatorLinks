'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SITE_NAME } from '@/lib/brand'

// サイドバー（DashboardShell / projects/manage）の下敷きになるページでは
// フッターの中身も同じぶんだけ右にオフセットしてロゴ・リンクが隠れないようにする
// サイドバー付きページのフッターは右側にオフセットしてロゴが隠れないようにする。
// サイドバーが付かないのは / と /auth 系のみ。
const SIDEBAR_ROUTES = [
  '/dashboard', '/projects', '/artists', '/events', '/admin', '/announcements',
  '/support', '/pro', '/onboarding',
]

export function Footer() {
  const pathname = usePathname()
  const hasSidebar = SIDEBAR_ROUTES.some((p) => pathname?.startsWith(p))
  const offsetClass = hasSidebar ? 'md:pl-72 lg:pl-80' : ''

  return (
    <footer className="border-t bg-gray-50 py-10 mt-auto">
      <div className={`max-w-6xl mx-auto px-4 ${offsetClass}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/logo.png"
              alt={SITE_NAME}
              width={1032}
              height={193}
              className="h-11 w-auto mb-3"
            />
            <p className="text-sm text-gray-500">
              才能あるアーティストと<br />クライアントをつなぐプラットフォーム
            </p>
          </div>
          <div>
            <p className="font-medium mb-2">サービス</p>
            <ul className="space-y-1 text-sm text-gray-500">
              <li><Link href="/artists" className="hover:text-purple-600">アーティストを探す</Link></li>
              <li><Link href="/projects" className="hover:text-purple-600">案件を探す</Link></li>
              <li><Link href="/events" className="hover:text-purple-600">イベント掲示板</Link></li>
              <li><Link href="/pro/subscribe" className="hover:text-purple-600">PRO プラン</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">アカウント</p>
            <ul className="space-y-1 text-sm text-gray-500">
              <li><Link href="/auth" className="hover:text-purple-600">ログイン / 登録</Link></li>
              <li><Link href="/dashboard" className="hover:text-purple-600">マイページ</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">サポート・規約</p>
            <ul className="space-y-1 text-sm text-gray-500">
              <li><Link href="/support" className="hover:text-purple-600">よくある質問</Link></li>
              <li><Link href="/support" className="hover:text-purple-600">お問い合わせ</Link></li>
              <li><Link href="/terms" className="hover:text-purple-600">利用規約</Link></li>
              <li><Link href="/privacy" className="hover:text-purple-600">プライバシーポリシー</Link></li>
              <li><Link href="/tokutei" className="hover:text-purple-600">特定商取引法に基づく表記</Link></li>
            </ul>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400">
          © 2026 {SITE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
