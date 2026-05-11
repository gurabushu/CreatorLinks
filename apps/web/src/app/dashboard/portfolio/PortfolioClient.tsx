'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { UploadDropzone } from '@/lib/uploadthing'
import { createPortfolioAction, deletePortfolioAction } from '@/server/actions/portfolio'

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

function detectMediaType(fileName: string): MediaType {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext)) return 'AUDIO'
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return 'VIDEO'
  return 'IMAGE'
}

export default function PortfolioClient({ initialPortfolios }: Props) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(initialPortfolios)
  const [showForm, setShowForm] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ key: string; url: string; name: string; type: MediaType } | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setUploadedFile(null)
    setUploadError(null)
    setFormError(null)
    setShowForm(false)
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
        fileKey: uploadedFile.key,
      })
      if (result.success) {
        // Optimistic UI: add a temporary item; page revalidates in background
        setPortfolios((prev) => [
          {
            id: `temp-${Date.now()}`,
            title: title.trim(),
            description: description.trim() || null,
            mediaType: uploadedFile.type,
            fileKey: uploadedFile.key,
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

      {/* 追加フォーム */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border rounded-xl p-6 mb-8 space-y-5">
          <h2 className="font-bold text-lg">新しい作品を追加</h2>

          {!uploadedFile ? (
            <div>
              <label className="block text-sm font-medium mb-2">ファイルをアップロード *</label>
              <UploadDropzone
                endpoint="portfolioFile"
                onUploadBegin={() => setUploadError(null)}
                onClientUploadComplete={(res) => {
                  const file = res[0]
                  if (!file) return
                  const mediaType = detectMediaType(file.name)
                  setUploadedFile({ key: file.key, url: file.url, name: file.name, type: mediaType })
                  if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
                }}
                onUploadError={(err) => {
                  const msg = err.message.toLowerCase()
                  setUploadError(msg.includes('token') || msg.includes('uploadthing')
                    ? 'アップロードサービスが未設定です。管理者に連絡してください。'
                    : err.message)
                }}
                appearance={{
                  container: 'border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center gap-2 hover:border-purple-400 transition cursor-pointer',
                  uploadIcon: 'text-gray-400',
                  label: 'text-sm text-gray-600',
                  allowedContent: 'text-xs text-gray-400',
                  button: 'bg-purple-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-purple-700 transition mt-2 after:bg-purple-700',
                }}
                content={{
                  label: '画像・音声・動画ファイルをドラッグ＆ドロップ',
                  allowedContent: 'PNG / JPG / WebP（16MB）· MP3 / WAV（64MB）· MP4 / MOV（256MB）',
                }}
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
