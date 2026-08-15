// Next.js App Router 標準の sitemap.xml エンドポイント
// 静的ルート + DB から公開状態のイベント / アーティスト / プロジェクトを吸い上げる。
// Google Search Console に /sitemap.xml として提出する。

import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { resolveAppUrl } from '@/lib/app-url'

function siteUrl(): string {
  return resolveAppUrl()
}

// sitemap は Search Console 経由でクロール優先度のヒントに使われるだけで、
// changeFrequency / priority は現状のガイドラインでは参考値なので詳細に詰めない。
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/projects`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/artists`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/events`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/announcements`, lastModified: now, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${base}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/tokutei`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  // DB 未接続時（ビルド時のプリレンダーで prisma 生成失敗など）に落ちないよう try/catch。
  // 動的エントリが空になっても sitemap 自体は静的分だけ返す。
  const dynamicEntries: MetadataRoute.Sitemap = []

  try {
    const [events, artists, projects] = await Promise.all([
      // 公開かつ未終了のイベントのみ（過去イベントも数か月は残す価値があるので startAt で足切りしない）
      prisma.event.findMany({
        where: { status: 'PUBLISHED', visibility: 'PUBLIC' },
        select: { id: true, updatedAt: true, startAt: true },
        orderBy: { startAt: 'desc' },
        take: 5000,
      }),
      // アーティスト一覧ページからリンクされる公開ユーザー
      prisma.user.findMany({
        where: { isGuest: false },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
      // 募集中プロジェクトのみ（クローズ済みは検索価値が低い）
      prisma.project.findMany({
        where: { status: 'OPEN' },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      }),
    ])

    for (const e of events) {
      dynamicEntries.push({
        url: `${base}/events/${e.id}`,
        lastModified: e.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
    for (const a of artists) {
      dynamicEntries.push({
        url: `${base}/artists/${a.id}`,
        lastModified: a.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }
    for (const p of projects) {
      dynamicEntries.push({
        url: `${base}/projects/${p.id}`,
        lastModified: p.createdAt,
        changeFrequency: 'daily',
        priority: 0.6,
      })
    }
  } catch (e) {
    console.error('[sitemap] failed to load dynamic entries', e)
  }

  return [...staticEntries, ...dynamicEntries]
}
