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
