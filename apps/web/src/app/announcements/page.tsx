// 公式お知らせ一覧 (SSR)
// - 公開 URL。未ログインでも閲覧できる
// - ログイン中なら DashboardShell が付き、開いた時点で announcementsReadAt = now() を更新（未読数リセット）

import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardShell } from '@/components/dashboard-shell/dashboard-shell'
import { OfficialBadge } from '@/components/official-badge'
import { getOfficialUser } from '@/lib/official-account'
import { getDisplayName } from '@/lib/user'
import { SITE_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: `お知らせ | ${SITE_NAME}`,
  description: `${SITE_NAME} 公式運営からのお知らせ・アップデート情報`,
  alternates: { canonical: '/announcements' },
}

export const dynamic = 'force-dynamic'

function formatDate(d: Date): string {
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default async function AnnouncementsPage() {
  const session = await auth()
  const now = new Date()

  // ログイン中ユーザーの未読カウンタをリセット（開いた時点で既読扱い）
  if (session) {
    await prisma.user
      .update({
        where: { id: session.user.id },
        data: { announcementsReadAt: now },
      })
      .catch(() => null)
  }

  const items = await prisma.announcement
    .findMany({
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        publishedAt: { lte: now },
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: 100,
    })
    .catch(() => [])

  const official = await getOfficialUser()

  return (
    <DashboardShell requireAuth={false}>
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="mb-8 flex items-center gap-3">
          <h1 className="text-2xl font-bold">お知らせ</h1>
          {official && (
            <span className="text-sm text-gray-500 flex items-center gap-1.5">
              <OfficialBadge size="sm" />
              {getDisplayName(official)}
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-gray-400 py-12 text-center border rounded-2xl bg-white">
            現在お知らせはありません。
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => (
              <li
                key={a.id}
                className={`bg-white border rounded-2xl p-6 ${a.isPinned ? 'border-purple-300 bg-purple-50/40' : ''}`}
              >
                <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                  <h2 className="font-bold text-base sm:text-lg">
                    {a.isPinned && (
                      <span className="text-xs font-medium bg-purple-600 text-white px-2 py-0.5 rounded-full mr-2 align-middle">
                        重要
                      </span>
                    )}
                    {a.title}
                  </h2>
                  <time className="text-xs text-gray-400 shrink-0">
                    {a.publishedAt ? formatDate(a.publishedAt) : ''}
                  </time>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {a.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  )
}
