// app/projects/[id]/page.tsx — 案件詳細 (SSR)

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApplyButton } from './apply-button'
import { getDisplayName } from '@/lib/user'
import { formatCurrency, formatDate } from '@/lib/utils'
import { COMMITMENT_LEVEL_LABELS, type CommitmentLevel } from '@creator-links/shared'

const LEVEL_BADGE_CLASS: Record<CommitmentLevel, string> = {
  HOBBY: 'bg-emerald-100 text-emerald-700',
  SEMI_PRO: 'bg-sky-100 text-sky-700',
  PRO: 'bg-amber-100 text-amber-800',
}

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: { title: true, description: true },
    })
    if (!project) return { title: '案件が見つかりません' }
    return {
      title: project.title,
      description: project.description ?? project.title,
    }
  } catch {
    return { title: '案件詳細' }
  }
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let project: any = null
  try {
    project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, displayName: true, avatarUrl: true, averageRating: true } },
        _count: { select: { matches: true } },
      },
    })
  } catch {
    notFound()
  }

  if (!project) notFound()

  // 自分がすでに応募しているか確認
  let alreadyApplied = false
  if (session?.user.id) {
    try {
      const existing = await prisma.match.findFirst({
        where: { projectId: id, artistId: session.user.id },
      })
      alreadyApplied = !!existing
    } catch {
      // DB unreachable — assume not applied
    }
  }

  const isOwner = session?.user.id === project.clientId

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="grid md:grid-cols-3 gap-8">
        {/* メインコンテンツ */}
        <div className="md:col-span-2 space-y-6">
          {/* ヘッダー */}
          <div>
            <div className="flex gap-2 mb-3 flex-wrap">
              {(() => {
                const level = (project.commitmentLevel ?? 'HOBBY') as CommitmentLevel
                const meta = COMMITMENT_LEVEL_LABELS[level]
                return (
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${LEVEL_BADGE_CLASS[level]}`}
                    title={meta.description}
                  >
                    {meta.label}
                  </span>
                )
              })()}
              <span className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-medium">
                {project.contractType === 'SPOT' ? 'スポット' : 'サブスク'}
              </span>
              <span
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  project.status === 'OPEN'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {project.status === 'OPEN' ? '募集中' : project.status === 'MATCHING' ? 'マッチング中' : 'クローズ'}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <p className="text-gray-400 text-sm mt-2">
              {formatDate(project.createdAt)} に掲載 ·{' '}
              <span className="text-gray-500">
                {COMMITMENT_LEVEL_LABELS[(project.commitmentLevel ?? 'HOBBY') as CommitmentLevel].description}
              </span>
            </p>
          </div>

          {/* ジャンル */}
          <div className="flex gap-2 flex-wrap">
            {project.genres.map((g: string) => (
              <span key={g} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                {g}
              </span>
            ))}
          </div>

          {/* 詳細 */}
          {project.description && (
            <div className="prose prose-sm max-w-none">
              <h2 className="text-base font-semibold text-gray-700 mb-2">案件の詳細</h2>
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{project.description}</p>
            </div>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-4">
          {/* 予算・応募数 */}
          <div className="bg-white border rounded-2xl p-5 space-y-4">
            {project.budget && (
              <div>
                <p className="text-xs text-gray-400">予算</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(project.budget)}</p>
                <p className="text-xs text-gray-400">（手数料7%差引き後の手取り: {formatCurrency(project.budget * 0.93)}）</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400">応募数</p>
              <p className="text-lg font-bold">{project._count.matches}件</p>
            </div>

            {/* 応募ボタン */}
            <ApplyButton
              projectId={id}
              isLoggedIn={!!session}
              isOwner={isOwner}
              alreadyApplied={alreadyApplied}
              projectStatus={project.status}
            />
          </div>

          {/* 発注者情報 */}
          <div className="bg-white border rounded-2xl p-5">
            <p className="text-xs text-gray-400 mb-3">依頼者</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 overflow-hidden shrink-0">
                {project.client.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={project.client.avatarUrl} alt={getDisplayName(project.client)} className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{getDisplayName(project.client)}</p>
                <p className="text-xs text-gray-400">評価 {Number(project.client.averageRating).toFixed(1)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
