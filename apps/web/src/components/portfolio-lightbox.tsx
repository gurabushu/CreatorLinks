'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { resolveMediaSource } from '@/lib/media-source'

export type LightboxPortfolio = {
  id: string
  title: string
  description: string | null
  mediaType: string
  fileKey: string
}

export function PortfolioLightbox({
  works,
  index,
  onClose,
  onChangeIndex,
}: {
  works: LightboxPortfolio[]
  index: number
  onClose: () => void
  onChangeIndex: (next: number) => void
}) {
  const current = works[index]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && index > 0) onChangeIndex(index - 1)
      else if (e.key === 'ArrowRight' && index < works.length - 1) onChangeIndex(index + 1)
    }
    window.addEventListener('keydown', handler)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prevOverflow
    }
  }, [index, works.length, onClose, onChangeIndex])

  if (!current) return null

  const source = resolveMediaSource(current.fileKey)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.title}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      {/* 閉じるボタン (右上固定) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="閉じる"
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-30 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-white flex items-center justify-center text-lg transition"
      >
        ✕
      </button>

      {/* ページ番号 (左上固定) */}
      <div className="fixed top-3 left-3 sm:top-4 sm:left-4 z-30 text-white/90 text-sm font-medium tracking-wide px-3 py-1 rounded-full bg-black/30 backdrop-blur">
        {index + 1} / {works.length}
      </div>

      {/* 前へ */}
      {index > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onChangeIndex(index - 1)
          }}
          aria-label="前の作品"
          className="fixed left-2 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-white text-2xl flex items-center justify-center transition"
        >
          ‹
        </button>
      )}
      {/* 次へ */}
      {index < works.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onChangeIndex(index + 1)
          }}
          aria-label="次の作品"
          className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-white text-2xl flex items-center justify-center transition"
        >
          ›
        </button>
      )}

      {/* SNS 風 カード */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* メディア本体 (白地の上に配置) */}
        <div className="relative w-full bg-gray-50 flex items-center justify-center" style={{ minHeight: '40vh' }}>
          <div className="relative w-full" style={{ maxHeight: '70vh' }}>
            <MediaFrame current={current} source={source} />
          </div>
        </div>

        {/* キャプション (SNS 投稿風) */}
        <div className="px-5 sm:px-6 py-5 sm:py-6 bg-white">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
            {current.title}
          </h2>
          {current.description && (
            <p className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {current.description}
            </p>
          )}
          {'watchUrl' in source && (
            <a
              href={source.watchUrl}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 mt-4 text-xs sm:text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              元のページを開く <span aria-hidden>→</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function MediaFrame({
  current,
  source,
}: {
  current: LightboxPortfolio
  source: ReturnType<typeof resolveMediaSource>
}) {
  if (source.kind === 'file' && current.mediaType === 'IMAGE') {
    return (
      <div className="relative w-full" style={{ height: '60vh' }}>
        <Image
          src={source.url}
          alt={current.title}
          fill
          className="object-contain"
          unoptimized
        />
      </div>
    )
  }
  if (source.kind === 'file' && current.mediaType === 'VIDEO') {
    return (
      <div className="w-full flex items-center justify-center p-3">
        <video
          src={source.url}
          controls
          autoPlay
          playsInline
          className="w-full max-h-[60vh] rounded-lg"
        />
      </div>
    )
  }
  if (source.kind === 'file' && current.mediaType === 'AUDIO') {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <audio src={source.url} controls autoPlay className="w-full max-w-md" />
      </div>
    )
  }
  if (source.kind === 'youtube' || source.kind === 'vimeo') {
    return (
      <iframe
        src={source.embedUrl}
        title={current.title}
        className="w-full aspect-video"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    )
  }
  if (source.kind === 'spotify') {
    return (
      <iframe
        src={source.embedUrl}
        title={current.title}
        className="w-full"
        style={{ height: '352px' }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
      />
    )
  }
  if (source.kind === 'soundcloud') {
    return (
      <iframe
        src={source.embedUrl}
        title={current.title}
        className="w-full"
        style={{ height: '166px' }}
        allow="autoplay"
      />
    )
  }
  if (source.kind === 'tiktok') {
    return (
      <iframe
        src={source.embedUrl}
        title={current.title}
        className="w-full"
        style={{ height: '70vh' }}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    )
  }
  return (
    <div className="w-full text-center py-12 px-6">
      <p className="text-sm text-gray-700">このメディアは外部リンクで公開されています</p>
      <p className="text-xs text-gray-500 mt-2">下部の「元のページを開く」から確認できます</p>
    </div>
  )
}
