'use client'

import { useState } from 'react'
import Image from 'next/image'
import { resolveMediaSource } from '@/lib/media-source'
import { PortfolioLightbox, type LightboxPortfolio } from '@/components/portfolio-lightbox'

export function PortfolioGallery({ portfolios }: { portfolios: LightboxPortfolio[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (portfolios.length === 0) {
    return <p className="text-gray-500">まだポートフォリオはありません</p>
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {portfolios.map((p, i) => (
          <PortfolioTile key={p.id} portfolio={p} onClick={() => setOpenIndex(i)} />
        ))}
      </div>
      {openIndex !== null && (
        <PortfolioLightbox
          works={portfolios}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onChangeIndex={setOpenIndex}
        />
      )}
    </>
  )
}

function PortfolioTile({
  portfolio,
  onClick,
}: {
  portfolio: LightboxPortfolio
  onClick: () => void
}) {
  const source = resolveMediaSource(portfolio.fileKey)
  const isImageFile = portfolio.mediaType === 'IMAGE' && source.kind === 'file'
  const thumb = isImageFile
    ? source.url
    : source.kind === 'youtube'
      ? source.thumbnailUrl
      : null
  const showPlay =
    portfolio.mediaType === 'VIDEO' || source.kind === 'youtube' || source.kind === 'vimeo'
  const showAudio = portfolio.mediaType === 'AUDIO'

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-indigo-100 group focus:outline-none focus:ring-2 focus:ring-purple-500"
      title={portfolio.title}
    >
      {thumb && (
        <Image
          src={thumb}
          alt={portfolio.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-200"
          unoptimized
        />
      )}
      {showPlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 ml-1 text-purple-700 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
      {showAudio && (
        <div className="absolute inset-0 flex items-center justify-center text-4xl">🎵</div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs text-left">
        <p className="truncate font-medium">{portfolio.title}</p>
      </div>
    </button>
  )
}
