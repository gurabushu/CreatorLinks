import type { Metadata } from 'next'
import { ArtistListClient } from './artist-list-client'
import { listArtistsAction } from '@/server/actions/artist'
import { listMyLikedIdsAction } from '@/server/actions/like'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'アーティスト一覧 | CreatorLinks',
  description: '音楽・イラスト・動画などのクリエイターを探せます。手数料7%で直接マッチング。',
}

export const dynamic = 'force-dynamic'

export default async function ArtistsPage() {
  let initialArtists: Awaited<ReturnType<typeof listArtistsAction>>['items'] = []
  let initialNextCursor: string | null = null
  let initialLikedIds: string[] = []

  try {
    const [result, liked, session] = await Promise.all([
      listArtistsAction({ limit: 12 }),
      listMyLikedIdsAction(),
      auth(),
    ])
    initialArtists = result.items
    initialNextCursor = result.nextCursor
    initialLikedIds = liked
    void session
  } catch {
    // DB unavailable — クライアントが再取得する
  }

  const session = await auth().catch(() => null)
  const currentUserId = session?.user?.id ?? null

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">アーティスト一覧</h1>
        <p className="text-gray-500 mt-1">音楽・イラスト・動画など様々なクリエイターと直接つながれます</p>
      </div>
      <ArtistListClient
        initialArtists={initialArtists}
        initialNextCursor={initialNextCursor}
        initialLikedIds={initialLikedIds}
        currentUserId={currentUserId}
      />
    </div>
  )
}
