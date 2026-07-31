// app/page.tsx — トップ / LP (SSG)
// SEO最適化・Hero / 特徴 / 新着案件 / 注目アーティスト / ご利用の流れ / 料金 / FAQ

import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { EarlyBirdBanner } from '@/components/early-bird/early-bird-banner'
import { FoundingMemberBadge } from '@/components/early-bird/founding-member-badge'
import { HeroSection } from '@/components/landing/hero-section'
import { FeatureBar } from '@/components/landing/feature-bar'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Faq } from '@/components/landing/faq'

export const metadata: Metadata = {
  title: 'CreatorLinks — 個人アーティストの営業プラットフォーム',
  description: '手数料業界最安7%。アーティストと企業を繋ぐマッチングサービス。',
}

// SSG: ビルド時生成
export const revalidate = 3600 // 1時間ごと再生成 (ISR)

async function getLatestData() {
  try {
    const [projects, artists] = await Promise.all([
      prisma.project.findMany({
        where: { status: 'OPEN' },
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { name: true, avatarUrl: true } },
        },
      }),
      prisma.user.findMany({
        take: 8,
        orderBy: [{ role: 'asc' }, { averageRating: 'desc' }],
        select: {
          id: true, name: true, role: true, genres: true, bio: true,
          avatarUrl: true, averageRating: true, earlyBirdSlot: true,
        },
      }),
    ])
    return { projects, artists }
  } catch {
    return { projects: [], artists: [] }
  }
}

export default async function HomePage() {
  const { projects, artists } = await getLatestData()

  return (
    <div>
      {/* 創設メンバー枠（先着 100 名 6ヶ月無料 + 永久バッジ）バナー */}
      <EarlyBirdBanner />
      <HeroSection />
      <FeatureBar />

      {/* 新着案件 */}
      <section className="py-10 sm:py-16 px-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold">新着案件</h2>
          <Link href="/projects" className="text-sm sm:text-base text-purple-600 hover:underline">
            すべて見る →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition"
            >
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                {project.contractType === 'SPOT' ? 'スポット' : 'サブスク'}
              </span>
              <h3 className="font-bold mt-2 mb-1 line-clamp-2">{project.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{project.description}</p>
              {project.budget && (
                <p className="text-purple-600 font-bold mt-2">
                  ¥{project.budget.toLocaleString()}
                </p>
              )}
              <div className="flex gap-1 mt-2 flex-wrap">
                {project.genres.slice(0, 3).map((g) => (
                  <span key={g} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {g}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 注目アーティスト */}
      <section className="py-10 sm:py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold">注目のアーティスト</h2>
            <Link href="/artists" className="text-sm sm:text-base text-purple-600 hover:underline">
              すべて見る →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {artists.map((artist) => (
              <Link
                key={artist.id}
                href={`/artists/${artist.id}`}
                className="bg-white rounded-2xl p-4 text-center border border-gray-200 shadow-sm hover:shadow-md transition"
              >
                <div className="w-16 h-16 rounded-full bg-purple-200 mx-auto mb-3 overflow-hidden">
                  {artist.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artist.avatarUrl} alt={artist.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <p className="font-bold text-sm">{artist.name}</p>
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  {artist.role === 'PRO' && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">PRO</span>
                  )}
                  <FoundingMemberBadge slot={artist.earlyBirdSlot} showTotal={false} />
                </div>
                <p className="text-xs text-gray-500 mt-1">評価 {Number(artist.averageRating).toFixed(1)}</p>
                <div className="flex gap-1 justify-center mt-1 flex-wrap">
                  {artist.genres.slice(0, 2).map((g) => (
                    <span key={g} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      {g}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <HowItWorks />

      {/* 料金プラン (手数料比較) */}
      <section id="pricing" className="py-14 sm:py-20 px-4 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">料金プラン</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-8">
          業界最安クラスの手数料でクリエイターの手取りを守ります
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { name: 'ランサーズ', fee: '16.5%', highlight: false },
            { name: 'クラウドワークス', fee: '20%', highlight: false },
            { name: 'ココナラ', fee: '22%', highlight: false },
            { name: 'CreatorLinks', fee: '7%', highlight: true },
          ].map((item) => (
            <div
              key={item.name}
              className={`rounded-2xl p-4 sm:p-6 ${
                item.highlight
                  ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <p className={`text-xs sm:text-sm mb-2 ${item.highlight ? 'text-purple-100' : 'text-gray-500'}`}>
                {item.name}
              </p>
              <p className={`text-2xl sm:text-3xl font-bold ${item.highlight ? 'text-white' : 'text-gray-800'}`}>
                {item.fee}
              </p>
            </div>
          ))}
        </div>
        <p className="text-gray-500 mt-6 text-xs sm:text-sm">
          ※ 1万円案件の場合、CreatorLinks は手取り ¥9,300（業界最高水準）
        </p>
      </section>

      <Faq />
    </div>
  )
}
