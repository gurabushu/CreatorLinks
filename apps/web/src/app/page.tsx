// app/page.tsx — トップ / LP (SSG)
// SEO最適化・Hero / 特徴 / 新着案件 / 注目アーティスト / ご利用の流れ / 料金 / FAQ

import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getDisplayName } from '@/lib/user'
import { EarlyBirdBanner } from '@/components/early-bird/early-bird-banner'
import { FoundingMemberBadge } from '@/components/early-bird/founding-member-badge'
import { HeroSection } from '@/components/landing/hero-section'
import { FeatureBar } from '@/components/landing/feature-bar'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Faq } from '@/components/landing/faq'
import { SITE_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: `${SITE_NAME} — 音楽の依頼、LINE から卒業。"また一緒に" が続く場所。`,
  description:
    '音楽業界特化の依頼管理アプリ。LINE や DM でやっていた録音・ライブ・MIX 依頼をひとつに。Stripe エスクローで初対面の相手にも安心送金、スケジュール自動連携、「また一緒に」で継続。手数料 7%（業界最安クラス）。',
  alternates: { canonical: '/' },
}

// SSG: ビルド時生成
export const revalidate = 3600 // 1時間ごと再生成 (ISR)

async function getLatestData() {
  const now = new Date()
  try {
    const [projects, artists, featured] = await Promise.all([
      prisma.project.findMany({
        where: { status: 'OPEN' },
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { name: true, avatarUrl: true } },
        },
      }),
      prisma.user.findMany({
        where: { isOfficial: false, isGuest: false },
        take: 8,
        orderBy: [{ role: 'asc' }, { averageRating: 'desc' }],
        select: {
          id: true, name: true, displayName: true, role: true, genres: true, bio: true,
          avatarUrl: true, averageRating: true, earlyBirdSlot: true,
        },
      }),
      prisma.featuredArtist.findMany({
        where: {
          user: { isOfficial: false, isGuest: false },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: [{ position: 'asc' }, { featuredAt: 'desc' }],
        take: 8,
        include: {
          user: {
            select: {
              id: true, name: true, displayName: true, role: true, genres: true,
              avatarUrl: true, averageRating: true, earlyBirdSlot: true,
            },
          },
        },
      }),
    ])
    return { projects, artists, featured }
  } catch {
    return { projects: [], artists: [], featured: [] }
  }
}

export default async function HomePage() {
  const { projects, artists, featured } = await getLatestData()

  return (
    <div>
      {/* 創設メンバー枠（先着 100 名 6ヶ月無料 + 永久バッジ）バナー */}
      <EarlyBirdBanner />
      <HeroSection />
      <FeatureBar />

      {/* 新着案件 */}
      <section className="py-10 sm:py-16 px-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-6 sm:mb-8 gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">音楽の新着案件</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              作曲・演奏・MIX・アレンジ・レコーディングなど
            </p>
          </div>
          <Link href="/projects" className="text-sm sm:text-base text-purple-600 hover:underline whitespace-nowrap">
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

      {/* 公式おすすめアーティスト（キュレーション） */}
      {featured.length > 0 && (
        <section className="py-10 sm:py-16 px-4 bg-gradient-to-br from-purple-50 to-indigo-50/60">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-6 sm:mb-8 gap-3">
              <div>
                <p className="text-xs font-bold text-purple-600 tracking-wider mb-0.5">EDITORS&apos; PICKS</p>
                <h2 className="text-xl sm:text-2xl font-bold">公式おすすめのミュージシャン</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  運営が実績と相性を見て毎週ピックアップ
                </p>
              </div>
              <Link href="/artists" className="text-sm sm:text-base text-purple-600 hover:underline whitespace-nowrap">
                すべて見る →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {featured.map((f) => (
                <Link
                  key={f.id}
                  href={`/artists/${f.user.id}`}
                  className="relative bg-white rounded-2xl p-4 text-center border border-purple-200 shadow-sm hover:shadow-md transition"
                >
                  <span className="absolute top-2 left-2 text-[10px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">
                    公式ピックアップ
                  </span>
                  <div className="w-16 h-16 rounded-full bg-purple-200 mx-auto mb-3 mt-3 overflow-hidden">
                    {f.user.avatarUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.user.avatarUrl} alt={getDisplayName(f.user)} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <p className="font-bold text-sm">{getDisplayName(f.user)}</p>
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    {f.user.role === 'PRO' && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">PRO</span>
                    )}
                    <FoundingMemberBadge slot={f.user.earlyBirdSlot} showTotal={false} />
                  </div>
                  {f.note && (
                    <p className="text-xs text-purple-700 mt-2 italic line-clamp-2">「{f.note}」</p>
                  )}
                  <div className="flex gap-1 justify-center mt-1 flex-wrap">
                    {f.user.genres.slice(0, 2).map((g) => (
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
      )}

      {/* 注目アーティスト */}
      <section className="py-10 sm:py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-6 sm:mb-8 gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">注目のミュージシャン</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                評価順・PRO 優先で毎日更新
              </p>
            </div>
            <Link href="/artists" className="text-sm sm:text-base text-purple-600 hover:underline whitespace-nowrap">
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
                    <img src={artist.avatarUrl} alt={getDisplayName(artist)} className="w-full h-full object-cover" />
                  )}
                </div>
                <p className="font-bold text-sm">{getDisplayName(artist)}</p>
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
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          手数料 7% で、ミュージシャンの手取りを守る
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-8">
          汎用クラウドソーシングの 3 分の 1 以下。手取りは 93% がアーティストに残ります。
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { name: 'ランサーズ', fee: '16.5%', highlight: false },
            { name: 'クラウドワークス', fee: '20%', highlight: false },
            { name: 'ココナラ', fee: '22%', highlight: false },
            { name: SITE_NAME, fee: '7%', highlight: true },
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
          例：1万円の音楽案件なら、アーティスト手取りは <span className="font-bold text-gray-700">¥9,300</span>。
          <br className="hidden sm:block" />
          （比較値は各社公式ページ記載の一般料率、2026 年 8 月時点）
        </p>
      </section>

      <Faq />
    </div>
  )
}
