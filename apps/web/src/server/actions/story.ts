'use server'

// 24 時間で消える Story 投稿の Server Actions。
// アーティスト一覧の先頭「Stories bar」で使う 4 アクション:
//   - createStoryAction:            投稿 (画像/動画/テキスト)
//   - listFollowingStoriesAction:   自分がフォロー中の author の未失効 Story を author グループで返す
//   - markStoryViewedAction:        既読記録 (StoryView upsert)
//   - deleteStoryAction:            author 本人のみ削除可

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  CreateStorySchema,
  STORY_TTL_HOURS,
  type CreateStoryInput,
  type StoryAuthorGroup,
} from '@creator-links/shared'

export type StoryActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function createStoryAction(
  input: CreateStoryInput,
): Promise<StoryActionResult<{ id: string }>> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const parsed = CreateStorySchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { success: false, error: first?.message ?? '入力内容を確認してください' }
  }
  const data = parsed.data

  const expiresAt = new Date(Date.now() + STORY_TTL_HOURS * 60 * 60 * 1000)

  const story = await prisma.story.create({
    data: {
      authorId: session.user.id,
      mediaType: data.mediaType,
      mediaUrl: data.mediaType === 'TEXT' ? null : data.mediaUrl,
      body: data.mediaType === 'TEXT' ? data.body : (data.body ?? null),
      backgroundColor: data.mediaType === 'TEXT' ? (data.backgroundColor ?? null) : null,
      expiresAt,
    },
    select: { id: true },
  })

  // /artists ページ先頭の Stories bar は SSR で描画するので revalidate 必須
  revalidatePath('/artists')
  return { success: true, data: story }
}

// 自分がフォロー中のユーザーの、まだ失効していない Story を author 単位でグループ化して返す。
// 自分自身の Story は独立して先頭に出したいので、UI 側で個別に取得する (getMyActiveStoriesAction)。
export async function listFollowingStoriesAction(): Promise<StoryAuthorGroup[]> {
  const session = await auth()
  if (!session) return []

  const now = new Date()

  // 自分がフォロー中の following user id 一覧
  const following = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  })
  const followingIds = following.map((f) => f.followingId)
  if (followingIds.length === 0) return []

  const stories = await prisma.story.findMany({
    where: {
      authorId: { in: followingIds },
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      mediaType: true,
      mediaUrl: true,
      body: true,
      backgroundColor: true,
      createdAt: true,
      expiresAt: true,
      author: {
        select: { id: true, name: true, displayName: true, avatarUrl: true },
      },
      views: {
        where: { viewerId: session.user.id },
        select: { id: true },
        take: 1,
      },
    },
  })

  // author ごとにグループ化。author 順序は「未読ありが先、その中で最新 Story が新しい順」。
  const groupMap = new Map<string, StoryAuthorGroup>()
  for (const s of stories) {
    const key = s.author.id
    let group = groupMap.get(key)
    if (!group) {
      group = {
        author: s.author,
        hasUnviewed: false,
        stories: [],
      }
      groupMap.set(key, group)
    }
    const viewedByMe = s.views.length > 0
    if (!viewedByMe) group.hasUnviewed = true
    group.stories.push({
      id: s.id,
      mediaType: s.mediaType,
      mediaUrl: s.mediaUrl,
      body: s.body,
      backgroundColor: s.backgroundColor,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      viewedByMe,
    })
  }

  const groups = Array.from(groupMap.values())
  groups.sort((a, b) => {
    // 未読ありを先頭、次いで最新 Story の createdAt が新しい順
    if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1
    const aLatest = a.stories[a.stories.length - 1]?.createdAt ?? ''
    const bLatest = b.stories[b.stories.length - 1]?.createdAt ?? ''
    return bLatest.localeCompare(aLatest)
  })
  return groups
}

// 自分の未失効 Story (Stories bar 先頭に「あなた」として出す用)
export async function getMyActiveStoriesAction(): Promise<StoryAuthorGroup | null> {
  const session = await auth()
  if (!session) return null

  const now = new Date()
  const stories = await prisma.story.findMany({
    where: { authorId: session.user.id, expiresAt: { gt: now } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, mediaType: true, mediaUrl: true, body: true,
      backgroundColor: true, createdAt: true, expiresAt: true,
    },
  })
  if (stories.length === 0) return null

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, displayName: true, avatarUrl: true },
  })
  if (!me) return null

  return {
    author: me,
    hasUnviewed: false, // 自分の投稿に「未読」概念はない
    stories: stories.map((s) => ({
      id: s.id,
      mediaType: s.mediaType,
      mediaUrl: s.mediaUrl,
      body: s.body,
      backgroundColor: s.backgroundColor,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      viewedByMe: true,
    })),
  }
}

export async function markStoryViewedAction(
  storyId: string,
): Promise<StoryActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'unauthorized' }

  await prisma.storyView
    .upsert({
      where: { storyId_viewerId: { storyId, viewerId: session.user.id } },
      create: { storyId, viewerId: session.user.id },
      update: {}, // 二度目以降は viewedAt を上書きしない (最初の視聴時刻を残す)
    })
    .catch(() => null) // 既に消えた Story への視聴記録失敗は無視
  return { success: true, data: undefined }
}

export async function deleteStoryAction(
  storyId: string,
): Promise<StoryActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'unauthorized' }

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { authorId: true },
  })
  if (!story) return { success: false, error: 'Story が見つかりません' }
  if (story.authorId !== session.user.id) {
    return { success: false, error: '投稿者のみ削除できます' }
  }
  await prisma.story.delete({ where: { id: storyId } })
  revalidatePath('/artists')
  return { success: true, data: undefined }
}
