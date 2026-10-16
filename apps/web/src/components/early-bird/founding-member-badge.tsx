import { EARLY_BIRD_TOTAL } from '@/lib/early-bird'

type Size = 'sm' | 'md'

// 創設メンバーバッジ（スロット番号入り）。earlyBirdSlot が null なら描画しない。
// mono + purple-600 の 2 トーン方針に合わせ、黒ベースのエリート表現で統一。
export function FoundingMemberBadge({
  slot,
  size = 'sm',
  showTotal = true,
}: {
  slot: number | null | undefined
  size?: Size
  showTotal?: boolean
}) {
  if (slot === null || slot === undefined) return null

  const padded = String(slot).padStart(3, '0')
  const sizeClass =
    size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5'

  return (
    <span
      title={`創設メンバー #${padded}${showTotal ? ` / ${EARLY_BIRD_TOTAL}` : ''}`}
      className={`inline-flex items-center gap-1 rounded-full bg-zinc-900 text-white font-bold tracking-wider ${sizeClass}`}
    >
      <span aria-hidden className="text-[0.9em] leading-none">★</span>
      <span>
        創設 #{padded}
        {showTotal && <span className="opacity-60"> / {EARLY_BIRD_TOTAL}</span>}
      </span>
    </span>
  )
}
