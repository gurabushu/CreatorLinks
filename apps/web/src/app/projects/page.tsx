// app/projects/page.tsx — 案件一覧 (SSR)

import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: '案件一覧',
  description: 'クリエイターへの案件依頼を探せます。',
}

export default async function ProjectsPage() {
  let projects: Awaited<ReturnType<typeof prisma.project.findMany>> = []
  try {
    projects = await prisma.project.findMany({
      where: { status: 'OPEN' },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { matches: true } },
      },
    })
  } catch {
    // DB unreachable — show empty list
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">案件一覧</h1>
        <Link
          href="/projects/new"
          className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition"
        >
          案件を作成
        </Link>
      </div>

      <div className="grid gap-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="border rounded-xl p-6 hover:shadow-md transition flex justify-between items-start"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  {project.contractType === 'SPOT' ? 'スポット' : 'サブスク'}
                </span>
                <span className="text-xs text-gray-400">
                  応募 {project._count.matches}件
                </span>
              </div>
              <h2 className="font-bold text-lg">{project.title}</h2>
              {project.description && (
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">{project.description}</p>
              )}
              <div className="flex gap-1 mt-2 flex-wrap">
                {project.genres.map((g) => (
                  <span key={g} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {g}
                  </span>
                ))}
              </div>
            </div>
            {project.budget && (
              <p className="text-purple-600 font-bold shrink-0 ml-4">
                ¥{project.budget.toLocaleString()}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
