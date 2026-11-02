'use client'

import { useEffect, useState } from 'react'

type PreferredMode = 'ARTIST' | 'CLIENT' | 'HYBRID'
const PREFERRED_MODE_KEY = 'encorecue:preferredMode'

type Role = {
  mode: PreferredMode
  emoji: string
  title: string
  desc: string
  examples: string[]
}

const ROLES: Role[] = [
  {
    mode: 'ARTIST',
    emoji: '🎸',
    title: '出演・制作を受ける',
    desc: '出演募集や案件への応募がメイン。収入管理も。',
    examples: ['案件に応募', 'ポートフォリオ発信', '受け取り入金'],
  },
  {
    mode: 'CLIENT',
    emoji: '🎤',
    title: '依頼する',
    desc: 'バンドメンバー募集、録音・MIX発注、イベント主催。',
    examples: ['案件を公開', 'クリエイター検索', 'スカウト送信'],
  },
  {
    mode: 'HYBRID',
    emoji: '🎛',
    title: '両方やる',
    desc: '出す・受けるを行き来する。切替ピルで常に明示。',
    examples: ['サイドバー両表示', '切替が1タップ', '混在ダッシュボード'],
  },
]

export function RoleSelector() {
  const [mode, setMode] = useState<PreferredMode | null>(null)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PREFERRED_MODE_KEY)
      if (stored === 'ARTIST' || stored === 'CLIENT' || stored === 'HYBRID') {
        setMode(stored)
      } else {
        setMode('HYBRID')
      }
    } catch {
      setMode('HYBRID')
    }
  }, [])

  const choose = (next: PreferredMode) => {
    setMode(next)
    try {
      window.localStorage.setItem(PREFERRED_MODE_KEY, next)
    } catch {
      // 無視
    }
  }

  return (
    <section className="mb-10 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-zinc-50 border border-purple-200/60 p-5 sm:p-7">
      <div className="mb-5">
        <span className="inline-block text-[11px] font-bold tracking-wider text-purple-600 bg-white/80 border border-purple-200 px-2.5 py-0.5 rounded-full mb-2">
          Step 1 / 2
        </span>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          主にどんな使い方をされますか？
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          選んだ内容に合わせて、サイドバーとダッシュボードが最適化されます。あとで設定からいつでも変更できます。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ROLES.map((r) => {
          const selected = mode === r.mode
          return (
            <button
              key={r.mode}
              type="button"
              onClick={() => choose(r.mode)}
              aria-pressed={selected}
              className={`text-left rounded-2xl p-4 border-2 transition-all ${
                selected
                  ? 'bg-purple-50 border-purple-600 shadow-sm ring-4 ring-purple-100'
                  : 'bg-white border-zinc-200 hover:border-purple-300 hover:bg-purple-50/40'
              }`}
            >
              <div className="text-3xl text-center mb-2" aria-hidden>
                {r.emoji}
              </div>
              <p className={`font-bold text-sm text-center mb-1 ${selected ? 'text-purple-700' : 'text-gray-900'}`}>
                {r.title}
              </p>
              <p className="text-[11px] text-gray-600 text-center leading-relaxed mb-3">
                {r.desc}
              </p>
              <ul className="space-y-1">
                {r.examples.map((ex) => (
                  <li key={ex} className="flex items-center gap-1.5 text-[11px] text-gray-700">
                    <span className={selected ? 'text-purple-600' : 'text-emerald-500'} aria-hidden>
                      ✓
                    </span>
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
              {selected && (
                <p className="mt-3 text-center text-[10px] font-bold text-purple-700 bg-white/80 rounded-full py-1">
                  選択中
                </p>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
