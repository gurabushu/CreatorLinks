// /dashboard/following — 自分がフォロー中のユーザー一覧。
// フォロー解除は Client 側の <FollowingListClient /> で処理。

import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SITE_NAME } from '@/lib/brand'
import { FollowingListClient } from './following-list-client'

export const metadata: Metadata = {
  title: `フォロー中 | ${SITE_NAME}`,
  robots: { index: false, follow: false }, // 個人フィード相当なので noindex
}
export const dynamic = 'force-dynamic'

export default async function FollowingPage() {
  const session = await auth()
  if (!session) redirect('/auth?callbackUrl=/dashboard/following')

  const follows = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      following: {
        select: {
          id: true,
          name: true,
          displayName: true,
          role: true,
          avatarUrl: true,
          genres: true,
          bio: true,
          earlyBirdSlot: true,
          isOfficial: true,
          averageRating: true,
        },
      },
    },
  })

  // 未失効の Story を持つ author id を取得 (未読ドット判定)
  const now = new Date()
  const followingIds = follows.map((f) => f.following.id)
  const authorsWithActiveStory = followingIds.length
    ? await prisma.story.findMany({
        where: { authorId: { in: followingIds }, expiresAt: { gt: now } },
        select: { authorId: true },
        distinct: ['authorId'],
      })
    : []
  const activeStoryAuthorIds = new Set(authorsWithActiveStory.map((s) => s.authorId))

  const items = follows.map((f) => ({
    followedAt: f.createdAt.toISOString(),
    user: {
      id: f.following.id,
      name: f.following.name,
      displayName: f.following.displayName,
      role: f.following.role as 'GENERAL' | 'PRO' | 'ADMIN',
      avatarUrl: f.following.avatarUrl,
      genres: f.following.genres,
      bio: f.following.bio,
      earlyBirdSlot: f.following.earlyBirdSlot,
      isOfficial: f.following.isOfficial,
      averageRating: Number(f.following.averageRating),
      hasActiveStory: activeStoryAuthorIds.has(f.following.id),
    },
  }))

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-10 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">フォロー中</h1>
        <p className="text-sm text-gray-500 mt-1">
          あなたがフォローしている {items.length} 人のアーティスト
        </p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-600 mb-4">
            まだ誰もフォローしていません。
          </p>
          <Link
            href="/artists"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white text-sm px-5 py-2 rounded-lg transition"
          >
            アーティストを探す
          </Link>
        </div>
      ) : (
        <FollowingListClient initialItems={items} />
      )}
    </div>
  )
}
