// SEO 構造化データ (JSON-LD) 生成の共通ヘルパー。
// schema.org 仕様に準拠。Google Rich Results / Sitelinks / Knowledge Panel 対応。
//
// - Organization / WebSite は site-wide（layout.tsx で 1 回）
// - Event / Person は各詳細ページで動的生成
//
// metadataBase (NEXT_PUBLIC_APP_URL) が本番 URL でないと canonical / url が壊れるので、
// この lib は必ず絶対 URL 前提で組む。

import { SITE_NAME, SITE_TAGLINE } from './brand'

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

// -------- Site-wide --------

// 会社 / サービス提供者としての識別子。Knowledge Panel と Sitelinks の基礎。
export function organizationJsonLd() {
  const base = siteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: base,
    logo: `${base}/logo.png`,
    description: SITE_TAGLINE,
  }
}

// サイト全体を表す WebSite ノード。SearchAction を持たせて Sitelinks Search Box を候補化。
export function websiteJsonLd() {
  const base = siteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: base,
    inLanguage: 'ja-JP',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${base}/artists?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

// -------- Per-page --------

export type EventLd = {
  id: string
  title: string
  description?: string | null
  startAt: Date
  endAt?: Date | null
  venueName?: string | null
  venueAddress?: string | null
  city?: string | null
  isFree?: boolean
  ticketPriceYen?: number | null
  ticketUrl?: string | null
  coverUrl?: string | null
  status: string // PUBLISHED / CANCELLED / COMPLETED / DRAFT
  creator: { id: string; name: string; displayName?: string | null; avatarUrl?: string | null }
}

// schema.org Event の主要フィールドを埋める。
// eventStatus / eventAttendanceMode は Google Event Rich Results の必須条件を満たすため必ず設定。
export function eventJsonLd(e: EventLd) {
  const base = siteUrl()
  const statusMap: Record<string, string> = {
    PUBLISHED: 'https://schema.org/EventScheduled',
    CANCELLED: 'https://schema.org/EventCancelled',
    COMPLETED: 'https://schema.org/EventScheduled', // 過去実施済みは Scheduled のまま
    DRAFT: 'https://schema.org/EventScheduled',
  }
  const attendanceMode = e.venueName
    ? 'https://schema.org/OfflineEventAttendanceMode'
    : 'https://schema.org/MixedEventAttendanceMode'

  const performerName = e.creator.displayName || e.creator.name

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    url: `${base}/events/${e.id}`,
    startDate: e.startAt.toISOString(),
    ...(e.endAt ? { endDate: e.endAt.toISOString() } : {}),
    eventStatus: statusMap[e.status] ?? 'https://schema.org/EventScheduled',
    eventAttendanceMode: attendanceMode,
    ...(e.description ? { description: e.description } : {}),
    ...(e.coverUrl ? { image: [e.coverUrl] } : {}),
    location: e.venueName
      ? {
          '@type': 'Place',
          name: e.venueName,
          ...(e.venueAddress || e.city
            ? {
                address: {
                  '@type': 'PostalAddress',
                  ...(e.venueAddress ? { streetAddress: e.venueAddress } : {}),
                  ...(e.city ? { addressLocality: e.city } : {}),
                  addressCountry: 'JP',
                },
              }
            : {}),
        }
      : { '@type': 'VirtualLocation', url: `${base}/events/${e.id}` },
    performer: {
      '@type': 'PerformingGroup',
      name: performerName,
      url: `${base}/artists/${e.creator.id}`,
    },
    organizer: {
      '@type': 'Organization',
      name: performerName,
      url: `${base}/artists/${e.creator.id}`,
    },
  }

  // Offers は Google が Event Rich Results で強く推奨。無料/有料どちらも入れる。
  if (e.ticketUrl || typeof e.ticketPriceYen === 'number' || e.isFree) {
    schema.offers = {
      '@type': 'Offer',
      price: e.isFree ? 0 : e.ticketPriceYen ?? 0,
      priceCurrency: 'JPY',
      availability: 'https://schema.org/InStock',
      url: e.ticketUrl ?? `${base}/events/${e.id}`,
      validFrom: new Date().toISOString(),
    }
  }

  return schema
}

export type PersonLd = {
  id: string
  name: string
  displayName?: string | null
  avatarUrl?: string | null
  bio?: string | null
  genres?: string[]
}

export function personJsonLd(p: PersonLd) {
  const base = siteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.displayName || p.name,
    url: `${base}/artists/${p.id}`,
    ...(p.avatarUrl ? { image: p.avatarUrl } : {}),
    ...(p.bio ? { description: p.bio } : {}),
    ...(p.genres && p.genres.length > 0 ? { knowsAbout: p.genres } : {}),
  }
}
