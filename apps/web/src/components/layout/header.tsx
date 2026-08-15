import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { auth, signOut } from '@/lib/auth'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { SITE_NAME } from '@/lib/brand'

export async function Header() {
  let session: Session | null = null
  try {
    session = await auth()
  } catch {
    // auth unavailable — show logged-out state
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        <div className="h-14 sm:h-16 md:h-20 lg:h-24 flex items-center gap-2 sm:gap-4">
          {/* ロゴは横長 (5.3:1)。モバイルで大きすぎるとナビ・認証ボタンを押し出すため段階的に拡大。
              max-w も安全網として噛ませ、極端に狭いビューポートで overflow しないようにする。 */}
          <Link href="/" className="shrink-0 min-w-0" aria-label={SITE_NAME}>
            <Image
              src="/logo.png"
              alt={SITE_NAME}
              width={1032}
              height={193}
              priority
              className="h-9 sm:h-11 md:h-14 lg:h-16 w-auto max-w-[45vw] sm:max-w-none"
            />
          </Link>

          {/* PC (lg 以上): 主要導線 + 下層メニュー 併記（未ログイン時のみサービス紹介を出す） */}
          <nav className="hidden lg:flex items-center gap-2.5 text-sm shrink-0">
            <Link
              href="/artists"
              className="inline-flex items-center gap-1.5 font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/70 px-3.5 py-1.5 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <span>クリエイターを探す</span>
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/70 px-3.5 py-1.5 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>案件を探す</span>
            </Link>
            {!session && (
              <>
                <span aria-hidden className="h-4 w-px bg-gray-200 mx-1" />
                <Link href="/#features" className="text-gray-500 hover:text-purple-600 transition-colors px-1">
                  機能紹介
                </Link>
                <Link href="/#how-it-works" className="text-gray-500 hover:text-purple-600 transition-colors px-1">
                  ご利用の流れ
                </Link>
                <Link href="/#pricing" className="text-gray-500 hover:text-purple-600 transition-colors px-1">
                  料金プラン
                </Link>
                <Link href="/#faq" className="text-gray-500 hover:text-purple-600 transition-colors px-1">
                  よくある質問
                </Link>
              </>
            )}
          </nav>

          {/* タブレット (sm 以上 lg 未満): 主要導線のみ短縮表示。
              SP (< sm) では見切れ防止のため非表示（Hero に CTA が並ぶので導線損失は最小）。 */}
          <nav className="hidden sm:flex lg:hidden items-center gap-2 text-sm shrink-0">
            <Link
              href="/artists"
              className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/70 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <span>クリエイター</span>
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/70 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>案件</span>
            </Link>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto">
            {session ? (
              <>
                {/* 招待ボタン: SP はアイコンのみ (幅節約)、sm 以上はテキスト付き */}
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/70 p-2 sm:px-3 sm:py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  aria-label="仲間を招待"
                  title="仲間を招待"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M19 8v6M22 11h-6" />
                  </svg>
                  <span className="hidden sm:inline">仲間を招待</span>
                </Link>
                <NotificationBell userId={session.user.id} />
                {/* アカウント名 → /dashboard/profile への導線。
                    SP はイニシャル 1 文字だけの円アイコン、sm 以上は名前も表示。 */}
                <Link
                  href="/dashboard/profile"
                  className="inline-flex items-center gap-1.5 sm:gap-2 text-sm text-gray-700 hover:text-purple-700 transition-colors font-medium min-w-0 max-w-[140px] sm:max-w-[180px] shrink-0"
                  aria-label="マイプロフィール"
                  title={session.user.name}
                >
                  <span
                    aria-hidden
                    className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs sm:text-sm font-bold uppercase"
                  >
                    {(session.user.name?.trim()?.[0] ?? '?')}
                  </span>
                  <span className="hidden sm:inline truncate">
                    {session.user.name ?? 'マイページ'}
                  </span>
                </Link>
                {/* ログアウト: SP はアイコンのみ (log-out アイコン)、sm 以上はテキスト */}
                <form
                  action={async () => {
                    'use server'
                    await signOut({ redirect: false })
                    revalidatePath('/', 'layout')
                    redirect('/')
                  }}
                >
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 text-[11px] sm:text-sm border border-gray-300 p-2 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-50 transition whitespace-nowrap"
                    aria-label="ログアウト"
                    title="ログアウト"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span className="hidden sm:inline">ログアウト</span>
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="hidden sm:inline text-sm border border-purple-600 text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-50 transition"
                >
                  ログイン
                </Link>
                <Link
                  href="/auth"
                  className="text-[11px] sm:text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm hover:opacity-95 transition whitespace-nowrap"
                >
                  <span className="sm:hidden">登録</span>
                  <span className="hidden sm:inline">無料で始める</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
