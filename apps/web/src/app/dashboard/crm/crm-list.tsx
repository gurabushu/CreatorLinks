'use client'

// CRM 顧客一覧の CSR 絞込＋並べ替えラッパ。
// SSR で集計済の stats を受け取り、クライアント側で:
//   - name/displayName の部分一致 (大小区別なし) で絞込
//   - 並び順を切替 (累計取引額 / 取引件数 / 最終取引日 / Encore 相性 / 名前)
// を提供する。レコード件数は 100-500 件程度を想定、クライアント処理で十分軽量。

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type CounterpartyStats = {
  id: string
  name: string
  displayName: string | null
  avatarUrl: string | null
  matchCount: number
  completedCount: number
  totalYen: number
  lastMatchAt: Date | string
  mutualEncore: boolean
  latestMessage: { body: string; createdAt: Date | string; senderIsMe: boolean } | null
}

type SortKey = 'amount' | 'count' | 'recent' | 'encore' | 'name'

const SORT_LABEL: Record<SortKey, string> = {
  amount: '累計取引額が多い順',
  count: '取引件数が多い順',
  recent: '最終取引が新しい順',
  encore: 'Encore 相性優先',
  name: '名前 (五十音)',
}

function relTime(d: Date | string | null): string {
  if (!d) return '—'
  const diffMs = Date.now() - new Date(d).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 60) return `${min} 分前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 時間前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 日前`
  const month = Math.floor(day / 30)
  return `${month} ヶ月前`
}

export function CrmList({ stats, meId }: { stats: CounterpartyStats[]; meId: string }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('amount')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? stats.filter((c) => {
          const hay = `${c.name} ${c.displayName ?? ''}`.toLowerCase()
          return hay.includes(q)
        })
      : stats

    const list = [...base]
    switch (sort) {
      case 'amount':
        list.sort((a, b) => b.totalYen - a.totalYen || b.matchCount - a.matchCount)
        break
      case 'count':
        list.sort((a, b) => b.matchCount - a.matchCount || b.totalYen - a.totalYen)
        break
      case 'recent':
        list.sort(
          (a, b) => new Date(b.lastMatchAt).getTime() - new Date(a.lastMatchAt).getTime(),
        )
        break
      case 'encore':
        list.sort((a, b) => {
          if (a.mutualEncore !== b.mutualEncore) return a.mutualEncore ? -1 : 1
          return b.totalYen - a.totalYen
        })
        break
      case 'name':
        list.sort((a, b) => (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name, 'ja'))
        break
    }
    return list
  }, [stats, query, sort])

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="名前で検索 (例: 山田)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          aria-label="顧客名で検索"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="shrink-0 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="並べ替え"
        >
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      {query && (
        <p className="text-xs text-gray-500 mb-3">
          「{query}」で絞込中 — {filtered.length} 件 /{' '}
          <button
            onClick={() => setQuery('')}
            className="text-purple-600 hover:underline"
            type="button"
          >
            クリア
          </button>
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-sm text-gray-600">
          該当する顧客が見つかりません。
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <CounterpartyCard c={c} meId={meId} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function CounterpartyCard({ c, meId: _meId }: { c: CounterpartyStats; meId: string }) {
  const displayName = c.displayName || c.name
  return (
    <Link
      href={`/artists/${c.id}`}
      className="block bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 hover:shadow-sm hover:border-purple-300 transition group"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 overflow-hidden flex items-center justify-center text-white font-bold shrink-0">
          {c.avatarUrl ? (
            <Image
              src={c.avatarUrl}
              alt={displayName}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          ) : (
            displayName.charAt(0)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <p className="font-bold text-base sm:text-lg text-gray-900 group-hover:text-purple-700 transition truncate">
              {displayName}
            </p>
            {c.mutualEncore && (
              <span className="text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 px-2 py-0.5 rounded-full">
                🎵 Encore 相性
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-2 text-xs">
            <div>
              <div className="text-gray-400">取引件数</div>
              <div className="font-bold text-gray-800">
                {c.matchCount}
                {c.completedCount < c.matchCount && (
                  <span className="text-[10px] text-gray-400 font-normal ml-0.5">
                    ({c.completedCount} 完了)
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-400">累計取引額</div>
              <div className="font-bold text-purple-700">¥{c.totalYen.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-400">最終取引</div>
              <div className="font-bold text-gray-800">{relTime(c.lastMatchAt)}</div>
            </div>
          </div>

          {c.latestMessage && (
            <div className="text-xs text-gray-500 line-clamp-1 border-l-2 border-gray-200 pl-2">
              <span className="text-[10px] font-medium mr-1">
                {c.latestMessage.senderIsMe ? '自分' : displayName}:
              </span>
              {c.latestMessage.body}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
