import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { confirmEmailChangeAction } from '@/server/actions/auth'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function EmailConfirmPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect('/auth')

  const { token } = await searchParams
  if (!token) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="bg-white border rounded-2xl p-8 shadow-sm">
          <p className="font-bold text-gray-800 mb-2">トークンが見つかりません</p>
          <p className="text-sm text-gray-500 mb-6">
            メール内のリンクから直接開いてください。
          </p>
          <Link
            href="/dashboard/profile"
            className="inline-block bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition"
          >
            プロフィールに戻る
          </Link>
        </div>
      </div>
    )
  }

  const result = await confirmEmailChangeAction({ token })

  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center">
      <div className="bg-white border rounded-2xl p-8 shadow-sm">
        {result.success ? (
          <>
            <p className="font-bold text-gray-800 mb-2">メールアドレスを更新しました</p>
            <p className="text-sm text-gray-500 mb-6">
              新しいメールアドレス: <span className="font-medium text-gray-700">{result.newEmail}</span>
            </p>
            <p className="text-xs text-gray-400 mb-6">
              次回ログイン時から新しいメールアドレスをご利用ください。
            </p>
            <Link
              href="/dashboard/profile"
              className="inline-block bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition"
            >
              プロフィールに戻る
            </Link>
          </>
        ) : (
          <>
              <p className="font-bold text-gray-800 mb-2">変更を完了できませんでした</p>
            <p className="text-sm text-gray-500 mb-6">{result.error}</p>
            <Link
              href="/dashboard/profile"
              className="inline-block bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition"
            >
              プロフィールに戻る
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
