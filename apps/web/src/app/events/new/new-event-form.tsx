'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEventAction } from '@/server/actions/event'
import { EVENT_TYPES, EVENT_TYPE_LABELS } from '@creator-links/shared'
import type { EventType } from '@creator-links/shared'

export function NewEventForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [type, setType] = useState<EventType>('LIVE')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [venueName, setVenueName] = useState('')
  const [city, setCity] = useState('')
  const [genresText, setGenresText] = useState('')
  const [ticketUrl, setTicketUrl] = useState('')
  const [ticketPriceYen, setTicketPriceYen] = useState('')
  const [isFree, setIsFree] = useState(false)
  const [publishNow, setPublishNow] = useState(true)

  const submit = () => {
    setError(null)
    if (!title.trim()) return setError('タイトルを入力してください')
    if (!startAt) return setError('開始日時を入力してください')

    startTransition(async () => {
      const result = await createEventAction({
        type,
        title,
        description: description || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
        venueName: venueName || undefined,
        city: city || undefined,
        genres: genresText
          ? genresText.split(',').map((g) => g.trim()).filter(Boolean)
          : [],
        ticketUrl: ticketUrl || undefined,
        ticketPriceYen: ticketPriceYen ? Number(ticketPriceYen) : undefined,
        isFree,
        publishNow,
      })
      if (result.success) {
        router.push(`/events/${result.data.id}`)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="space-y-5"
    >
      {/* 種別 */}
      <div>
        <label className="block text-sm font-medium mb-1.5">イベント種別</label>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                type === t
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
              }`}
            >
              {EVENT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* タイトル */}
      <div>
        <label className="block text-sm font-medium mb-1.5">タイトル *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 新宿◯◯ 3月度 マンスリーライブ"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* 説明 */}
      <div>
        <label className="block text-sm font-medium mb-1.5">説明</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="出演者・タイムテーブル・注意事項など"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* 日程 */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">開始日時 *</label>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">終了日時</label>
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
          />
        </div>
      </div>

      {/* 会場 */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">会場名</label>
          <input
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="例: 下北沢SHELTER"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">エリア</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="例: 東京"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
          />
        </div>
      </div>

      {/* ジャンル */}
      <div>
        <label className="block text-sm font-medium mb-1.5">ジャンル（カンマ区切り）</label>
        <input
          value={genresText}
          onChange={(e) => setGenresText(e.target.value)}
          placeholder="例: ロック, インディー, ポップス"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
        />
      </div>

      {/* チケット */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">チケット URL</label>
          <input
            value={ticketUrl}
            onChange={(e) => setTicketUrl(e.target.value)}
            placeholder="TIGET / ライブポケット等"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">参考料金（円）</label>
          <input
            type="number"
            value={ticketPriceYen}
            onChange={(e) => setTicketPriceYen(e.target.value)}
            placeholder="0 は無料"
            min={0}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
        入場無料
      </label>

      {/* 公開制御 */}
      <div className="pt-3 border-t border-gray-200">
        <label className="flex items-center gap-2 text-sm mb-2">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
          />
          作成後すぐに公開する（オフの場合は下書きとして保存）
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-6 py-2.5 rounded-lg transition disabled:opacity-50"
        >
          {isPending ? '作成中...' : publishNow ? '公開して作成' : '下書き保存'}
        </button>
      </div>
    </form>
  )
}
