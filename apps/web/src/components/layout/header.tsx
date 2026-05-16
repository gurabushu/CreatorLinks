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
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-purple-600">
          CreatorLinks
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/artists" className="text-gray-600 hover:text-purple-600 transition">
            アーティスト
          </Link>
          <Link href="/projects" className="text-gray-600 hover:text-purple-600 transition">
            案件
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-purple-600 transition"
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
                  className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  ログアウト
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className="text-sm text-gray-600 hover:text-purple-600 transition"
              >
                ログイン
              </Link>
              <Link
                href="/auth"
                className="text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
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
