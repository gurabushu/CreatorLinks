import { z } from 'zod'

// =============================================
// Event Zod スキーマ
// =============================================

export const EventTypeSchema = z.enum(['LIVE', 'SESSION', 'RECORDING', 'WORKSHOP', 'MEETUP', 'OTHER'])
export const EventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'])
export const EventParticipantRoleSchema = z.enum(['ORGANIZER', 'PERFORMER', 'STAFF', 'GUEST', 'AUDIENCE'])
export const EventParticipantStatusSchema = z.enum(['INVITED', 'CONFIRMED', 'DECLINED', 'CANCELLED'])
export const EventOpenRoleStatusSchema = z.enum(['OPEN', 'FILLED', 'CLOSED'])

// --- Event 本体 ---

export const CreateEventSchema = z.object({
  title: z.string().min(1, 'タイトルは1文字以上').max(200, 'タイトルは200文字以内'),
  description: z.string().max(5000, '説明は5000文字以内').optional(),
  type: EventTypeSchema.default('LIVE'),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  venueName: z.string().max(100).optional(),
  venueAddress: z.string().max(200).optional(),
  venueUrl: z.string().url('URL 形式で入力してください').optional().or(z.literal('')),
  genres: z.array(z.string()).max(20, 'ジャンルは20個以内').default([]),
  city: z.string().max(50).optional(),
  isOnline: z.boolean().default(false),
  ticketUrl: z.string().url('URL 形式で入力してください').optional().or(z.literal('')),
  ticketPriceYen: z.number().int().nonnegative().optional(),
  isFree: z.boolean().default(false),
  coverUrl: z.string().optional(),
})
export type CreateEventInput = z.infer<typeof CreateEventSchema>

export const UpdateEventSchema = CreateEventSchema.partial()
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
