// app/dashboard/account/blocked/page.tsx — ブロック中ユーザー一覧 + 解除

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listMyBlocksAction } from '@/server/actions/block'
import { getDisplayName } from '@/lib/user'
import { formatDate } from '@/lib/utils'
import { UnblockButton } from './unblock-button'

export const dynamic = 'force-dynamic'

export default async function BlockedUsersPage() {
  const session = await auth()
  if (!session) redirect('/auth?next=/dashboard/account/blocked')

  const blocks = await listMyBlocksAction()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">ブロック中のユーザー</h1>
      <p className="text-sm text-gray-500 mb-6">
        ブロック済みの相手からはメッセージ・スカウト・応募・フォロー・通知が届かなくなります。
      </p>

      {blocks.length === 0 ? (
        <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          ブロック中のユーザーはいません。
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 overflow-hidden shrink-0">
                {b.blocked.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.blocked.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/artists/${b.blocked.id}`}
                  className="font-semibold text-gray-800 hover:text-purple-600 truncate block"
                >
                  {getDisplayName(b.blocked)}
                </Link>
                <p className="text-xs text-gray-400">ブロック: {formatDate(b.createdAt)}</p>
              </div>
              <UnblockButton targetUserId={b.blocked.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
