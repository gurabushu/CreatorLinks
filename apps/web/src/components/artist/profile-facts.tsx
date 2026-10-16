// アーティストの基本プロフィール情報（性別・身長・活動歴）を統一デザインで表示
// mono + purple-600 の 2 トーン。カテゴリカラーは使わない。

import { GENDER_LABELS } from '@creator-links/shared'

type Gender = 'MALE' | 'FEMALE' | 'NOT_SPECIFIED'

export function ProfileFacts({
  gender,
  heightCm,
  activityYears,
  size = 'md',
}: {
  gender: Gender | null
  heightCm: number | null
  activityYears: number | null
  size?: 'sm' | 'md'
}) {
  const showGender = gender && gender !== 'NOT_SPECIFIED'
  if (!showGender && heightCm == null && activityYears == null) return null

  const isSm = size === 'sm'
  const pillClass = isSm
    ? 'text-xs px-2.5 py-1 gap-1.5 font-medium'
    : 'text-sm px-3 py-1 gap-1.5 font-medium'
  const iconClass = isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const base =
    'inline-flex items-center rounded-full border border-zinc-200 bg-white text-zinc-700'

  return (
    <div className="flex flex-wrap gap-1.5">
      {showGender && (
        <span className={`${base} ${pillClass}`}>
          <span className="text-zinc-500 font-bold" aria-hidden>
            {gender === 'MALE' ? '♂' : '♀'}
          </span>
          {GENDER_LABELS[gender]}
        </span>
      )}
      {heightCm != null && (
        <span className={`${base} ${pillClass}`}>
          <svg
            viewBox="0 0 24 24"
            className={`${iconClass} text-zinc-500`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 3v18" />
            <path d="M8 3h8" />
            <path d="M8 21h8" />
            <path d="M15 7l-3-3-3 3" />
            <path d="M9 17l3 3 3-3" />
          </svg>
          {heightCm}cm
        </span>
      )}
      {activityYears != null && (
        <span className={`${base} ${pillClass}`}>
          <svg
            viewBox="0 0 24 24"
            className={`${iconClass} text-zinc-500`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          歴 {activityYears}年
        </span>
      )}
    </div>
  )
}
