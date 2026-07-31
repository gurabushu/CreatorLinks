import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { auth, signOut } from '@/lib/auth'
import { NotificationBell } from '@/components/notifications/notification-bell'

export async function Header() {
  let session: Session | null = null
  try {
    session = await auth()
  } catch {
    // auth unavailable — show logged-out state
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        <Link href="/" className="shrink-0" aria-label="CreatorLinks">
          <Image
            src="/logo.png"
            alt="CreatorLinks"
            width={1032}
            height={193}
            priority
            className="h-7 sm:h-9 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm shrink-0">
          <Link href="/#features" className="text-gray-600 hover:text-purple-600 transition">
            機能紹介
          </Link>
          <Link href="/#how-it-works" className="text-gray-600 hover:text-purple-600 transition">
            ご利用の流れ
          </Link>
          <Link href="/#pricing" className="text-gray-600 hover:text-purple-600 transition">
            料金プラン
          </Link>
          <Link href="/#faq" className="text-gray-600 hover:text-purple-600 transition">
            よくある質問
          </Link>
        </nav>

        <nav className="flex md:hidden items-center gap-3 text-xs shrink-0">
          <Link href="/artists" className="text-gray-600 hover:text-purple-600 transition">
            アーティスト
          </Link>
          <Link href="/projects" className="text-gray-600 hover:text-purple-600 transition">
            案件
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto">
          {session ? (
            <>
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
    </header>
  )
}
