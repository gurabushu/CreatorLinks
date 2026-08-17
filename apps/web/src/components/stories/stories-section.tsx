// アーティスト一覧ページ (/artists) の先頭に置く「Stories」帯。
// サーバー側で認証・フォロー中 Story を取得し、client bar にプロップスで渡す。
// 未ログインなら描画しない (未読 UI が意味を持たないため)。

import { auth } from '@/lib/auth'
import {
  listFollowingStoriesAction,
  getMyActiveStoriesAction,
} from '@/server/actions/story'
import { StoriesBar } from './stories-bar'

export async function StoriesSection() {
  const session = await auth().catch(() => null)
  if (!session) return null

  const [myGroup, followingGroups] = await Promise.all([
    getMyActiveStoriesAction().catch(() => null),
    listFollowingStoriesAction().catch(() => []),
  ])

  // 自分の Story 有無 + フォロー中 Story ゼロなら bar 全体を非表示にしても良いが、
  // 「自分が最初に投稿できる」導線として常に自分アイコン + プラスは表示する。
  return (
    <div className="mb-4 sm:mb-6">
      <StoriesBar myGroup={myGroup} followingGroups={followingGroups} />
    </div>
  )
}
