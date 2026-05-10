// components/upload/avatar-upload.tsx — アバター画像アップロードコンポーネント
'use client'

import Image from 'next/image'
import { useState } from 'react'
import { UploadButton } from '@/lib/uploadthing'
import { trpc } from '@/lib/trpc'

interface AvatarUploadProps {
  currentUrl?: string | null
  name: string
  onUploadComplete?: (url: string) => void
}

export function AvatarUpload({ currentUrl, name, onUploadComplete }: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const updateAvatar = trpc.user.updateAvatar.useMutation()

  return (
    <div className="flex flex-col items-center gap-4">
      {/* アバタープレビュー */}
      <div className="relative">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={name}
            width={100}
            height={100}
            className="w-24 h-24 rounded-full object-cover border-2 border-purple-200"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-2 border-purple-200">
            {name.charAt(0)}
          </div>
        )}

        {/* アップロード中オーバーレイ */}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* アップロードボタン */}
      <UploadButton
        endpoint="avatarImage"
        onUploadBegin={() => {
          setUploading(true)
          setError(null)
        }}
        onClientUploadComplete={async (res) => {
          setUploading(false)
          const file = res[0]
          if (!file) return

          const url = file.url
          setPreviewUrl(url)

          // DB に保存
          try {
            await updateAvatar.mutateAsync({ avatarUrl: url })
            onUploadComplete?.(url)
          } catch {
            setError('プロフィール保存に失敗しました')
          }
        }}
        onUploadError={(err) => {
          setUploading(false)
          setError(err.message)
        }}
        appearance={{
          button:
            'bg-white border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:border-purple-400 hover:text-purple-600 transition font-medium after:bg-purple-600',
          allowedContent: 'hidden',
        }}
        content={{
          button: uploading ? 'アップロード中...' : '画像を変更',
        }}
      />

      {error && <p className="text-red-500 text-xs">{error}</p>}
      <p className="text-xs text-gray-400">JPG / PNG / WebP、最大 4MB</p>
    </div>
  )
}
