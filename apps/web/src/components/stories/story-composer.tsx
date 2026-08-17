'use client'

// Story 投稿モーダル。画像 / 動画 / テキストの 3 タブ。
// - 画像・動画: uploadBlob で Vercel Blob に上げてから createStoryAction
// - テキスト: 本文 (最大 500 文字) + 背景色ピッカー (プリセット 6 色)

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { uploadBlob } from '@/lib/blob-upload'
import { createStoryAction } from '@/server/actions/story'

type Tab = 'image' | 'video' | 'text'

const BG_PRESETS = [
  '#7c3aed', // purple 600 (default)
  '#111827', // gray 900
  '#ef4444', // red 500
  '#f59e0b', // amber 500
  '#10b981', // emerald 500
  '#0ea5e9', // sky 500
]

type Props = {
  onClose: () => void
  onCreated: () => void
}

export function StoryComposer({ onClose, onCreated }: Props) {
  const [tab, setTab] = useState<Tab>('image')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 画像・動画共通の状態
  const [mediaUrl, setMediaUrl] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  // テキストオーバーレイ or テキスト本文
  const [body, setBody] = useState('')
  const [bgColor, setBgColor] = useState<string>(BG_PRESETS[0])

  const handleFile = async (file: File | null, kind: 'image' | 'video') => {
    if (!file) return
    setError(null)
    if (kind === 'image' && !file.type.startsWith('image/')) {
      return setError('画像ファイルを選択してください')
    }
    if (kind === 'video' && !file.type.startsWith('video/')) {
      return setError('動画ファイルを選択してください')
    }
    setUploadProgress(0)
    try {
      const { url } = await uploadBlob(file, {
        onProgress: (p) => setUploadProgress(p),
      })
      setMediaUrl(url)
      setUploadProgress(100)
    } catch (e) {
      setUploadProgress(null)
      setError(e instanceof Error ? e.message : 'アップロードに失敗しました')
    }
  }

  const submit = async () => {
    setError(null)
    if (tab === 'text') {
      if (!body.trim()) return setError('本文を入力してください')
    } else {
      if (!mediaUrl) return setError('メディアを選択してください')
    }
    setBusy(true)
    const res = await createStoryAction(
      tab === 'text'
        ? { mediaType: 'TEXT', body: body.trim(), backgroundColor: bgColor }
        : tab === 'image'
          ? { mediaType: 'IMAGE', mediaUrl, body: body.trim() || undefined }
          : { mediaType: 'VIDEO', mediaUrl, body: body.trim() || undefined },
    )
    setBusy(false)
    if (res.success) {
      onCreated()
    } else {
      setError(res.error)
    }
  }

  if (typeof window === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold">ストーリーを投稿</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-200">
          {(['image', 'video', 'text'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t)
                setMediaUrl('')
                setUploadProgress(null)
                setError(null)
              }}
              className={`flex-1 py-2.5 text-sm ${
                tab === t
                  ? 'text-purple-700 font-semibold border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'image' ? '画像' : t === 'video' ? '動画' : 'テキスト'}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {/* 画像 or 動画 */}
          {tab !== 'text' && (
            <div className="space-y-3">
              {mediaUrl ? (
                <div className="relative rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-[400px]">
                  {tab === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <video src={mediaUrl} controls className="w-full h-full object-contain" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMediaUrl('')
                      setUploadProgress(null)
                    }}
                    className="absolute top-2 right-2 bg-white/90 rounded px-2 py-1 text-xs"
                  >
                    差し替え
                  </button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 transition">
                  <input
                    type="file"
                    accept={tab === 'image' ? 'image/*' : 'video/*'}
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null, tab)}
                  />
                  <div className="text-sm text-gray-500">
                    {tab === 'image' ? '画像を選択' : '動画を選択'}
                  </div>
                  {uploadProgress !== null && uploadProgress < 100 && (
                    <div className="mt-2 text-xs text-gray-400">
                      アップロード中… {uploadProgress}%
                    </div>
                  )}
                </label>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">キャプション (任意 200 文字)</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={200}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="一言添えられます"
                />
              </div>
            </div>
          )}

          {/* テキスト */}
          {tab === 'text' && (
            <div className="space-y-3">
              <div
                className="rounded-lg p-4 aspect-[9/16] max-h-[400px] flex items-center justify-center text-white text-lg font-bold text-center whitespace-pre-wrap"
                style={{ backgroundColor: bgColor }}
              >
                {body.trim() || 'プレビュー'}
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="本文 (最大 500 文字)"
              />
              <div>
                <label className="block text-xs text-gray-500 mb-1">背景色</label>
                <div className="flex gap-2">
                  {BG_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBgColor(c)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        bgColor === c ? 'border-gray-800' : 'border-white'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs p-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || uploadProgress !== null && uploadProgress < 100}
              className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
            >
              {busy ? '投稿中…' : '24 時間で公開'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
