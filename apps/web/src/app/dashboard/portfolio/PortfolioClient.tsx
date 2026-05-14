'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { createPortfolioAction, deletePortfolioAction } from '@/server/actions/portfolio'
import { compressImage } from '@/lib/compress-image'
import { uploadBlob } from '@/lib/blob-upload'

type MediaType = 'IMAGE' | 'AUDIO' | 'VIDEO'

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
}

const MEDIA_ICON: Record<MediaType, string> = {
  IMAGE: '🖼️',
  AUDIO: '🎵',
  VIDEO: '🎬',
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

export default function PortfolioClient({ initialPortfolios }: Props) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(initialPortfolios)
  const [showForm, setShowForm] = useState(false)
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
    if (!uploadedFile || !title.trim()) return

    setFormError(null)
    startTransition(async () => {
      const result = await createPortfolioAction({
        title: title.trim(),
        description: description.trim() || undefined,
        mediaType: uploadedFile.type,
        fileKey: uploadedFile.url,
      })
      if (result.success) {
        setPortfolios((prev) => [
          {
            id: `temp-${Date.now()}`,
            title: title.trim(),
            description: description.trim() || null,
            mediaType: uploadedFile.type,
            fileKey: uploadedFile.url,
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
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">ポートフォリオ管理</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition"
          >
            + 作品を追加
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border rounded-xl p-6 mb-8 space-y-5">
          <h2 className="font-bold text-lg">新しい作品を追加</h2>

          {!uploadedFile ? (
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
              <div className="w-16 h-16 rounded-lg bg-purple-50 flex items-center justify-center text-3xl flex-shrink-0">
                {uploadedFile.type === 'IMAGE' ? (
                  <Image src={uploadedFile.url} alt={uploadedFile.name} width={64} height={64} className="w-16 h-16 object-cover rounded-lg" />
                ) : (
                  MEDIA_ICON[uploadedFile.type]
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
              disabled={isPending || !uploadedFile || !title.trim()}
              className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50"
            >
              {isPending ? '保存中...' : '保存する'}
            </button>
          </div>
        </form>
      )}

      {portfolios.length === 0 && !showForm ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">🎨</p>
          <p className="font-medium">まだ作品がありません</p>
          <p className="text-sm mt-1">「作品を追加」から最初の作品をアップロードしましょう</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {portfolios.map((p) => (
            <PortfolioCard key={p.id} portfolio={p} onDelete={() => handleDelete(p.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function PortfolioCard({ portfolio, onDelete }: { portfolio: Portfolio; onDelete: () => void }) {
  const { title, mediaType, fileKey } = portfolio
  const fileUrl = fileKey?.startsWith('http') ? fileKey : `https://utfs.io/f/${fileKey}`
  const isImage = mediaType === 'IMAGE'

  return (
    <div className="bg-white border rounded-xl overflow-hidden relative group hover:shadow-md transition">
      <div className="bg-gray-100 h-28 flex items-center justify-center overflow-hidden">
        {isImage ? (
          <Image
            src={fileUrl}
            alt={title}
            width={200}
            height={112}
            className="w-full h-full object-cover"
            unoptimized
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span className="text-4xl">{MEDIA_ICON[mediaType as MediaType]}</span>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-sm line-clamp-1">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{mediaType}</p>
      </div>
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-100 text-red-600 text-xs px-2 py-1 rounded transition"
      >
        削除
      </button>
    </div>
  )
}
