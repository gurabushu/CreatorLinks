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
    // 背景スクロール抑止
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
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      {/* 上部バー */}
      <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
        <p className="text-sm font-medium truncate">
          {index + 1} / {works.length}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          aria-label="閉じる"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      {/* メディア本体 */}
      <div
        className="flex-1 flex items-center justify-center px-4 pb-4 relative min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 前へ */}
        {index > 0 && (
          <button
            type="button"
            onClick={() => onChangeIndex(index - 1)}
            aria-label="前の作品"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl flex items-center justify-center z-10"
          >
            ‹
          </button>
        )}
        {/* 次へ */}
        {index < works.length - 1 && (
          <button
            type="button"
            onClick={() => onChangeIndex(index + 1)}
            aria-label="次の作品"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl flex items-center justify-center z-10"
          >
            ›
          </button>
        )}

        <div className="relative w-full h-full max-w-5xl flex items-center justify-center">
          <MediaFrame current={current} source={source} />
        </div>
      </div>

      {/* キャプション */}
      <div className="px-4 pb-5 text-white shrink-0" onClick={(e) => e.stopPropagation()}>
        <p className="font-bold text-lg">{current.title}</p>
        {current.description && (
          <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">{current.description}</p>
        )}
        {(source.kind === 'youtube' || source.kind === 'vimeo' || source.kind === 'twitter' || source.kind === 'other') && (
          <a
            href={'watchUrl' in source ? source.watchUrl : '#'}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-block mt-2 text-xs text-pink-300 hover:text-pink-200 underline"
          >
            元のページを開く →
          </a>
        )}
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
      <Image
        src={source.url}
        alt={current.title}
        fill
        className="object-contain"
        unoptimized
      />
    )
  }
  if (source.kind === 'file' && current.mediaType === 'VIDEO') {
    return (
      <video
        src={source.url}
        controls
        autoPlay
        playsInline
        className="max-w-full max-h-full"
      />
    )
  }
  if (source.kind === 'file' && current.mediaType === 'AUDIO') {
    return (
      <div className="text-center">
        <div className="text-7xl mb-4">🎵</div>
        <audio src={source.url} controls autoPlay className="w-full max-w-md" />
      </div>
    )
  }
  if (source.kind === 'youtube' || source.kind === 'vimeo') {
    return (
      <iframe
        src={source.embedUrl}
        title={current.title}
        className="w-full h-full aspect-video max-h-full"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    )
  }
  // twitter / other → 単純なリンク誘導
  return (
    <div className="text-center text-white">
      <div className="text-5xl mb-3">🔗</div>
      <p className="text-sm">このメディアは外部リンクで公開されています</p>
    </div>
  )
}
