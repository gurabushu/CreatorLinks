'use client'

// Linktree 型 外部リンクの編集セクション。
// - 追加 / 削除 / 並べ替え (up/down) をサポート。ドラッグ&ドロップは重いので当面 up/down で。
// - 追加は「プラットフォーム select + URL 入力 + カスタムラベル(任意)」のシンプルなフォーム

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  EXTERNAL_LINK_PLATFORMS,
  EXTERNAL_LINK_PLATFORM_LABELS,
  type ExternalLinkPlatform,
} from '@creator-links/shared'
import {
  upsertExternalLinkAction,
  deleteExternalLinkAction,
  reorderExternalLinksAction,
} from '@/server/actions/external-links'

type LinkRow = {
  id: string
  platform: ExternalLinkPlatform
  url: string
  label: string | null
}

const MAX_LINKS = 15

export function ExternalLinksSection({ initialLinks }: { initialLinks: LinkRow[] }) {
  const router = useRouter()
  const [links, setLinks] = useState<LinkRow[]>(initialLinks)
  const [isPending, startTransition] = useTransition()
  const [platform, setPlatform] = useState<ExternalLinkPlatform>('SPOTIFY')
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    setError(null)
    if (!url.trim()) {
      setError('URL を入力してください')
      return
    }
    startTransition(async () => {
      const result = await upsertExternalLinkAction({
        platform,
        url: url.trim(),
        label: label.trim() || null,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      setLinks((prev) => [
        ...prev,
        { id: result.id, platform, url: url.trim(), label: label.trim() || null },
      ])
      setUrl('')
      setLabel('')
      router.refresh()
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteExternalLinkAction(id)
      if (result.success) {
        setLinks((prev) => prev.filter((l) => l.id !== id))
        router.refresh()
      }
    })
  }

  const handleMove = (idx: number, delta: number) => {
    const j = idx + delta
    if (j < 0 || j >= links.length) return
    const next = [...links]
    ;[next[idx], next[j]] = [next[j]!, next[idx]!]
    setLinks(next)
    startTransition(async () => {
      await reorderExternalLinksAction(next.map((l) => l.id))
      router.refresh()
    })
  }

  return (
    <section className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-white border rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold">他のリンク</h2>
          <p className="text-xs text-gray-500 mt-1">
            Spotify・SoundCloud・TikTok・Instagram・自 Web など、あなたの他プラットフォームでの活動をまとめて公開できます。
            アーティスト詳細ページの「他で見る」に表示されます。
          </p>
        </div>

        {links.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center border-b mb-4">
            まだリンクを追加していません
          </p>
        ) : (
          <ul className="divide-y mb-4">
            {links.map((l, idx) => (
              <li key={l.id} className="py-3 flex items-center gap-3">
                <div className="flex flex-col shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, -1)}
                    disabled={idx === 0 || isPending}
                    className="text-xs text-gray-400 hover:text-purple-700 disabled:opacity-30 leading-none"
                    aria-label="上へ移動"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, +1)}
                    disabled={idx === links.length - 1 || isPending}
                    className="text-xs text-gray-400 hover:text-purple-700 disabled:opacity-30 leading-none"
                    aria-label="下へ移動"
                  >
                    ▼
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-purple-700">
                    {EXTERNAL_LINK_PLATFORM_LABELS[l.platform].label}
                    {l.label && <span className="ml-1 text-gray-500 font-normal">— {l.label}</span>}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{l.url}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(l.id)}
                  disabled={isPending}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 shrink-0"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}

        {links.length < MAX_LINKS && (
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">リンクを追加</p>
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as ExternalLinkPlatform)}
                  className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {EXTERNAL_LINK_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {EXTERNAL_LINK_PLATFORM_LABELS[p].label}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="表示ラベル (任意、30 文字以内)"
                maxLength={30}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-[11px] text-gray-500">
                {EXTERNAL_LINK_PLATFORM_LABELS[platform].hint}
              </p>
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={handleAdd}
                disabled={isPending || !url.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isPending ? '追加中...' : '追加'}
              </button>
            </div>
          </div>
        )}

        {links.length >= MAX_LINKS && (
          <p className="text-xs text-gray-500 border-t pt-4">
            リンクは最大 {MAX_LINKS} 個までです
          </p>
        )}
      </div>
    </section>
  )
}
