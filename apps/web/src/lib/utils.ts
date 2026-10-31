import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(date))
}

// 「n 分前 / n 時間前 / n 日前」等の相対表現。1 週間超は formatDate にフォールバック。
export function formatRelative(date: Date | string): string {
  const now = Date.now()
  const t = new Date(date).getTime()
  const diffSec = Math.max(0, Math.round((now - t) / 1000))
  if (diffSec < 60) return 'たった今'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} 分前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} 時間前`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay} 日前`
  return formatDate(date)
}

export function getGenreLabel(genre: string): string {
  const labels: Record<string, string> = {
    music: '音楽',
    illustration: 'イラスト',
    video: '動画',
    design: 'デザイン',
    photography: '写真',
    writing: '文章',
    voice: '声優',
    other: 'その他',
  }
  return labels[genre] ?? genre
}
