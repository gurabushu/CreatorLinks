// app/projects/page.tsx — 案件一覧 (SSR)

import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import {
  COMMITMENT_LEVEL_LABELS,
  COMMITMENT_LEVELS,
  type CommitmentLevel,
} from '@creator-links/shared'

export const metadata: Metadata = {
  title: '案件一覧',
  description: 'クリエイターへの案件依頼を探せます。',
  alternates: { canonical: '/projects' },
}

const LEVEL_BADGE_CLASS: Record<CommitmentLevel, string> = {
  HOBBY: 'bg-emerald-100 text-emerald-700',
  SEMI_PRO: 'bg-sky-100 text-sky-700',
  PRO: 'bg-amber-100 text-amber-800',
}

interface Props {
  searchParams: Promise<{ level?: string }>
}

export default async function ProjectsPage({ searchParams }: Props) {
  const { level } = await searchParams
  const activeLevel = (COMMITMENT_LEVELS as readonly string[]).includes(level ?? '')
    ? (level as CommitmentLevel)
    : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let projects: any[] = []
  try {
    projects = await prisma.project.findMany({
      where: {
        status: 'OPEN',
        ...(activeLevel ? { commitmentLevel: activeLevel } : {}),
      },
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
    <div className="max-w-6xl mx-auto py-8 sm:py-12 px-4">
      <div className="flex justify-between items-center mb-6 sm:mb-8 gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">案件一覧</h1>
        <Link
          href="/projects/new"
          className="bg-purple-600 text-white text-sm sm:text-base px-4 sm:px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition shrink-0 whitespace-nowrap"
        >
          案件を作成
        </Link>
      </div>

      {/* 本気度フィルタ */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Link
          href="/projects"
          className={`px-3 py-1.5 rounded-full text-sm border transition ${
            activeLevel === null
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}
        >
          すべて
        </Link>
        {COMMITMENT_LEVELS.map((lv) => {
          const meta = COMMITMENT_LEVEL_LABELS[lv]
          const isActive = activeLevel === lv
          return (
            <Link
              key={lv}
              href={`/projects?level=${lv}`}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                isActive
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
              title={meta.description}
            >
              {meta.label}
            </Link>
          )
        })}
      </div>

      <div className="grid gap-4">
        {projects.length === 0 && (
          <p className="text-sm text-gray-400 py-8 text-center">
            該当する案件がまだありません。
          </p>
        )}
        {projects.map((project) => {
          const level = (project.commitmentLevel ?? 'HOBBY') as CommitmentLevel
          const levelMeta = COMMITMENT_LEVEL_LABELS[level]
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="border rounded-xl p-4 sm:p-6 hover:shadow-md transition flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${LEVEL_BADGE_CLASS[level]}`}>
                    {levelMeta.label}
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    {project.contractType === 'SPOT' ? 'スポット' : 'サブスク'}
                  </span>
                  <span className="text-xs text-gray-400">
                    応募 {project._count.matches}件
                  </span>
                </div>
                <h2 className="font-bold text-base sm:text-lg break-words">{project.title}</h2>
                {project.description && (
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">{project.description}</p>
                )}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {project.genres.map((g: string) => (
                    <span key={g} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
              {project.budget && (
                <p className="text-purple-600 font-bold shrink-0 sm:ml-4 text-base sm:text-lg">
                  ¥{project.budget.toLocaleString()}
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
