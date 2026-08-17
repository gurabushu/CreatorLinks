'use client'

// アーティスト一覧上部の横スクロール Stories bar。
// - 自分アバター (＋アイコン付き) を先頭に表示。タップで Composer 起動。
//   既に自分の未失効 Story があるならリング付き + タップで自分の viewer が開く (小メニューで追加/削除)。
// - フォロー中の author を続けて表示。未読はグラデーションリング、既読はグレー。
// - 全画面 viewer は StoryViewer コンポーネントに委譲。

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StoryAuthorGroup } from '@creator-links/shared'
import { StoryComposer } from './story-composer'
import { StoryViewer } from './story-viewer'
import { getDisplayName } from '@/lib/user'

type Props = {
  myGroup: StoryAuthorGroup | null
  followingGroups: StoryAuthorGroup[]
}

export function StoriesBar({ myGroup, followingGroups }: Props) {
  const router = useRouter()
  const [composerOpen, setComposerOpen] = useState(false)
  const [viewerStartIndex, setViewerStartIndex] = useState<number | null>(null)

  // Viewer に渡す配列は「自分 (あれば) → フォロー中」の順で構築
  const allGroups = useMemo(() => {
    return myGroup ? [myGroup, ...followingGroups] : followingGroups
  }, [myGroup, followingGroups])

  const openMyBubble = () => {
    if (myGroup && myGroup.stories.length > 0) {
      setViewerStartIndex(0)
    } else {
      setComposerOpen(true)
    }
  }

  return (
    <>
      <div className="relative -mx-4 sm:mx-0">
        <ul className="flex gap-3 sm:gap-4 overflow-x-auto px-4 sm:px-0 py-2 scrollbar-thin">
          {/* 自分アイコン (常時表示) */}
          <li className="shrink-0">
            <button
              type="button"
              onClick={openMyBubble}
              className="flex flex-col items-center gap-1 focus:outline-none"
              aria-label={
                myGroup && myGroup.stories.length > 0
                  ? '自分のストーリーを見る'
                  : 'ストーリーを投稿'
              }
            >
              <div
                className={`relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full ${
                  myGroup && myGroup.stories.length > 0
                    ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400 p-[2px]'
                    : 'bg-gray-200 p-[2px]'
                }`}
              >
                <div className="w-full h-full rounded-full bg-white p-[2px]">
                  {myGroup?.author.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={myGroup.author.avatarUrl}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-100" />
                  )}
                </div>
                {/* 右下 + アイコン (未投稿時のみ) */}
                {(!myGroup || myGroup.stories.length === 0) && (
                  <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center border-2 border-white">
                    ＋
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-600 max-w-[72px] truncate">あなた</span>
            </button>
          </li>

          {/* フォロー中 author の Story */}
          {followingGroups.map((g, i) => {
            // allGroups での index。自分 group がいれば +1、いなければそのまま。
            const viewerIndex = myGroup ? i + 1 : i
            return (
              <li key={g.author.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setViewerStartIndex(viewerIndex)}
                  className="flex flex-col items-center gap-1 focus:outline-none"
                >
                  <div
                    className={`w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full p-[2px] ${
                      g.hasUnviewed
                        ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400'
                        : 'bg-gray-300'
                    }`}
                  >
                    <div className="w-full h-full rounded-full bg-white p-[2px]">
                      {g.author.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.author.avatarUrl}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gray-100" />
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-600 max-w-[72px] truncate">
                    {getDisplayName(g.author)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {composerOpen && (
        <StoryComposer
          onClose={() => setComposerOpen(false)}
          onCreated={() => {
            setComposerOpen(false)
            router.refresh()
          }}
        />
      )}
      {viewerStartIndex !== null && allGroups.length > 0 && (
        <StoryViewer
          groups={allGroups}
          startIndex={viewerStartIndex}
          onClose={() => {
            setViewerStartIndex(null)
            router.refresh() // 視聴済みリング反映
          }}
        />
      )}
    </>
  )
}
