'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type PreferredMode = 'ARTIST' | 'CLIENT' | 'HYBRID'
const PREFERRED_MODE_KEY = 'encorecue:preferredMode'

type Cta = {
  href: string
  emoji: string
  title: string
  sub: string
  tone: 'primary' | 'dark' | 'success' | 'warn'
}

const CTA_BY_MODE: Record<PreferredMode, Cta[]> = {
  ARTIST: [
    { href: '/projects', emoji: '🔎', title: '案件を探す', sub: 'ジャンル・レベルで絞って応募できる案件を見つけよう', tone: 'primary' },
    { href: '/dashboard/portfolio', emoji: '🎨', title: 'ポートフォリオ追加', sub: '新しい作品を上げると閲覧とスカウトが増える', tone: 'dark' },
    { href: '/dashboard/calendar', emoji: '📅', title: '空き日を更新', sub: 'カレンダーに空き日を入れると、ピッタリの依頼が届く', tone: 'success' },
  ],
  CLIENT: [
    { href: '/projects/new', emoji: '📝', title: '案件を作成', sub: '3ステップで公開。テンプレで1分', tone: 'primary' },
    { href: '/artists', emoji: '🔎', title: 'クリエイターを探す', sub: 'ジャンル・楽器・レベルで絞り込み', tone: 'dark' },
    { href: '/events/new', emoji: '📣', title: 'イベントを告知', sub: '共演者募集も同じフローで', tone: 'warn' },
  ],
  HYBRID: [
    { href: '/projects/new', emoji: '📝', title: '案件を作成', sub: '発注テンプレから1分で公開', tone: 'primary' },
    { href: '/artists', emoji: '🎤', title: 'クリエイターを探す', sub: 'スカウト・フォローで仲間を広げる', tone: 'dark' },
    { href: '/projects', emoji: '🔎', title: '案件を探す', sub: '出演側として応募できる案件も', tone: 'success' },
  ],
}

const TONE_CLASS: Record<Cta['tone'], string> = {
  primary: 'bg-slate-600 hover:bg-slate-700',
  dark: 'bg-zinc-900 hover:bg-zinc-800',
  success: 'bg-emerald-600 hover:bg-emerald-700',
  warn: 'bg-amber-500 hover:bg-amber-600',
}

export function HeroCta() {
  const [mode, setMode] = useState<PreferredMode>('HYBRID')
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PREFERRED_MODE_KEY)
      if (stored === 'ARTIST' || stored === 'CLIENT' || stored === 'HYBRID') {
        setMode(stored)
      }
    } catch {
      // 無視
    }
  }, [])

  const ctas = CTA_BY_MODE[mode]

  return (
    <section className="mb-8" aria-label="次のアクション">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ctas.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`group block rounded-2xl p-5 text-white transition-all ${TONE_CLASS[c.tone]} shadow-sm hover:shadow-md`}
          >
            <div className="text-2xl mb-2" aria-hidden>
              {c.emoji}
            </div>
            <p className="font-bold text-base mb-1">{c.title}</p>
            <p className="text-xs text-white/80 leading-snug mb-3 min-h-[2.4em]">{c.sub}</p>
            <span className="inline-flex items-center text-xs font-medium bg-white/20 group-hover:bg-white/30 rounded-full px-3 py-1 transition-colors">
              始める →
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
