// ICS カレンダーフィード (Google カレンダー / Apple カレンダーに URL 購読できる形式で出力)
// - URL: /api/calendar/<token>.ics
// - token = SHA256(userId + CALENDAR_FEED_SECRET).slice(0, 24)
//   userId 直接露出を避けるため、サーバー側で一方向ハッシュ化した短いトークン
// - 認証不要 (トークン知識で許可)。将来 revoke したければ SECRET 回せば全ユーザー無効化。
// - 内容: 自分が主催 + CONFIRMED 参加 + ACCEPTED 案件 (今後 6 ヶ月)

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { calendarTokenToUserId } from '@/lib/calendar-token'
import { getDisplayName } from '@/lib/user'

export const dynamic = 'force-dynamic'
export const revalidate = 300 // 5 分キャッシュ

function fmtIcsDate(d: Date): string {
  // UTC YYYYMMDDTHHMMSSZ
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const h = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  const s = String(d.getUTCSeconds()).padStart(2, '0')
  return `${y}${m}${dd}T${h}${mi}${s}Z`
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function fold(line: string): string {
  // ICS 推奨: 75 オクテットで折り返し (行頭に空白)
  if (line.length <= 75) return line
  const parts: string[] = []
  let rest = line
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75))
    rest = ' ' + rest.slice(75)
  }
  parts.push(rest)
  return parts.join('\r\n')
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  // .ics 拡張子込みで来るのでトリム
  const cleanToken = token.replace(/\.ics$/, '')
  const userId = await calendarTokenToUserId(cleanToken)
  if (!userId) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, displayName: true, deletedAt: true },
  })
  if (!user || user.deletedAt) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const now = new Date()
  const horizonEnd = new Date(now)
  horizonEnd.setMonth(now.getMonth() + 6)
  const horizonStart = new Date(now)
  horizonStart.setMonth(now.getMonth() - 1) // 直近 1 ヶ月分も含める

  const [organized, participating, matches] = await Promise.all([
    prisma.event.findMany({
      where: {
        creatorId: userId,
        startAt: { gte: horizonStart, lte: horizonEnd },
        status: { in: ['PUBLISHED', 'DRAFT'] },
      },
      select: {
        id: true, title: true, description: true, startAt: true, endAt: true,
        venueName: true, venueAddress: true, updatedAt: true,
      },
    }),
    prisma.eventParticipant.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        event: { startAt: { gte: horizonStart, lte: horizonEnd } },
      },
      include: {
        event: {
          select: {
            id: true, title: true, description: true, startAt: true, endAt: true,
            venueName: true, venueAddress: true, updatedAt: true,
          },
        },
      },
    }),
    prisma.match.findMany({
      where: {
        status: { in: ['ACCEPTED', 'COMPLETED'] },
        project: { scheduledStartAt: { gte: horizonStart, lte: horizonEnd } },
        OR: [
          { artistId: userId },
          { project: { clientId: userId } },
        ],
      },
      include: {
        project: {
          select: {
            id: true, title: true, description: true,
            scheduledStartAt: true, scheduledEndAt: true,
            updatedAt: true,
          },
        },
      },
    }),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://encorecue.jp'
  const calName = `EncoreCue - ${getDisplayName(user)}`

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EncoreCue//Calendar Feed//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(calName)}`,
    'X-WR-TIMEZONE:Asia/Tokyo',
  ]

  const addEvent = (
    uid: string,
    title: string,
    description: string | null,
    start: Date,
    end: Date | null,
    location: string | null,
    url: string,
    updatedAt: Date,
  ) => {
    const actualEnd = end ?? new Date(start.getTime() + 60 * 60 * 1000) // デフォルト 1h
    lines.push('BEGIN:VEVENT')
    lines.push(fold(`UID:${uid}@encorecue.jp`))
    lines.push(`DTSTAMP:${fmtIcsDate(updatedAt)}`)
    lines.push(`DTSTART:${fmtIcsDate(start)}`)
    lines.push(`DTEND:${fmtIcsDate(actualEnd)}`)
    lines.push(fold(`SUMMARY:${escapeIcs(title)}`))
    if (description) lines.push(fold(`DESCRIPTION:${escapeIcs(description)}`))
    if (location) lines.push(fold(`LOCATION:${escapeIcs(location)}`))
    lines.push(fold(`URL:${url}`))
    lines.push('END:VEVENT')
  }

  for (const e of organized) {
    addEvent(
      `event-${e.id}`,
      `[主催] ${e.title}`,
      e.description,
      e.startAt,
      e.endAt,
      e.venueName ?? e.venueAddress ?? null,
      `${appUrl}/events/${e.id}`,
      e.updatedAt,
    )
  }
  for (const p of participating) {
    addEvent(
      `event-p-${p.event.id}`,
      p.event.title,
      p.event.description,
      p.event.startAt,
      p.event.endAt,
      p.event.venueName ?? p.event.venueAddress ?? null,
      `${appUrl}/events/${p.event.id}`,
      p.event.updatedAt,
    )
  }
  for (const m of matches) {
    if (!m.project || !m.project.scheduledStartAt) continue
    addEvent(
      `match-${m.id}`,
      `[案件] ${m.project.title}`,
      m.project.description,
      m.project.scheduledStartAt,
      m.project.scheduledEndAt,
      null,
      `${appUrl}/dashboard/matches`,
      m.project.updatedAt,
    )
  }

  lines.push('END:VCALENDAR')

  const body = lines.join('\r\n') + '\r\n'

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
