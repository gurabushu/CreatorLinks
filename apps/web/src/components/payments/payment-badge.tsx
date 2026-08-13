// Payment 状態バッジ（共通）: server / client どちらからも import 可能な純 JSX

export type PaymentStatus = 'AWAITING' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'FAILED'

const PAYMENT_BADGE: Record<PaymentStatus, { label: string; className: string }> = {
  AWAITING: { label: '支払い前', className: 'bg-gray-100 text-gray-600' },
  HELD:     { label: '支払い済み（保管中）', className: 'bg-emerald-100 text-emerald-800' },
  RELEASED: { label: '送金完了', className: 'bg-blue-100 text-blue-700' },
  REFUNDED: { label: '返金済み', className: 'bg-gray-100 text-gray-600' },
  FAILED:   { label: '支払い失敗', className: 'bg-red-100 text-red-700' },
}

export function PaymentBadge({
  status,
  size = 'md',
}: {
  status: PaymentStatus
  size?: 'sm' | 'md'
}) {
  const config = PAYMENT_BADGE[status]
  const sizeClass =
    size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[10px] sm:text-xs px-2 sm:px-3 py-1'
  return (
    <span
      className={`inline-block shrink-0 rounded-full font-medium whitespace-nowrap ${sizeClass} ${config.className}`}
    >
      {config.label}
    </span>
  )
}
