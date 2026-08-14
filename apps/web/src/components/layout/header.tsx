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
        <div className="h-16 sm:h-20 flex items-center gap-2 sm:gap-4">
          <Link href="/" className="shrink-0" aria-label={SITE_NAME}>
            <Image
              src="/logo.png"
              alt={SITE_NAME}
              width={1032}
              height={193}
              priority
              className="h-11 sm:h-14 w-auto"
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

          {/* SP〜タブレット (lg 未満): 主要導線のみ短縮表示 */}
          <nav className="flex lg:hidden items-center gap-1.5 sm:gap-2 text-xs sm:text-sm shrink-0">
            <Link
              href="/artists"
              className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/70 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <span>クリエイター</span>
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/70 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors whitespace-nowrap"
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
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/70 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  aria-label="仲間を招待"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M19 8v6M22 11h-6" />
                  </svg>
                  <span className="hidden sm:inline">仲間を招待</span>
                  <span className="sm:hidden">招待</span>
                </Link>
                <NotificationBell userId={session.user.id} />
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
                    className="text-[11px] sm:text-sm border border-gray-300 px-2 sm:px-4 py-1 sm:py-2 rounded-lg hover:bg-gray-50 transition whitespace-nowrap"
                  >
                    ログアウト
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
                  className="text-[11px] sm:text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold px-2.5 sm:px-4 py-1 sm:py-2 rounded-lg shadow-sm hover:opacity-95 transition whitespace-nowrap"
                >
                  無料で始める
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
