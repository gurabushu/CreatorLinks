// /admin/announcements/new — 新規お知らせ作成（ADMIN のみ）

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AnnouncementForm } from '../announcement-form'

export const metadata: Metadata = { title: 'お知らせ新規作成 | Admin' }
export const dynamic = 'force-dynamic'

export default async function NewAnnouncementPage() {
  const session = await auth()
  if (!session) redirect('/auth')
  if (session.user.role !== 'ADMIN') redirect('/')

  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-10 px-4">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">新規お知らせ作成</h1>
        <p className="text-gray-500 text-sm mt-1">下書き保存・予約公開・即時公開に対応。</p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <AnnouncementForm />
      </div>
    </div>
  )
}
