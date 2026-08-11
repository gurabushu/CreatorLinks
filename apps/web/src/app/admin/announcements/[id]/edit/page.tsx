// /admin/announcements/[id]/edit — お知らせ編集・削除（ADMIN のみ）

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AnnouncementForm } from '../../announcement-form'

export const metadata: Metadata = { title: 'お知らせ編集 | Admin' }
export const dynamic = 'force-dynamic'

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/auth')
  if (session.user.role !== 'ADMIN') redirect('/')

  const { id } = await params
  const record = await prisma.announcement.findUnique({ where: { id } }).catch(() => null)
  if (!record) notFound()

  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-10 px-4">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">お知らせ編集</h1>
        <p className="text-gray-500 text-sm mt-1">最終更新: {record.updatedAt.toLocaleString('ja-JP')}</p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <AnnouncementForm
          initial={{
            id: record.id,
            title: record.title,
            body: record.body,
            isPinned: record.isPinned,
            publishedAt: record.publishedAt,
            expiresAt: record.expiresAt,
          }}
        />
      </div>
    </div>
  )
}
