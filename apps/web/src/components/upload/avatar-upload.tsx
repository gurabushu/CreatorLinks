'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { useUploadThing } from '@/lib/uploadthing'
import { updateAvatarAction } from '@/server/actions/profile'

interface AvatarUploadProps {
  currentUrl?: string | null
  name: string
  onUploadComplete?: (url: string) => void
}

export function AvatarUpload({ currentUrl, name, onUploadComplete }: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { startUpload, isUploading } = useUploadThing('avatarImage', {
    onClientUploadComplete: async (res) => {
      const file = res[0]
      if (!file) return
      setPreviewUrl(file.url)
      setError(null)
      const result = await updateAvatarAction(file.url)
      if (!result.success) {
        setError(result.error ?? 'プロフィール保存に失敗しました')
      } else {
        onUploadComplete?.(file.url)
      }
    },
    onUploadError: (err) => {
      const msg = err.message.toLowerCase()
      if (msg.includes('token') || msg.includes('uploadthing')) {
        setError('アップロードサービスが未設定です。管理者に連絡してください。')
      } else {
        setError(err.message)
      }
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) {
      setError(null)
      startUpload(files)
    }
    e.target.value = ''
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* クリックでファイル選択 */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        aria-label="プロフィール画像を変更"
      >
        {/* アバター */}
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={name}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            name.charAt(0)
          )}
        </div>

        {/* ホバー / アップロード中オーバーレイ */}
        <div className={`absolute inset-0 rounded-full flex items-center justify-center transition-opacity ${
          isUploading ? 'bg-black/50 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'
        }`}>
          {isUploading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
      </button>

      <p className="text-xs text-gray-400">
        {isUploading ? 'アップロード中...' : 'クリックして画像を変更 · JPG / PNG / WebP · 4MB まで'}
      </p>

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
