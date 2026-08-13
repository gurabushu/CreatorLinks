import { EARLY_BIRD_TOTAL } from '@/lib/early-bird'

type Size = 'sm' | 'md'

// 創設メンバーバッジ（スロット番号入り）。earlyBirdSlot が null なら描画しない。
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
    size === 'md'
      ? 'text-xs px-2.5 py-1'
      : 'text-[10px] px-2 py-0.5'

  return (
    <span
      title={`創設メンバー #${padded}${showTotal ? ` / ${EARLY_BIRD_TOTAL}` : ''}`}
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900 font-bold tracking-wider ${sizeClass}`}
    >
      <span>
        創設 #{padded}
        {showTotal && <span className="opacity-70"> / {EARLY_BIRD_TOTAL}</span>}
      </span>
    </span>
  )
}
