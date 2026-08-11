'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  createAnnouncementAction,
  updateAnnouncementAction,
  deleteAnnouncementAction,
} from '@/server/actions/announcement'

type PublishMode = 'draft' | 'now' | 'scheduled' | 'keep'

export type AnnouncementInitial = {
  id?: string
  title?: string
  body?: string
  isPinned?: boolean
  publishedAt?: Date | null
  expiresAt?: Date | null
}

// datetime-local input 用のフォーマット (YYYY-MM-DDTHH:mm、ローカルタイムゾーン)
function toLocalDatetime(d: Date | null | undefined): string {
  if (!d) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function inferMode(publishedAt: Date | null | undefined): PublishMode {
  if (!publishedAt) return 'draft'
  if (publishedAt.getTime() > Date.now()) return 'scheduled'
  // 既公開なら 'keep' がデフォルト。'now' を選ぶと publishedAt を上書きして一覧が並び替わり、
  // 全ユーザーの未読バッジが再点灯するため、明示的に選ばせる。
  return 'keep'
}

export function AnnouncementForm({ initial }: { initial?: AnnouncementInitial }) {
  const router = useRouter()
  const isEdit = !!initial?.id
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [isPinned, setIsPinned] = useState(initial?.isPinned ?? false)
  const [publishMode, setPublishMode] = useState<PublishMode>(inferMode(initial?.publishedAt))
  const [scheduledAt, setScheduledAt] = useState(
    initial?.publishedAt && initial.publishedAt.getTime() > Date.now()
      ? toLocalDatetime(initial.publishedAt)
      : '',
  )
  const [expiresAt, setExpiresAt] = useState(toLocalDatetime(initial?.expiresAt))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [deleting, setDeleting] = useState(false)

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.append('title', title)
    fd.append('body', body)
    if (isPinned) fd.append('isPinned', 'on')
    fd.append('publishMode', publishMode)
    if (publishMode === 'scheduled') fd.append('scheduledAt', scheduledAt)
    if (expiresAt) fd.append('expiresAt', expiresAt)

    startTransition(async () => {
      const result = isEdit
        ? await updateAnnouncementAction(initial!.id!, fd)
        : await createAnnouncementAction(fd)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push('/admin/announcements')
      router.refresh()
    })
  }

  const remove = () => {
    if (!isEdit) return
    if (!confirm('このお知らせを削除しますか？この操作は取り消せません。')) return
    setDeleting(true)
    setError(null)
    startTransition(async () => {
      const result = await deleteAnnouncementAction(initial!.id!)
      if (!result.success) {
        setError(result.error)
        setDeleting(false)
        return
      }
      router.push('/admin/announcements')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* タイトル */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 手数料改定のお知らせ"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-[11px] text-gray-400 mt-1">{title.length} / 120</p>
      </div>

      {/* 本文 */}
      <div>
        <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1.5">
          本文 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="body"
          required
          maxLength={10000}
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="お知らせ本文をご記入ください（改行はそのまま反映されます）"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-[11px] text-gray-400 mt-1">{body.length} / 10000</p>
      </div>

      {/* ピン留め */}
      <label className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={isPinned}
          onChange={(e) => setIsPinned(e.target.checked)}
          className="mt-1 accent-purple-600"
        />
        <div>
          <p className="text-sm font-medium text-purple-800">
            一覧の先頭に固定（ピン留め）
          </p>
          <p className="text-xs text-purple-700 mt-1">
            重要なお知らせを常に上位表示します。
          </p>
        </div>
      </label>

      {/* 公開設定 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">公開設定</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(
            [
              // 編集モードで既に公開済みなら「公開日時を維持」を先頭に。
              // 新規作成ではこのオプションを出さない。
              ...(isEdit && initial?.publishedAt && initial.publishedAt.getTime() <= Date.now()
                ? ([{ v: 'keep' as const, label: '公開日時を維持', hint: '既存の公開日時のまま更新' }] as const)
                : []),
              { v: 'draft', label: '下書き', hint: 'まだ公開しない' },
              { v: 'now', label: '今すぐ公開', hint: '保存と同時に閲覧可能' },
              { v: 'scheduled', label: '予約公開', hint: '指定日時に公開' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setPublishMode(opt.v)}
              className={`text-left p-3 rounded-xl border-2 transition ${
                publishMode === opt.v
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-purple-300'
              }`}
            >
              <div className="text-sm font-medium text-gray-800">{opt.label}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{opt.hint}</div>
            </button>
          ))}
        </div>
        {publishMode === 'scheduled' && (
          <div className="mt-3">
            <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700 mb-1">
              予約公開日時 <span className="text-red-500">*</span>
            </label>
            <input
              id="scheduledAt"
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        )}
      </div>

      {/* 有効期限 */}
      <div>
        <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700 mb-1">
          有効期限（任意）
        </label>
        <input
          id="expiresAt"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-[11px] text-gray-500 mt-1">
          指定した日時を過ぎると一覧から除外されます。空欄なら永続表示。
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
        <Link href="/admin/announcements" className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2">
          ← 一覧に戻る
        </Link>
        <div className="flex items-center gap-3">
          {isEdit && (
            <button
              type="button"
              onClick={remove}
              disabled={pending || deleting}
              className="text-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 px-4 py-2 rounded-lg transition"
            >
              {deleting ? '削除中…' : '削除'}
            </button>
          )}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {pending ? '保存中…' : isEdit ? '更新する' : '作成する'}
          </button>
        </div>
      </div>
    </form>
  )
}
