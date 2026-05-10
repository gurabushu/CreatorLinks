// app/dashboard/matches/page.tsx — 応募管理 (SSR)

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function MatchesPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  const matches = await prisma.match.findMany({
    where: { artistId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      project: {
        include: {
          client: { select: { name: true, avatarUrl: true } },
        },
      },
    },
  })

  const statusGroups = {
    APPLIED: matches.filter((m) => m.status === 'APPLIED'),
    ACCEPTED: matches.filter((m) => m.status === 'ACCEPTED'),
    COMPLETED: matches.filter((m) => m.status === 'COMPLETED'),
    REJECTED: matches.filter((m) => m.status === 'REJECTED'),
  }

  const STATUS_LABELS = {
    APPLIED: '応募中',
    ACCEPTED: '承認済み',
    COMPLETED: '完了',
    REJECTED: '却下',
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-8">応募管理</h1>

      {Object.entries(statusGroups).map(([status, items]) =>
        items.length > 0 ? (
          <section key={status} className="mb-8">
            <h2 className="font-bold mb-3 text-lg">
              {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
              <span className="ml-2 text-sm text-gray-400">({items.length}件)</span>
            </h2>
            <div className="space-y-3">
              {items.map((match) => (
                <div key={match.id} className="bg-white border rounded-xl p-5 flex justify-between items-start">
                  <div>
                    <Link
                      href={`/projects/${match.projectId}`}
                      className="font-medium hover:text-purple-600"
                    >
                      {match.project.title}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      依頼者: {match.project.client.name}
                    </p>
                    {match.message && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        「{match.message}」
                      </p>
                    )}
                  </div>
                  {status === 'ACCEPTED' && (
                    <Link
                      href={`/dashboard/chat/${match.id}`}
                      className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-lg hover:bg-purple-200 transition"
                    >
                      チャットへ
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null
      )}

      {matches.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p>まだ案件に応募していません</p>
          <Link href="/projects" className="text-purple-600 hover:underline mt-2 inline-block">
            案件を探す →
          </Link>
        </div>
      )}
    </div>
  )
}
