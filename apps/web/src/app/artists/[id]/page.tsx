// app/artists/[id]/page.tsx — アーティスト詳細 (SSR)
// OGP動的生成 / ポートフォリオギャラリー / レビュー

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PortfolioGallery } from './portfolio-gallery'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { name: true, bio: true, avatarUrl: true },
    })
    if (!user) return { title: 'アーティストが見つかりません' }
    return {
      title: `${user.name} | アーティストプロフィール`,
      description: user.bio ?? `${user.name} のポートフォリオ・実績をチェック`,
      openGraph: {
        images: user.avatarUrl ? [{ url: user.avatarUrl }] : [],
      },
    }
  } catch {
    return { title: 'アーティストプロフィール' }
  }
}

export default async function ArtistDetailPage({ params }: Props) {
  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = null
  try {
    user = await prisma.user.findUnique({
      where: { id },
      include: {
        portfolios: { orderBy: { createdAt: 'desc' } },
        reviewsGiven: false,
      },
      omit: { passwordHash: true, stripeCustomerId: true },
    })
  } catch {
    notFound()
  }

  if (!user) notFound()

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4">
      {/* プロフィールヘッダー */}
      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-purple-200 overflow-hidden shrink-0">
          {user.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold break-words">{user.name}</h1>
            {user.role === 'PRO' && (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-bold shrink-0">
                PRO
              </span>
            )}
          </div>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {user.genres.map((g) => (
              <span key={g} className="bg-gray-100 text-gray-600 text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 rounded">
                {g}
              </span>
            ))}
          </div>
          {user.bio && <p className="text-sm sm:text-base text-gray-600 mt-2 whitespace-pre-wrap">{user.bio}</p>}
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            ⭐ {Number(user.averageRating).toFixed(1)}
          </p>
        </div>
      </div>

      {/* ポートフォリオ */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">ポートフォリオ</h2>
        <PortfolioGallery
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          portfolios={user.portfolios.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            mediaType: p.mediaType,
            fileKey: p.fileKey,
          }))}
        />
      </section>
    </div>
  )
}
