'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  updateProjectAction,
  closeProjectAction,
  deleteProjectAction,
} from '@/server/actions/project'
import { COMMITMENT_LEVEL_LABELS, type CommitmentLevel } from '@creator-links/shared'

type ProjectStatus = 'OPEN' | 'MATCHING' | 'CLOSED' | 'PRIVATE'

const GENRES = ['音楽', 'イラスト', '動画', 'デザイン', '写真', '文章', '声優', 'その他']
const STATUS_OPTIONS: { value: ProjectStatus; label: string; hint: string }[] = [
  { value: 'OPEN', label: '募集中', hint: '一覧に表示、応募受付中' },
  { value: 'CLOSED', label: '募集締切', hint: '一覧に表示、応募不可' },
  { value: 'PRIVATE', label: '非公開', hint: '自分だけに表示、スカウト専用' },
]

type Initial = {
  title: string
  description: string
  genres: string[]
  budget: number | null
  commitmentLevel: CommitmentLevel
  status: ProjectStatus
  scheduledStartAt: string
  scheduledEndAt: string
}

export function EditProjectForm({
  projectId,
  initial,
  hasActiveMatch,
}: {
  projectId: string
  initial: Initial
  hasActiveMatch: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const r = await updateProjectAction(projectId, fd)
      if (!r.success) {
        setError(r.error)
      } else {
        setSuccess('保存しました')
        router.refresh()
      }
    })
  }

  const handleClose = () => {
    if (!confirm('募集を締め切ります。よろしいですか？')) return
    setError(null)
    startTransition(async () => {
      const r = await closeProjectAction(projectId)
      if (!r.success) setError(r.error)
      else router.push(`/projects/${projectId}`)
    })
  }

  const handleDelete = () => {
    if (!confirm('案件を削除します。元に戻せません。よろしいですか？')) return
    setError(null)
    startTransition(async () => {
      const r = await deleteProjectAction(projectId)
      if (!r.success) setError(r.error)
      else router.push('/projects/manage')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* タイトル */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
        <input
          name="title"
          defaultValue={initial.title}
          required
          maxLength={100}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* 説明 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">詳細</label>
        <textarea
          name="description"
          defaultValue={initial.description}
          rows={8}
          maxLength={2000}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* ジャンル */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">ジャンル</label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <label key={g} className="inline-flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="genres"
                value={g}
                defaultChecked={initial.genres.includes(g)}
                className="rounded border-gray-300"
              />
              {g}
            </label>
          ))}
        </div>
      </div>

      {/* 予算 (match 発生中はロック) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          予算 (円) {hasActiveMatch && <span className="text-amber-600 text-xs">変更不可</span>}
        </label>
        <input
          name="budget"
          type="number"
          min="1"
          defaultValue={initial.budget ?? ''}
          disabled={hasActiveMatch}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
        />
      </div>

      {/* 本気度 (match 発生中はロック) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          本気度 {hasActiveMatch && <span className="text-amber-600 text-xs">変更不可</span>}
        </label>
        <select
          name="commitmentLevel"
          defaultValue={initial.commitmentLevel}
          disabled={hasActiveMatch}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
        >
          {(Object.keys(COMMITMENT_LEVEL_LABELS) as CommitmentLevel[]).map((lv) => (
            <option key={lv} value={lv}>
              {COMMITMENT_LEVEL_LABELS[lv].label}
            </option>
          ))}
        </select>
      </div>

      {/* スケジュール */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">開始日時 (任意)</label>
          <input
            name="scheduledStartAt"
            type="datetime-local"
            defaultValue={initial.scheduledStartAt}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">終了日時 (任意)</label>
          <input
            name="scheduledEndAt"
            type="datetime-local"
            defaultValue={initial.scheduledEndAt}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
          />
        </div>
      </div>

      {/* ステータス */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">公開状態</label>
        <div className="space-y-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value={opt.value}
                defaultChecked={initial.status === opt.value}
                className="mt-1"
              />
              <span>
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="block text-xs text-gray-500">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
          {success}
        </p>
      )}

      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition disabled:opacity-50"
        >
          {pending ? '保存中...' : '保存'}
        </button>
        <Link
          href={`/projects/${projectId}`}
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-50"
        >
          キャンセル
        </Link>
        {initial.status !== 'CLOSED' && (
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className="ml-auto px-4 py-2 border border-amber-300 text-amber-700 bg-amber-50 rounded-lg text-sm font-bold hover:bg-amber-100 disabled:opacity-50"
          >
            募集を締め切る
          </button>
        )}
        {!hasActiveMatch && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="px-4 py-2 border border-red-300 text-red-700 bg-red-50 rounded-lg text-sm font-bold hover:bg-red-100 disabled:opacity-50"
          >
            削除
          </button>
        )}
      </div>
    </form>
  )
}
