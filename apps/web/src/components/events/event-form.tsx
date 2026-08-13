'use client'

// 新規作成 / 編集の共通イベントフォーム。
// - mode='create': 公開/下書きトグルあり。成功時は新規イベント詳細に遷移
// - mode='edit':   公開/下書きトグルなし（公開状態は publishEventAction 側で管理）
//                  成功時は元の詳細ページへ戻る
// datetime-local input は端末ローカルタイムを扱うため、edit 初期値は JST → local 文字列に
// 変換済みで受け取る前提（page.tsx 側で jstDatetimeLocal を通す）。

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEventAction, updateEventAction } from '@/server/actions/event'
import {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_VISIBILITIES,
  EVENT_VISIBILITY_LABELS,
  EVENT_VISIBILITY_DESCRIPTIONS,
  EVENT_VISIBILITY_ICONS,
} from '@creator-links/shared'
import type { EventType, EventVisibility } from '@creator-links/shared'

export type EventFormInitial = {
  type: EventType
  visibility: EventVisibility
  title: string
  description: string
  startAt: string // "YYYY-MM-DDTHH:mm" (端末ローカル、edit の場合は JST 変換済み)
  endAt: string // 同上、無指定は空文字
  isAllDay: boolean
  venueName: string
  city: string
  genresText: string // カンマ区切りの生テキスト
  ticketUrl: string
  ticketPriceYen: string // input value 用の string
  isFree: boolean
}

type EventFormProps =
  | { mode: 'create'; defaultDate?: string }
  | { mode: 'edit'; eventId: string; initial: EventFormInitial }

const CREATE_DEFAULT: EventFormInitial = {
  type: 'LIVE',
  // 掲示板ファースト: デフォルト type=LIVE は公開告知が主用途のため PUBLIC を初期値に
  visibility: 'PUBLIC',
  title: '',
  description: '',
  startAt: '',
  endAt: '',
  isAllDay: false,
  venueName: '',
  city: '',
  genresText: '',
  ticketUrl: '',
  ticketPriceYen: '',
  isFree: false,
}

export function EventForm(props: EventFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEdit = props.mode === 'edit'
  const initial: EventFormInitial =
    props.mode === 'edit'
      ? props.initial
      : {
          ...CREATE_DEFAULT,
          startAt: props.defaultDate ? `${props.defaultDate}T19:00` : '',
        }

  const [type, setType] = useState<EventType>(initial.type)
  const [visibility, setVisibility] = useState<EventVisibility>(initial.visibility)
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [startAt, setStartAt] = useState(initial.startAt)
  const [endAt, setEndAt] = useState(initial.endAt)
  const [isAllDay, setIsAllDay] = useState(initial.isAllDay)
  const [venueName, setVenueName] = useState(initial.venueName)
  const [city, setCity] = useState(initial.city)
  const [genresText, setGenresText] = useState(initial.genresText)
  const [ticketUrl, setTicketUrl] = useState(initial.ticketUrl)
  const [ticketPriceYen, setTicketPriceYen] = useState(initial.ticketPriceYen)
  const [isFree, setIsFree] = useState(initial.isFree)
  const [publishNow, setPublishNow] = useState(true)

  // type 変更時にデフォルト visibility を賢く提案（強制はしない）
  const changeType = (newType: EventType) => {
    setType(newType)
    if (visibility === 'PRIVATE' && ['LIVE', 'SESSION', 'WORKSHOP', 'MEETUP'].includes(newType)) {
      setVisibility('PUBLIC')
    } else if (
      visibility === 'PUBLIC' &&
      ['REHEARSAL', 'MEETING', 'TODO'].includes(newType)
    ) {
      setVisibility('PRIVATE')
    }
    if (newType === 'TODO' && !isAllDay) setIsAllDay(true)
  }

  // datetime-local は「日本時間で入力する」と見なして JST(+09:00) の ISO 文字列に変換する。
  // 素の new Date(x).toISOString() だとブラウザのローカル TZ で解釈されるため、
  // 海外からの入力で JST とズレる。
  const toJstIso = (localDatetime: string): string => {
    const [date, time = '00:00'] = localDatetime.split('T')
    return new Date(`${date}T${time}:00+09:00`).toISOString()
  }

  const submit = () => {
    setError(null)
    if (!title.trim()) return setError('タイトルを入力してください')
    if (!startAt) return setError('開始日時を入力してください')

    startTransition(async () => {
      const payload = {
        type,
        visibility,
        title,
        description: description || undefined,
        startAt: toJstIso(startAt),
        endAt: endAt ? toJstIso(endAt) : undefined,
        isAllDay,
        venueName: venueName || undefined,
        city: city || undefined,
        genres: genresText
          ? genresText.split(',').map((g) => g.trim()).filter(Boolean)
          : [],
        ticketUrl: ticketUrl || undefined,
        ticketPriceYen: ticketPriceYen ? Number(ticketPriceYen) : undefined,
        isFree,
      }

      if (props.mode === 'edit') {
        const result = await updateEventAction(props.eventId, payload)
        if (result.success) {
          router.push(`/events/${props.eventId}`)
          router.refresh()
        } else {
          setError(result.error)
        }
      } else {
        const result = await createEventAction({ ...payload, publishNow })
        if (result.success) {
          router.push(`/events/${result.data.id}`)
        } else {
          setError(result.error)
        }
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
        <label className="block text-sm font-medium mb-1.5">種別</label>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => changeType(t)}
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

      {/* 可視性 */}
      <div>
        <label className="block text-sm font-medium mb-1.5">公開範囲</label>
        <div className="grid sm:grid-cols-2 gap-2">
          {EVENT_VISIBILITIES.map((v) => (
            <button
              type="button"
              key={v}
              onClick={() => setVisibility(v)}
              className={`text-left px-3 py-2.5 rounded-lg border transition ${
                visibility === v
                  ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500'
                  : 'bg-white border-gray-300 hover:border-purple-400'
              }`}
            >
              <div className="text-xs font-medium mb-0.5">
                {EVENT_VISIBILITY_ICONS[v]} {EVENT_VISIBILITY_LABELS[v]}
              </div>
              <div className="text-[11px] text-gray-500 leading-snug">
                {EVENT_VISIBILITY_DESCRIPTIONS[v]}
              </div>
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
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isAllDay}
            onChange={(e) => setIsAllDay(e.target.checked)}
          />
          終日イベント（時刻を指定しない）
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {isAllDay ? '日付 *' : '開始日時 *'}
            </label>
            <input
              type={isAllDay ? 'date' : 'datetime-local'}
              value={
                isAllDay && startAt
                  ? startAt.split('T')[0]
                  : startAt
              }
              onChange={(e) => setStartAt(isAllDay ? `${e.target.value}T00:00` : e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
            />
          </div>
          {!isAllDay && (
            <div>
              <label className="block text-sm font-medium mb-1.5">終了日時</label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
          )}
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

      {/* 公開制御 (create のみ) */}
      {!isEdit && (
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
      )}

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
          {isPending
            ? isEdit
              ? '保存中...'
              : '作成中...'
            : isEdit
              ? '変更を保存'
              : publishNow
                ? '公開して作成'
                : '下書き保存'}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={() => router.push(`/events/${props.eventId}`)}
            className="text-sm px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  )
}
