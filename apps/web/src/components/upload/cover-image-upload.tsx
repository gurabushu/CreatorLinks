'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { updateCoverImageAction } from '@/server/actions/profile'
import { compressImage } from '@/lib/compress-image'

interface CoverImageUploadProps {
  currentUrl?: string | null
  onUploadComplete?: (url: string) => void
}

export function CoverImageUpload({ currentUrl, onUploadComplete }: CoverImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isBusy = isCompressing || isUploading

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError(null)
    setUploadProgress(0)
    setPreviewUrl(URL.createObjectURL(file))

    try {
      setIsCompressing(true)
      // 1200x1200, q=0.80 で確実に 1MB 以下にしてマルチパート発動を回避
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 })
      setIsCompressing(false)

      setIsUploading(true)
      const blob = await upload(compressed.name, compressed, {
        access: 'public',
        handleUploadUrl: '/api/blob',
        onUploadProgress: ({ percentage }) => setUploadProgress(Math.round(percentage)),
      })

      setPreviewUrl(blob.url)
      const result = await updateCoverImageAction(blob.url)
      if (!result.success) {
        setError(result.error ?? 'カバー画像の保存に失敗しました')
      } else {
        onUploadComplete?.(blob.url)
      }
    } catch (err) {
      setPreviewUrl(currentUrl ?? null)
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました')
    } finally {
      setIsCompressing(false)
      setIsUploading(false)
    }
  }

  const statusText = isCompressing
    ? '圧縮中...'
    : isUploading
    ? uploadProgress < 95
      ? `アップロード中... ${uploadProgress}%`
      : '完了処理中...'
    : ''

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isBusy}
        className="relative w-full h-48 rounded-xl overflow-hidden group block disabled:cursor-default"
        aria-label="カバー画像を変更"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-600">
          {previewUrl && (
            <Image
              src={previewUrl}
              alt="カバー画像"
              fill
              className="object-cover"
              unoptimized={previewUrl.startsWith('blob:')}
            />
          )}
        </div>

        <div
          className={`absolute inset-0 flex flex-col items-center justify-center text-white transition-opacity ${
            isBusy
              ? 'bg-black/50 opacity-100'
              : 'bg-black/30 opacity-0 group-hover:opacity-100'
          }`}
        >
          {isBusy ? (
            <>
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm">{statusText}</p>
            </>
          ) : (
            <>
              <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm font-medium">クリックしてジャケット画像を変更</p>
              <p className="text-xs text-white/80 mt-1">推奨: 1600×600 · JPG / PNG / WebP</p>
            </>
          )}
        </div>
      </button>

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
