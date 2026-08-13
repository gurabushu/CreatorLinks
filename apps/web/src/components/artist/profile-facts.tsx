// アーティストの基本プロフィール情報（性別・身長・活動歴）を統一デザインで表示
// - カラフルなピル型で視認性を上げる
// - 一覧カード (size='sm') と詳細ページ (size='md') 両方で使う

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
    ? 'text-xs sm:text-[13px] px-2.5 py-1 gap-1.5 font-medium'
    : 'text-sm sm:text-base px-3 py-1.5 gap-2 font-semibold'
  const iconClass = isSm ? 'w-3.5 h-3.5' : 'w-4 h-4 sm:w-[18px] sm:h-[18px]'

  const genderConfig =
    gender === 'MALE'
      ? {
          className: 'bg-blue-50 text-blue-700 border-blue-200',
          symbol: '♂',
        }
      : {
          className: 'bg-pink-50 text-pink-700 border-pink-200',
          symbol: '♀',
        }

  return (
    <div className="flex flex-wrap gap-1.5">
      {showGender && (
        <span
          className={`inline-flex items-center rounded-full border ${pillClass} ${genderConfig.className}`}
        >
          <span className="font-bold" aria-hidden>
            {genderConfig.symbol}
          </span>
          {GENDER_LABELS[gender]}
        </span>
      )}
      {heightCm != null && (
        <span
          className={`inline-flex items-center rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200 ${pillClass}`}
        >
          <svg
            viewBox="0 0 24 24"
            className={iconClass}
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
        <span
          className={`inline-flex items-center rounded-full border bg-amber-50 text-amber-800 border-amber-200 ${pillClass}`}
        >
          <svg
            viewBox="0 0 24 24"
            className={iconClass}
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
