// app/projects/[id]/edit/page.tsx — 案件編集 (SSR で既存値取得 → CSR フォーム)

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { EditProjectForm } from './edit-form'

export const dynamic = 'force-dynamic'

export default async function ProjectEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect(`/auth?next=/projects/${id}/edit`)

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      matches: {
        where: { status: { in: ['ACCEPTED', 'COMPLETED'] } },
        select: { id: true },
        take: 1,
      },
    },
  })
  if (!project || project.deletedAt) notFound()
  if (project.clientId !== session.user.id) redirect(`/projects/${id}`)

  const hasActiveMatch = project.matches.length > 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">案件を編集</h1>
      <p className="text-sm text-gray-500 mb-6">
        募集締切・取り下げ・内容修正ができます。
        {hasActiveMatch && (
          <span className="block mt-1 text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            承認済みの応募があるため、予算・本気度は変更できません。
          </span>
        )}
      </p>
      <EditProjectForm
        projectId={project.id}
        initial={{
          title: project.title,
          description: project.description ?? '',
          genres: project.genres,
          budget: project.budget,
          commitmentLevel: project.commitmentLevel,
          status: project.status,
          scheduledStartAt: project.scheduledStartAt
            ? project.scheduledStartAt.toISOString().slice(0, 16)
            : '',
          scheduledEndAt: project.scheduledEndAt
            ? project.scheduledEndAt.toISOString().slice(0, 16)
            : '',
        }}
        hasActiveMatch={hasActiveMatch}
      />
    </div>
  )
}
