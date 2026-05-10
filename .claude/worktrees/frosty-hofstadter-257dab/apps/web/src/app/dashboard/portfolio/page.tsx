// app/dashboard/portfolio/page.tsx — ポートフォリオ管理（Uploadthing 実装済み）
'use client'

import { trpc } from '@/lib/trpc'
import { useState } from 'react'
import { UploadDropzone } from '@/lib/uploadthing'
import Image from 'next/image'

type MediaType = 'IMAGE' | 'AUDIO' | 'VIDEO'

interface UploadedFile {
  key: string
  url: string
  name: string
  type: MediaType
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

export default function PortfolioPage() {
  const { data: me, refetch } = trpc.user.me.useQuery()
  const deletePortfolio = trpc.portfolio.delete.useMutation({ onSuccess: () => refetch() })
  const createPortfolio = trpc.portfolio.create.useMutation({ onSuccess: () => refetch() })

  const [showForm, setShowForm] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setUploadedFile(null)
    setUploadError(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadedFile || !title.trim()) return

    setSubmitting(true)
    try {
      await createPortfolio.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        mediaType: uploadedFile.type,
        fileKey: uploadedFile.key,
      })
      resetForm()
    } finally {
      setSubmitting(false)
    }
  }

  const portfolios = (me as any)?.portfolios ?? []

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
        <form
          onSubmit={handleSubmit}
          className="bg-gray-50 border rounded-xl p-6 mb-8 space-y-5"
        >
          <h2 className="font-bold text-lg">新しい作品を追加</h2>

          {/* ファイルアップロードエリア */}
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
                  setUploadedFile({
                    key: file.key,
                    url: file.url,
                    name: file.name,
                    type: mediaType,
                  })
                  // ファイル名からタイトルを自動設定（拡張子除去）
                  if (!title) {
                    setTitle(file.name.replace(/\.[^.]+$/, ''))
                  }
                }}
                onUploadError={(err) => setUploadError(err.message)}
                appearance={{
                  container:
                    'border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center gap-2 hover:border-purple-400 transition cursor-pointer',
                  uploadIcon: 'text-gray-400',
                  label: 'text-sm text-gray-600',
                  allowedContent: 'text-xs text-gray-400',
                  button:
                    'bg-purple-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-purple-700 transition mt-2 after:bg-purple-700',
                }}
                content={{
                  label: '画像・音声・動画ファイルをドラッグ＆ドロップ',
                  allowedContent: 'PNG / JPG / WebP（16MB）· MP3 / WAV（64MB）· MP4 / MOV（256MB）',
                }}
              />
              {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
            </div>
          ) : (
            /* アップロード済みプレビュー */
            <div className="flex items-center gap-4 bg-white border rounded-lg p-4">
              <div className="w-16 h-16 rounded-lg bg-purple-50 flex items-center justify-center text-3xl flex-shrink-0">
                {uploadedFile.type === 'IMAGE' ? (
                  <Image
                    src={uploadedFile.url}
                    alt={uploadedFile.name}
                    width={64}
                    height={64}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                ) : (
                  MEDIA_ICON[uploadedFile.type]
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{uploadedFile.name}</p>
                <p className="text-xs text-gray-500">{uploadedFile.type}</p>
              </div>
              <button
                type="button"
                onClick={() => setUploadedFile(null)}
                className="text-gray-400 hover:text-red-500 text-sm px-2 py-1 rounded transition"
              >
                変更
              </button>
            </div>
          )}

          {/* タイトル */}
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

          {/* 説明 */}
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

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 border py-2 rounded-lg hover:bg-gray-50 transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting || !uploadedFile || !title.trim()}
              className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50"
            >
              {submitting ? '保存中...' : '保存する'}
            </button>
          </div>
        </form>
      )}

      {/* ポートフォリオ一覧 */}
      {portfolios.length === 0 && !showForm ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">🎨</p>
          <p className="font-medium">まだ作品がありません</p>
          <p className="text-sm mt-1">「作品を追加」から最初の作品をアップロードしましょう</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {portfolios.map((p: any) => (
            <PortfolioCard
              key={p.id}
              portfolio={p}
              onDelete={() => deletePortfolio.mutate({ id: p.id })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---- ポートフォリオカード ----
function PortfolioCard({
  portfolio,
  onDelete,
}: {
  portfolio: any
  onDelete: () => void
}) {
  const { id, title, mediaType, fileKey } = portfolio
  // Uploadthing の URL は https://utfs.io/f/{fileKey} 形式
  const fileUrl = fileKey?.startsWith('http') ? fileKey : `https://utfs.io/f/${fileKey}`
  const isImage = mediaType === 'IMAGE'

  return (
    <div className="bg-white border rounded-xl overflow-hidden relative group hover:shadow-md transition">
      {/* メディアプレビュー */}
      <div className="bg-gray-100 h-28 flex items-center justify-center overflow-hidden">
        {isImage ? (
          <Image
            src={fileUrl}
            alt={title}
            width={200}
            height={112}
            className="w-full h-full object-cover"
            onError={(e) => {
              // 画像読み込み失敗時はアイコン表示
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <span className="text-4xl">{MEDIA_ICON[mediaType as MediaType]}</span>
        )}
      </div>

      {/* 情報 */}
      <div className="p-3">
        <p className="font-medium text-sm line-clamp-1">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{mediaType}</p>
      </div>

      {/* 削除ボタン（ホバー時表示） */}
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-100 text-red-600 text-xs px-2 py-1 rounded transition"
      >
        削除
      </button>
    </div>
  )
}
