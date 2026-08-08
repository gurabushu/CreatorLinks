// イベント新規作成: Phase A 最小 UI
// ログイン必須。主要項目のみ入力、公開/下書きを選択。

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { NewEventForm } from './new-event-form'

export const metadata = { title: 'イベント作成' }

export default async function NewEventPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">イベントを作成</h1>
      <NewEventForm />
    </div>
  )
}
