// イベント新規作成: Phase A 最小 UI
// ログイン必須。主要項目のみ入力、公開/下書きを選択。
// ?date=YYYY-MM-DD が渡された場合は開始日時にプレフィル（カレンダーの日番号クリック起点）

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { NewEventForm } from './new-event-form'

export const metadata = { title: 'イベント作成' }

function parseDate(date: string | undefined): string | undefined {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return undefined
  return date
}

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/auth')

  const { date } = await searchParams
  const defaultDate = parseDate(date)

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">イベントを作成</h1>
      <NewEventForm defaultDate={defaultDate} />
    </div>
  )
}
