import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ArtistListClient } from './artist-list-client'
import { listArtistsAction } from '@/server/actions/artist'
import { listMyLikedIdsAction } from '@/server/actions/like'
import { auth } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard-shell/dashboard-shell'
import { ArtistSearchForm } from '@/components/layout/artist-search-form'

export const metadata: Metadata = {
  title: 'アーティスト一覧 | CreatorLinks',
  description: '音楽クリエイターを探せます。手数料7%で直接マッチング。',
}

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ q?: string }>
}

export default async function ArtistsPage({ searchParams }: Props) {
  const { q } = await searchParams
  const initialQuery = q?.trim() ?? ''

  let initialArtists: Awaited<ReturnType<typeof listArtistsAction>>['items'] = []
  let initialNextCursor: string | null = null
  let initialLikedIds: string[] = []

  try {
    const [result, liked, session] = await Promise.all([
      listArtistsAction({ limit: 12, q: initialQuery || undefined }),
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
    <DashboardShell requireAuth={false}>
      <div className="max-w-6xl mx-auto py-6 sm:py-12 px-4">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">アーティスト一覧</h1>
          <p className="text-gray-500 text-sm sm:text-base mt-1">音楽クリエイターと直接つながれます</p>
        </div>
        <Suspense
          fallback={
            <div className="mb-6 sm:mb-8 h-12 sm:h-14 md:h-16 w-full max-w-2xl rounded-xl sm:rounded-2xl bg-gray-100" aria-hidden />
          }
        >
          <ArtistSearchForm className="mb-6 sm:mb-8 w-full max-w-2xl" size="large" />
        </Suspense>
        <ArtistListClient
          initialArtists={initialArtists}
          initialNextCursor={initialNextCursor}
          initialLikedIds={initialLikedIds}
          currentUserId={currentUserId}
          initialQuery={initialQuery}
        />
      </div>
    </DashboardShell>
  )
}
