import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t bg-gray-50 py-10 mt-auto">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <p className="font-bold text-purple-600 mb-2">CreatorLinks</p>
            <p className="text-sm text-gray-500">
              才能あるアーティストと<br />クライアントをつなぐプラットフォーム
            </p>
          </div>
          <div>
            <p className="font-medium mb-2">サービス</p>
            <ul className="space-y-1 text-sm text-gray-500">
              <li><Link href="/artists" className="hover:text-purple-600">アーティストを探す</Link></li>
              <li><Link href="/projects" className="hover:text-purple-600">案件を探す</Link></li>
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
        </div>
        <p className="text-center text-xs text-gray-400">
          © 2026 CreatorLinks. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
