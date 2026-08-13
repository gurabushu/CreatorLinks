// /admin/announcements — お知らせ配信管理（ADMIN のみ）
// 一覧: DRAFT / SCHEDULED / PUBLISHED / EXPIRED を状態バッジ付きで表示

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = { title: 'お知らせ配信 | Admin' }
export const dynamic = 'force-dynamic'

type Status = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'EXPIRED'

function computeStatus(publishedAt: Date | null, expiresAt: Date | null, now: Date): Status {
  if (!publishedAt) return 'DRAFT'
  if (publishedAt.getTime() > now.getTime()) return 'SCHEDULED'
  if (expiresAt && expiresAt.getTime() <= now.getTime()) return 'EXPIRED'
  return 'PUBLISHED'
}

const STATUS_LABEL: Record<Status, string> = {
  DRAFT: '下書き',
  SCHEDULED: '予約',
  PUBLISHED: '公開中',
  EXPIRED: '期限切れ',
}
const STATUS_CLASS: Record<Status, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-amber-100 text-amber-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-red-100 text-red-700',
}

function fmt(d: Date | null): string {
  if (!d) return '—'
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default async function AdminAnnouncementsPage() {
  const session = await auth()
  if (!session) redirect('/auth')
  if (session.user.role !== 'ADMIN') redirect('/')

  const now = new Date()
  const items = await prisma.announcement
    .findMany({
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    })
    .catch(() => [])

  const rows = items.map((a) => ({
    ...a,
    status: computeStatus(a.publishedAt, a.expiresAt, now),
  }))

  const counts = rows.reduce(
    (acc, r) => {
      acc[r.status]++
      return acc
    },
    { DRAFT: 0, SCHEDULED: 0, PUBLISHED: 0, EXPIRED: 0 } as Record<Status, number>,
  )

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-10 px-4">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">お知らせ配信</h1>
          <p className="text-gray-500 text-sm mt-1">
            公開中 {counts.PUBLISHED} / 予約 {counts.SCHEDULED} / 下書き {counts.DRAFT} / 期限切れ {counts.EXPIRED}
          </p>
        </div>
        <Link
          href="/admin/announcements/new"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:opacity-95 transition"
        >
          + 新規作成
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/40 p-8 text-center text-sm text-gray-600">
          まだお知らせがありません。
          <div className="mt-2">
            <Link href="/admin/announcements/new" className="text-purple-700 hover:underline">
              最初のお知らせを作成 →
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/announcements/${a.id}/edit`}
                className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-purple-200 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[a.status]}`}>
                        {STATUS_LABEL[a.status]}
                      </span>
                      {a.isPinned && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-600 text-white">
                          ピン留め
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {a.status === 'SCHEDULED'
                          ? `公開予定: ${fmt(a.publishedAt)}`
                          : a.status === 'DRAFT'
                            ? `作成: ${fmt(a.createdAt)}`
                            : `公開: ${fmt(a.publishedAt)}`}
                      </span>
                      {a.expiresAt && (
                        <span className="text-xs text-gray-500">
                          / 期限: {fmt(a.expiresAt)}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 line-clamp-1">{a.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{a.body}</p>
                  </div>
                  <span className="text-gray-300 shrink-0" aria-hidden>→</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
