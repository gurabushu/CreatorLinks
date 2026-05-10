// app/page.tsx — トップ / LP (SSG)
// SEO最適化・Hero / 新着案件 / アーティスト一覧

import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'CreatorLinks — 個人アーティストの営業プラットフォーム',
  description: '手数料業界最安10%。アーティストと企業を繋ぐマッチングサービス。',
}

// SSG: ビルド時生成
export const revalidate = 3600 // 1時間ごと再生成 (ISR)

async function getLatestData() {
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
        avatarUrl: true, averageRating: true,
      },
    }),
  ])
  return { projects, artists }
}

export default async function HomePage() {
  const { projects, artists } = await getLatestData()

  return (
    <div>
      {/* Hero セクション */}
      <section className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            才能を、つなぐ。<br />
            <span className="text-purple-200">手数料10%</span>で始める営業革命。
          </h1>
          <p className="text-xl text-purple-100 mb-8">
            ランサーズ16.5%・ココナラ22%より断然お得。<br />
            アーティスト特化型のマッチングプラットフォーム。
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/auth"
              className="bg-white text-purple-700 font-bold px-8 py-3 rounded-full hover:bg-purple-50 transition"
            >
              無料で始める
            </Link>
            <Link
              href="/projects"
              className="border border-white text-white font-bold px-8 py-3 rounded-full hover:bg-white/10 transition"
            >
              案件を探す
            </Link>
          </div>
        </div>
      </section>

      {/* 新着案件 */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">新着案件</h2>
          <Link href="/projects" className="text-purple-600 hover:underline">
            すべて見る →
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="border rounded-xl p-5 hover:shadow-lg transition"
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
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">注目のアーティスト</h2>
            <Link href="/artists" className="text-purple-600 hover:underline">
              すべて見る →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {artists.map((artist) => (
              <Link
                key={artist.id}
                href={`/artists/${artist.id}`}
                className="bg-white rounded-xl p-4 text-center hover:shadow-lg transition"
              >
                <div className="w-16 h-16 rounded-full bg-purple-200 mx-auto mb-3 overflow-hidden">
                  {artist.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artist.avatarUrl} alt={artist.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <p className="font-bold text-sm">{artist.name}</p>
                {artist.role === 'PRO' && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">PRO</span>
                )}
                <p className="text-xs text-gray-500 mt-1">⭐ {Number(artist.averageRating).toFixed(1)}</p>
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

      {/* 手数料比較 */}
      <section className="py-16 px-4 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-8">手数料の比較</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'ランサーズ', fee: '16.5%', highlight: false },
            { name: 'クラウドワークス', fee: '20%', highlight: false },
            { name: 'ココナラ', fee: '22%', highlight: false },
            { name: 'CreatorLinks', fee: '10%', highlight: true },
          ].map((item) => (
            <div
              key={item.name}
              className={`rounded-xl p-6 ${item.highlight ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}
            >
              <p className={`text-sm mb-2 ${item.highlight ? 'text-purple-200' : 'text-gray-500'}`}>
                {item.name}
              </p>
              <p className={`text-3xl font-bold ${item.highlight ? 'text-white' : 'text-gray-700'}`}>
                {item.fee}
              </p>
            </div>
          ))}
        </div>
        <p className="text-gray-500 mt-6 text-sm">
          ※ 1万円案件の場合、CreatorLinks は手取り ¥9,000（業界最高水準）
        </p>
      </section>
    </div>
  )
}
