'use client'

// 全画面 Story Viewer。Instagram 風にタップで prev/next、5s auto-advance、
// マウント時に markStoryViewedAction を発火 (viewer 側に既読リング反映)。
// 動画は再生完了で自動 next (5s 上限は無視して動画長を尊重)。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { StoryAuthorGroup, StoryListItem } from '@creator-links/shared'
import { markStoryViewedAction, deleteStoryAction } from '@/server/actions/story'
import { getDisplayName } from '@/lib/user'

const IMAGE_DURATION_MS = 5000
const TEXT_DURATION_MS = 5000

type FlatEntry = {
  groupIndex: number
  storyIndex: number
  author: StoryAuthorGroup['author']
  story: StoryListItem
  isMine: boolean // 自分の group（先頭に居る場合の削除ボタン表示制御）
}

type Props = {
  groups: StoryAuthorGroup[]
  startIndex: number // groups[startIndex] の先頭 Story から開始
  onClose: () => void
}

export function StoryViewer({ groups, startIndex, onClose }: Props) {
  // 全 Story を flat 化しておくと prev/next の遷移が楽
  const flat = useMemo<FlatEntry[]>(() => {
    const out: FlatEntry[] = []
    groups.forEach((g, gi) => {
      g.stories.forEach((s, si) => {
        // 自分の group 判定: startIndex=0 で最初の group が自分の場合 (viewer は自分の投稿から始まる)
        // 厳密には親が myGroup を先頭に置いた場合 index=0 が自分。
        // hasUnviewed=false かつ全 viewedByMe=true が近似だが親から isMine を渡す方が良い。
        // ここでは「先頭 group が自分」規約に依存し、認可は onDelete 側で行う。
        out.push({ groupIndex: gi, storyIndex: si, author: g.author, story: s, isMine: false })
      })
    })
    return out
  }, [groups])

  const initialCursor = useMemo(() => {
    // startIndex は groups の index。その先頭の flat 位置を計算。
    let acc = 0
    for (let i = 0; i < startIndex && i < groups.length; i++) {
      acc += groups[i].stories.length
    }
    return acc
  }, [groups, startIndex])

  const [cursor, setCursor] = useState<number>(initialCursor)
  const [progress, setProgress] = useState<number>(0) // 0..1
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const current = flat[cursor]

  const advance = useCallback(() => {
    if (cursor + 1 >= flat.length) {
      onClose()
    } else {
      setCursor(cursor + 1)
      setProgress(0)
    }
  }, [cursor, flat.length, onClose])

  const back = useCallback(() => {
    if (cursor === 0) return
    setCursor(cursor - 1)
    setProgress(0)
  }, [cursor])

  // 既読記録 (Story 切り替え時に非同期で発火)
  useEffect(() => {
    if (!current) return
    void markStoryViewedAction(current.story.id).catch(() => null)
  }, [current])

  // 進捗タイマー: IMAGE / TEXT は固定時間、VIDEO は video 側の onEnded に任せる
  useEffect(() => {
    if (!current) return
    if (timerRef.current) clearInterval(timerRef.current)
    setProgress(0)
    if (current.story.mediaType === 'VIDEO') return // video は onEnded で advance

    const duration = current.story.mediaType === 'TEXT' ? TEXT_DURATION_MS : IMAGE_DURATION_MS
    const start = Date.now()
    timerRef.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration)
      setProgress(p)
      if (p >= 1) {
        if (timerRef.current) clearInterval(timerRef.current)
        advance()
      }
    }, 50)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [current, advance])

  // キーボード操作
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') advance()
      else if (e.key === 'ArrowLeft') back()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, back, onClose])

  const handleDelete = useCallback(async () => {
    if (!current) return
    if (!confirm('この Story を削除しますか？')) return
    const res = await deleteStoryAction(current.story.id)
    if (res.success) {
      advance() // 次に進む (最終だったら onClose)
    } else {
      alert(res.error)
    }
  }, [current, advance])

  if (!current || typeof window === 'undefined') return null

  // 現在の group 内での bar 分割
  const currentGroup = groups[current.groupIndex]

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none">
      {/* トップ: 進捗バー + 主催者情報 + close */}
      <div className="absolute top-0 left-0 right-0 z-10 px-3 pt-2">
        <div className="flex gap-1 mb-2">
          {currentGroup.stories.map((_, i) => {
            const isPast = i < current.storyIndex
            const isCurrent = i === current.storyIndex
            const w = isPast ? 1 : isCurrent ? progress : 0
            return (
              <div key={i} className="flex-1 h-0.5 bg-white/30 rounded overflow-hidden">
                <div className="h-full bg-white" style={{ width: `${w * 100}%` }} />
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          {current.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.author.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/30" />
          )}
          <div className="text-white text-sm font-medium">{getDisplayName(current.author)}</div>
          <div className="text-white/60 text-xs">
            {timeAgo(new Date(current.story.createdAt))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="text-white/70 hover:text-white text-xs"
              title="この Story を削除 (投稿者のみ有効)"
            >
              削除
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-white text-2xl leading-none"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {/* 中央: Story 本体 */}
      <div className="relative w-full max-w-md h-full max-h-[100vh] flex items-center justify-center">
        {current.story.mediaType === 'IMAGE' && current.story.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.story.mediaUrl}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
        )}
        {current.story.mediaType === 'VIDEO' && current.story.mediaUrl && (
          <video
            ref={videoRef}
            src={current.story.mediaUrl}
            autoPlay
            playsInline
            controls={false}
            onEnded={advance}
            onTimeUpdate={(e) => {
              const el = e.currentTarget
              if (el.duration > 0) setProgress(el.currentTime / el.duration)
            }}
            className="max-w-full max-h-full object-contain"
          />
        )}
        {current.story.mediaType === 'TEXT' && (
          <div
            className="w-full h-full flex items-center justify-center text-white text-2xl font-bold text-center whitespace-pre-wrap px-6"
            style={{ backgroundColor: current.story.backgroundColor ?? '#7c3aed' }}
          >
            {current.story.body}
          </div>
        )}

        {/* IMAGE/VIDEO のオーバーレイキャプション */}
        {current.story.mediaType !== 'TEXT' && current.story.body && (
          <div className="absolute bottom-16 left-4 right-4 text-white text-sm bg-black/40 rounded p-2 whitespace-pre-wrap">
            {current.story.body}
          </div>
        )}

        {/* タップ領域: 左半分 back、右半分 next */}
        <button
          type="button"
          onClick={back}
          className="absolute left-0 top-0 w-1/3 h-full"
          aria-label="前へ"
        />
        <button
          type="button"
          onClick={advance}
          className="absolute right-0 top-0 w-2/3 h-full"
          aria-label="次へ"
        />
      </div>
    </div>,
    document.body,
  )
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'たった今'
  if (min < 60) return `${min}分前`
  const h = Math.floor(min / 60)
  return `${h}時間前`
}
