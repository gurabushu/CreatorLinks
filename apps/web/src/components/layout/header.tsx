import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { auth, signOut } from '@/lib/auth'

export async function Header() {
  let session: Awaited<ReturnType<typeof auth>> = null
  try {
    session = await auth()
  } catch {
    // auth unavailable — show logged-out state
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        <Link href="/" className="font-bold text-base sm:text-xl text-purple-600 shrink-0">
          CreatorLinks
        </Link>

        <nav className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm shrink-0">
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
              <Link
                href="/dashboard"
                className="hidden sm:inline text-sm text-gray-600 hover:text-purple-600 transition"
              >
                マイページ
              </Link>
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
                className="hidden sm:inline text-sm text-gray-600 hover:text-purple-600 transition"
              >
                ログイン
              </Link>
              <Link
                href="/auth"
                className="text-[11px] sm:text-sm bg-purple-600 text-white px-2.5 sm:px-4 py-1 sm:py-2 rounded-lg hover:bg-purple-700 transition whitespace-nowrap"
              >
                無料登録
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
