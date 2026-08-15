import { z } from 'zod'
import { isSupportedVideoUrl } from '../lib/video-embed'

// =============================================
// Event Zod スキーマ
// =============================================

export const EventTypeSchema = z.enum([
  'LIVE',
  'SESSION',
  'RECORDING',
  'WORKSHOP',
  'MEETUP',
  'REHEARSAL',
  'MEETING',
  'TODO',
  'OTHER',
])
export const EventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'])
export const EventVisibilitySchema = z.enum(['PRIVATE', 'PARTICIPANTS_ONLY', 'FOLLOWERS', 'PUBLIC'])
export const EventParticipantRoleSchema = z.enum(['ORGANIZER', 'PERFORMER', 'STAFF', 'GUEST', 'AUDIENCE'])
export const EventParticipantStatusSchema = z.enum(['INVITED', 'CONFIRMED', 'DECLINED', 'CANCELLED'])
export const EventOpenRoleStatusSchema = z.enum(['OPEN', 'FILLED', 'CLOSED'])
export const EventMediaTypeSchema = z.enum(['IMAGE', 'VIDEO'])

// --- イベント添付メディア ---
// IMAGE: Vercel Blob の公開 URL / VIDEO: YouTube・Vimeo の視聴 URL
// 型ごとに別バリデーション: IMAGE は http(s) URL、VIDEO は parseVideoEmbed が通る URL のみ
export const EventMediaInputSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('IMAGE'),
    url: z
      .string()
      .url('URL 形式で入力してください')
      .refine((u) => /^https?:\/\//i.test(u), 'http/https の URL を指定してください'),
    caption: z.string().max(100, 'キャプションは100文字以内').optional(),
    position: z.number().int().min(0).max(100).default(0),
  }),
  z.object({
    type: z.literal('VIDEO'),
    url: z
      .string()
      .url('URL 形式で入力してください')
      .refine(isSupportedVideoUrl, 'YouTube または Vimeo の URL を指定してください'),
    caption: z.string().max(100, 'キャプションは100文字以内').optional(),
    position: z.number().int().min(0).max(100).default(0),
  }),
])
export type EventMediaInput = z.infer<typeof EventMediaInputSchema>

// メディア配列の上限（画像 5 + 動画 3）。他所で再利用したいので export しておく。
export const MEDIA_MAX_IMAGES = 5
export const MEDIA_MAX_VIDEOS = 3

const mediaArraySchema = z
  .array(EventMediaInputSchema)
  .max(MEDIA_MAX_IMAGES + MEDIA_MAX_VIDEOS, '添付は最大 8 件までです')
  .refine(
    (arr) => arr.filter((m) => m.type === 'IMAGE').length <= MEDIA_MAX_IMAGES,
    { message: `画像は最大 ${MEDIA_MAX_IMAGES} 枚までです` },
  )
  .refine(
    (arr) => arr.filter((m) => m.type === 'VIDEO').length <= MEDIA_MAX_VIDEOS,
    { message: `動画は最大 ${MEDIA_MAX_VIDEOS} 本までです` },
  )
  .default([])

// --- Event 本体 ---

// javascript: / data: 等のスキームで <a href> XSS を作られないよう、URL は http/https 限定にする。
const httpUrl = z
  .string()
  .url('URL 形式で入力してください')
  .refine((u) => /^https?:\/\//i.test(u), 'http/https の URL を指定してください')

const EventShape = z.object({
  title: z.string().min(1, 'タイトルは1文字以上').max(200, 'タイトルは200文字以内'),
  description: z.string().max(5000, '説明は5000文字以内').optional(),
  type: EventTypeSchema.default('LIVE'),
  visibility: EventVisibilitySchema.default('PRIVATE'), // Phase A.5: デフォルトは非公開
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  isAllDay: z.boolean().default(false),
  hasSpecificDate: z.boolean().default(true),
  venueName: z.string().max(100).optional(),
  venueAddress: z.string().max(200).optional(),
  venueUrl: httpUrl.optional().or(z.literal('')),
  genres: z.array(z.string().max(50)).max(20, 'ジャンルは20個以内').default([]),
  city: z.string().max(50).optional(),
  isOnline: z.boolean().default(false),
  ticketUrl: httpUrl.optional().or(z.literal('')),
  ticketPriceYen: z.number().int().nonnegative().max(10_000_000).optional(),
  isFree: z.boolean().default(false),
  // coverUrl は list card / OG メタ用の派生列（先頭 IMAGE.url を server action が自動同期）。
  // API 直叩きの後方互換のため受け取り自体は続けるが、通常は media 配列経由で更新される。
  coverUrl: httpUrl.optional().or(z.literal('')),
  media: mediaArraySchema,
})

// endAt が指定されているなら startAt より後であること。Update では両方揃った時のみ検証。
const endAfterStart = (v: {
  startAt?: Date | undefined
  endAt?: Date | undefined
}) => !v.endAt || !v.startAt || v.endAt > v.startAt

export const CreateEventSchema = EventShape.refine(endAfterStart, {
  message: '終了は開始より後の日時にしてください',
  path: ['endAt'],
})
export type CreateEventInput = z.infer<typeof CreateEventSchema>

export const UpdateEventSchema = EventShape.partial().refine(endAfterStart, {
  message: '終了は開始より後の日時にしてください',
  path: ['endAt'],
})
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>

export const EventFilterSchema = z.object({
  status: EventStatusSchema.default('PUBLISHED'),
  type: EventTypeSchema.optional(),
  genres: z.array(z.string()).optional(),
  city: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  hasOpenRoles: z.boolean().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
})
export type EventFilterInput = z.infer<typeof EventFilterSchema>

// --- 参加者 ---

export const InviteParticipantSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  role: EventParticipantRoleSchema,
  note: z.string().max(500).optional(),
})
export type InviteParticipantInput = z.infer<typeof InviteParticipantSchema>

export const RespondToInviteSchema = z.object({
  participantId: z.string(),
  response: z.enum(['CONFIRMED', 'DECLINED']),
})
export type RespondToInviteInput = z.infer<typeof RespondToInviteSchema>

// --- 公募枠 ---

export const CreateOpenRoleSchema = z.object({
  eventId: z.string(),
  roleType: EventParticipantRoleSchema,
  title: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  requiredCount: z.number().int().positive().default(1),
  compensation: z.number().int().nonnegative().optional(),
  isPaid: z.boolean().default(true),
})
export type CreateOpenRoleInput = z.infer<typeof CreateOpenRoleSchema>

export const UpdateOpenRoleSchema = CreateOpenRoleSchema.omit({ eventId: true }).partial().extend({
  id: z.string(),
})
export type UpdateOpenRoleInput = z.infer<typeof UpdateOpenRoleSchema>

export const ApplyToOpenRoleSchema = z.object({
  openRoleId: z.string(),
  message: z.string().max(2000).optional(),
})
export type ApplyToOpenRoleInput = z.infer<typeof ApplyToOpenRoleSchema>

// --- カレンダー ---

export const CalendarRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
})
export type CalendarRangeInput = z.infer<typeof CalendarRangeSchema>

export const PublicCalendarFilterSchema = CalendarRangeSchema.extend({
  genres: z.array(z.string()).optional(),
  city: z.string().optional(),
  type: EventTypeSchema.optional(),
})
export type PublicCalendarFilterInput = z.infer<typeof PublicCalendarFilterSchema>
