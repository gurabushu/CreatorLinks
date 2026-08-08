'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type Props = {
  className?: string
  inputClassName?: string
  size?: 'default' | 'large'
}

const SIZE_CLASSES = {
  default: {
    icon: 'left-3 w-4 h-4',
    input: 'h-9 pl-9 pr-3 text-sm rounded-full',
    submit: 'right-2 h-6 px-3 text-xs',
  },
  large: {
    icon: 'left-4 sm:left-5 w-5 sm:w-6 h-5 sm:h-6',
    input:
      'h-12 sm:h-14 md:h-16 pl-12 sm:pl-14 md:pl-16 pr-20 sm:pr-24 md:pr-28 text-sm sm:text-base md:text-lg rounded-xl sm:rounded-2xl shadow-sm',
    submit: 'right-1.5 sm:right-2 h-9 sm:h-10 md:h-12 px-3 sm:px-4 md:px-5 text-xs sm:text-sm',
  },
} as const

export function ArtistSearchForm({ className = '', inputClassName = '', size = 'default' }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initial = pathname === '/artists' ? searchParams.get('q') ?? '' : ''
  const [value, setValue] = useState(initial)
  const s = SIZE_CLASSES[size]

  // /artists の URL q が変わったら入力値も追従
  useEffect(() => {
    if (pathname === '/artists') {
      setValue(searchParams.get('q') ?? '')
    }
  }, [pathname, searchParams])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    router.push(trimmed ? `/artists?q=${encodeURIComponent(trimmed)}` : '/artists')
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={`relative ${className}`}>
      <span
        aria-hidden
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${s.icon}`}
      >
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={size === 'large' ? '名前・ジャンルで探す' : 'アーティストを検索...'}
        aria-label="アーティストを検索"
        className={`w-full border border-gray-200 bg-gray-50 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition ${s.input} ${inputClassName}`}
      />
      {size === 'large' && (
        <button
          type="submit"
          aria-label="検索"
          className={`absolute top-1/2 -translate-y-1/2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition ${s.submit}`}
        >
          検索
        </button>
      )}
    </form>
  )
}
