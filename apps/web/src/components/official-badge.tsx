// 公式アカウントの認証済みバッジ (Twitter の青バッジ相当)
// User の名前近くに置く。純 JSX なので server/client 両対応

export function OfficialBadge({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const px =
    size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <span
      title="公式アカウント"
      aria-label="公式アカウント"
      className={`inline-flex items-center justify-center rounded-full bg-purple-600 text-white shrink-0 ${px} ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3/4 h-3/4">
        <path d="M9.55 17.55l-4.6-4.6L6.5 11.4l3.05 3.05L17.55 6.45 19.1 8l-9.55 9.55z" />
      </svg>
    </span>
  )
}
