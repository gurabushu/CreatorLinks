// app/projects/manage/page.tsx — 案件管理（発注者）(SSR)

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ManageMatchButtons } from './manage-match-buttons'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function ProjectManagePage() {
  const session = await auth()
  if (!session) redirect('/auth')

  const projects = await prisma.project.findMany({
    where: { clientId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      matches: {
        include: {
          artist: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              averageRating: true,
              genres: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const STATUS_LABEL: Record<string, string> = {
    OPEN: '募集中',
    MATCHING: 'マッチング中',
    CLOSED: 'クローズ',
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">案件管理</h1>
        <Link
          href="/projects/new"
          className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition"
        >
          + 新しい案件
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="mb-4">まだ案件を作成していません</p>
          <Link href="/projects/new" className="text-purple-600 hover:underline font-medium">
            最初の案件を作成する →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {projects.map((project) => (
            <div key={project.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm">
              {/* 案件ヘッダー */}
              <div className="px-6 py-5 border-b bg-gray-50 flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        project.status === 'OPEN'
                          ? 'bg-green-100 text-green-700'
                          : project.status === 'MATCHING'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {STATUS_LABEL[project.status]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {project.contractType === 'SPOT' ? 'スポット' : 'サブスク'}
                    </span>
                  </div>
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-bold text-lg hover:text-purple-600 transition"
                  >
                    {project.title}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(project.createdAt)} 掲載</p>
                </div>
                <div className="text-right shrink-0">
                  {project.budget && (
                    <p className="text-purple-600 font-bold">{formatCurrency(project.budget)}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">応募 {project.matches.length}件</p>
                </div>
              </div>

              {/* 応募者一覧 */}
              {project.matches.length === 0 ? (
                <p className="px-6 py-5 text-sm text-gray-400">まだ応募者がいません</p>
              ) : (
                <div className="divide-y">
                  {project.matches.map((match) => (
                    <div key={match.id} className="px-6 py-4 flex items-start justify-between gap-4">
                      {/* アーティスト情報 */}
                      <div className="flex items-start gap-3 min-w-0">
                        <Link href={`/artists/${match.artist.id}`}>
                          <div className="w-10 h-10 rounded-full bg-purple-100 overflow-hidden shrink-0">
                            {match.artist.avatarUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={match.artist.avatarUrl}
                                alt={match.artist.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        </Link>
                        <div className="min-w-0">
                          <Link
                            href={`/artists/${match.artist.id}`}
                            className="font-medium text-sm hover:text-purple-600"
                          >
                            {match.artist.name}
                          </Link>
                          <p className="text-xs text-gray-400">
                            ⭐ {Number(match.artist.averageRating).toFixed(1)}
                            {match.artist.genres.length > 0 &&
                              ` · ${match.artist.genres.slice(0, 2).join(', ')}`}
                          </p>
                          {match.message && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2 max-w-md">
                              「{match.message}」
                            </p>
                          )}
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <ManageMatchButtons match={match} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
