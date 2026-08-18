'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { createPortfolioAction, deletePortfolioAction, setFeaturedPortfolioAction } from '@/server/actions/portfolio'
import { compressImage } from '@/lib/compress-image'
import { uploadBlob } from '@/lib/blob-upload'
import { resolveMediaSource } from '@/lib/media-source'

type MediaType = 'IMAGE' | 'AUDIO' | 'VIDEO'

function detectMediaTypeFromUrl(url: string): MediaType {
  const lower = url.toLowerCase()
  if (/(youtube\.com|youtu\.be|vimeo\.com|twitter\.com|x\.com|tiktok\.com|instagram\.com)/.test(lower)) {
    return 'VIDEO'
  }
  if (/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/.test(lower)) return 'IMAGE'
  if (/\.(mp3|wav|m4a|ogg|flac)(\?|$)/.test(lower)) return 'AUDIO'
  return 'VIDEO'
}

interface Portfolio {
  id: string
  title: string
  description: string | null
  mediaType: string
  fileKey: string
  createdAt: Date
}

interface Props {
  initialPortfolios: Portfolio[]
  initialFeaturedId: string | null
  isPro: boolean
  freeLimit: number
}

const MEDIA_LABEL: Record<MediaType, string> = {
  IMAGE: '画像',
  AUDIO: '音声',
  VIDEO: '動画',
}

function detectMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith('audio/')) return 'AUDIO'
  if (mimeType.startsWith('video/')) return 'VIDEO'
  return 'IMAGE'
}

function FileDropzone({
  onFile,
  isCompressing,
  isUploading,
  uploadProgress,
}: {
  onFile: (file: File) => void
  isCompressing: boolean
  isUploading: boolean
  uploadProgress: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const isBusy = isCompressing || isUploading

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div
      onClick={() => !isBusy && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition cursor-pointer select-none ${
        isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'
      } ${isBusy ? 'pointer-events-none opacity-60' : ''}`}
    >
      {isCompressing ? (
        <>
          <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
          <p className="text-sm text-gray-500">圧縮中...</p>
        </>
      ) : isUploading ? (
        <>
          <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
          <p className="text-sm text-gray-500">
            {uploadProgress < 95 ? `アップロード中... ${uploadProgress}%` : '完了処理中...'}
          </p>
        </>
      ) : (
        <>
          <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm text-gray-600 font-medium">ここにドラッグ＆ドロップ</p>
          <p className="text-xs text-gray-400">またはクリックしてファイルを選択</p>
          <p className="text-xs text-gray-400">画像（16MB）· 音声（64MB）· 動画（256MB）</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,audio/*,video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export default function PortfolioClient({ initialPortfolios, initialFeaturedId, isPro, freeLimit }: Props) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(initialPortfolios)
  const [featuredId, setFeaturedId] = useState<string | null>(initialFeaturedId)
  const [showForm, setShowForm] = useState(false)
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload')
  const [urlInput, setUrlInput] = useState('')
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string; type: MediaType } | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isPending, startTransition] = useTransition()

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setUploadedFile(null)
    setUrlInput('')
    setInputMode('upload')
    setUploadError(null)
    setFormError(null)
    setShowForm(false)
    setUploadProgress(0)
  }

  const handleFile = async (file: File) => {
    setUploadError(null)
    setUploadProgress(0)

    try {
      setIsCompressing(true)
      const fileToUpload = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 })
      setIsCompressing(false)

      setIsUploading(true)
      // 動画は最大 256MB 許容するので、stall タイムアウトを長めに
      const isLargeMedia = file.type.startsWith('video/') || file.type.startsWith('audio/')
      const blob = await uploadBlob(fileToUpload, {
        onProgress: setUploadProgress,
        stallTimeoutMs: isLargeMedia ? 60_000 : 20_000,
      })

      const mediaType = detectMediaType(file.type)
      setUploadedFile({ url: blob.url, name: file.name, type: mediaType })
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'アップロードに失敗しました')
    } finally {
      setIsCompressing(false)
      setIsUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    let fileKey: string
    let mediaType: MediaType
    if (inputMode === 'upload') {
      if (!uploadedFile) return
      fileKey = uploadedFile.url
      mediaType = uploadedFile.type
    } else {
      const trimmed = urlInput.trim()
      if (!/^https?:\/\//.test(trimmed)) {
        setFormError('https:// から始まる URL を入力してください')
        return
      }
      fileKey = trimmed
      mediaType = detectMediaTypeFromUrl(trimmed)
    }

    setFormError(null)
    startTransition(async () => {
      const result = await createPortfolioAction({
        title: title.trim(),
        description: description.trim() || undefined,
        mediaType,
        fileKey,
      })
      if (result.success) {
        setPortfolios((prev) => [
          {
            id: `temp-${Date.now()}`,
            title: title.trim(),
            description: description.trim() || null,
            mediaType,
            fileKey,
            createdAt: new Date(),
          },
          ...prev,
        ])
        resetForm()
      } else {
        setFormError(result.error)
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deletePortfolioAction(id)
      if (result.success) {
        setPortfolios((prev) => prev.filter((p) => p.id !== id))
        // メイン作品を削除した場合は state もクリア（DB 側は onDelete: SetNull）
        if (featuredId === id) setFeaturedId(null)
      }
    })
  }

  const handleToggleFeatured = (id: string) => {
    const next = featuredId === id ? null : id
    const prev = featuredId
    setFeaturedId(next) // 楽観的更新
    startTransition(async () => {
      const result = await setFeaturedPortfolioAction(next)
      if (!result.success) {
        setFeaturedId(prev) // ロールバック
      }
    })
  }

  // Free の上限判定 (PRO は無制限)
  const atLimit = !isPro && portfolios.length >= freeLimit
  const nearLimit = !isPro && portfolios.length >= freeLimit - 2 && portfolios.length < freeLimit

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex justify-between items-start mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">ポートフォリオ管理</h1>
          {!isPro && (
            <p className="text-xs text-gray-500 mt-1">
              Free プラン: {portfolios.length} / {freeLimit} 件
            </p>
          )}
          {isPro && (
            <p className="text-xs text-purple-700 mt-1">
              PRO プラン: {portfolios.length} 件 <span className="text-gray-400">(無制限)</span>
            </p>
          )}
        </div>
        {!showForm && !atLimit && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition"
          >
            + 作品を追加
          </button>
        )}
      </div>

      {/* 上限到達バナー (Free ユーザー) */}
      {atLimit && (
        <div className="mb-6 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50/70 p-5">
          <p className="text-sm sm:text-base font-bold text-purple-900 mb-1">
            🔒 Free プランの上限 {freeLimit} 件に達しました
          </p>
          <p className="text-xs text-purple-800/80 leading-relaxed mb-3">
            PRO プラン (¥980/月) にすると <b>ポートフォリオを無制限</b>に登録できます。
            既存の作品を削除して枠を空ける方法も可能です。
          </p>
          <a
            href="/pro/subscribe"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition"
          >
            PRO の詳細を見る →
          </a>
        </div>
      )}

      {/* 上限近い警告 (残り 2 件以内) */}
      {nearLimit && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-800 leading-relaxed">
          あと <b>{freeLimit - portfolios.length}</b> 件で Free プランの上限です。
          PRO なら無制限に登録できます。
          <a href="/pro/subscribe" className="underline hover:text-amber-900 ml-1 font-semibold">
            詳しく →
          </a>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border rounded-xl p-6 mb-8 space-y-5">
          <h2 className="font-bold text-lg">新しい作品を追加</h2>

          {/* モード切替 */}
          <div className="inline-flex bg-white border rounded-lg p-1 text-sm">
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`px-3 py-1.5 rounded-md transition ${
                inputMode === 'upload' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              ファイル
            </button>
            <button
              type="button"
              onClick={() => setInputMode('url')}
              className={`px-3 py-1.5 rounded-md transition ${
                inputMode === 'url' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              URL（YouTube / SNS）
            </button>
          </div>

          {inputMode === 'upload' ? (
            !uploadedFile ? (
              <div>
                <label className="block text-sm font-medium mb-2">ファイルをアップロード *</label>
                <FileDropzone
                  onFile={handleFile}
                  isCompressing={isCompressing}
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                />
                {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-white border rounded-lg p-4">
                <div className="w-16 h-16 rounded-lg bg-purple-50 flex items-center justify-center text-xs text-purple-700 font-semibold flex-shrink-0">
                  {uploadedFile.type === 'IMAGE' ? (
                    <Image src={uploadedFile.url} alt={uploadedFile.name} width={64} height={64} className="w-16 h-16 object-cover rounded-lg" />
                  ) : (
                    MEDIA_LABEL[uploadedFile.type]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-gray-500">{uploadedFile.type}</p>
                </div>
                <button type="button" onClick={() => setUploadedFile(null)} className="text-gray-400 hover:text-red-500 text-sm px-2 py-1 rounded transition">
                  変更
                </button>
              </div>
            )
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">作品 URL *</label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="例：https://www.youtube.com/watch?v=..."
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                YouTube・Vimeo・X（Twitter）など、本人の作品が公開されているページの URL を貼り付けてください。
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">タイトル *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="例：オリジナル楽曲「春の詩」"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">説明（任意）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="作品の概要・制作背景など"
            />
          </div>

          {formError && <p className="text-red-500 text-sm">{formError}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={resetForm} className="flex-1 border py-2 rounded-lg hover:bg-gray-50 transition">
              キャンセル
            </button>
            <button
              type="submit"
              disabled={
                isPending ||
                !title.trim() ||
                (inputMode === 'upload' ? !uploadedFile : !urlInput.trim())
              }
              className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50"
            >
              {isPending ? '保存中...' : '保存する'}
            </button>
          </div>
        </form>
      )}

      {portfolios.length === 0 && !showForm ? (
        <div className="text-center py-20 text-gray-400">
          <p className="font-medium">まだ作品がありません</p>
          <p className="text-sm mt-1">「作品を追加」から最初の作品をアップロードしましょう</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {portfolios.map((p) => (
            <PortfolioCard
              key={p.id}
              portfolio={p}
              isFeatured={featuredId === p.id}
              onDelete={() => handleDelete(p.id)}
              onToggleFeatured={() => handleToggleFeatured(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PortfolioCard({
  portfolio,
  isFeatured,
  onDelete,
  onToggleFeatured,
}: {
  portfolio: Portfolio
  isFeatured: boolean
  onDelete: () => void
  onToggleFeatured: () => void
}) {
  const { title, mediaType, fileKey } = portfolio
  const source = resolveMediaSource(fileKey)
  const thumb =
    mediaType === 'IMAGE' && source.kind === 'file'
      ? source.url
      : source.kind === 'youtube'
        ? source.thumbnailUrl
        : null

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden relative group hover:shadow-md transition ${
        isFeatured ? 'border-amber-400 ring-2 ring-amber-200' : ''
      }`}
    >
      {/* 星ボタン（メイン作品トグル）— モバイル省スペース化のためバッジは星の右に bundle */}
      <button
        type="button"
        onClick={onToggleFeatured}
        title={isFeatured ? '一覧カードのメイン解除' : '一覧カードのメインに設定'}
        aria-pressed={isFeatured}
        className={`absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full transition shadow-sm ${
          isFeatured
            ? 'bg-amber-400 text-white hover:bg-amber-500 px-2 py-1'
            : 'bg-white/90 text-gray-400 hover:text-amber-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 w-8 h-8 justify-center'
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill={isFeatured ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.18 21 12 16.51 5.82 21l2.36-7.15L2 9.36h7.61L12 2z" />
        </svg>
        {isFeatured && (
          <span className="text-[10px] font-bold leading-none">メイン</span>
        )}
      </button>

      <div className="bg-gray-100 h-28 flex items-center justify-center overflow-hidden relative">
        {thumb ? (
          <Image
            src={thumb}
            alt={title}
            width={200}
            height={112}
            className="w-full h-full object-cover"
            unoptimized
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span className="text-sm text-gray-500 font-semibold">{MEDIA_LABEL[mediaType as MediaType]}</span>
        )}
        {(mediaType === 'VIDEO' || source.kind === 'youtube' || source.kind === 'vimeo') && thumb && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="text-white text-2xl drop-shadow">▶</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-sm line-clamp-1">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {mediaType}
          {source.kind === 'youtube' && ' · YouTube'}
          {source.kind === 'vimeo' && ' · Vimeo'}
          {source.kind === 'twitter' && ' · X'}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 bg-red-100 text-red-600 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded transition"
      >
        削除
      </button>
    </div>
  )
}
