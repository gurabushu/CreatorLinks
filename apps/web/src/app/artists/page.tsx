// app/artists/page.tsx — アーティスト一覧（ジャンルフィルタ + 無限スクロール）
import type { Metadata } from 'next'
import { ArtistListClient } from './artist-list-client'

export const metadata: Metadata = {
  title: 'アーティスト一覧 | CreatorLinks',
  description: '音楽・イラスト・動画などのクリエイターを探せます。手数料10%で直接マッチング。',
}

export const revalidate = 60

export default function ArtistsPage() {
  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">アーティスト一覧</h1>
        <p className="text-gray-500 mt-1">音楽・イラスト・動画など様々なクリエイターと直接つながれます</p>
      </div>
      <ArtistListClient />
    </div>
  )
}
