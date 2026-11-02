// 恩人枠バッジ (isFounderExempt=true のユーザーに表示)
// 創設メンバーバッジ (FoundingMemberBadge, earlyBirdSlot 必須) とは別軸。
// admin 手動付与の永年手数料 0% 枠。開発ヒアリング協力者等。

type Size = 'sm' | 'md'

export function FounderExemptBadge({
  isFounderExempt,
  size = 'sm',
}: {
  isFounderExempt: boolean | null | undefined
  size?: Size
}) {
  if (!isFounderExempt) return null

  const sizeClass =
    size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5'

  return (
    <span
      title="恩人枠: 開発初期を支えてくれた方への永年手数料無料枠"
      className={`inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold tracking-wider ${sizeClass}`}
    >
      <span aria-hidden className="text-[0.9em] leading-none">🎖</span>
      <span>恩人枠</span>
    </span>
  )
}
