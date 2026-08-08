// =============================================
// Event 関連の型定義（Prisma enum と一致させること）
// =============================================

export type EventType = 'LIVE' | 'SESSION' | 'RECORDING' | 'WORKSHOP' | 'MEETUP' | 'OTHER'

export const EVENT_TYPES: readonly EventType[] = [
  'LIVE',
  'SESSION',
  'RECORDING',
  'WORKSHOP',
  'MEETUP',
  'OTHER',
] as const

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  LIVE: 'ライブ',
  SESSION: 'セッション',
  RECORDING: 'レコーディング',
  WORKSHOP: 'ワークショップ',
  MEETUP: '交流会',
  OTHER: 'その他',
}

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED'

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: '下書き',
  PUBLISHED: '公開中',
  CANCELLED: '中止',
  COMPLETED: '終了',
}

export type EventParticipantRole = 'ORGANIZER' | 'PERFORMER' | 'STAFF' | 'GUEST' | 'AUDIENCE'

export const EVENT_PARTICIPANT_ROLES: readonly EventParticipantRole[] = [
  'ORGANIZER',
  'PERFORMER',
  'STAFF',
  'GUEST',
  'AUDIENCE',
] as const

export const EVENT_PARTICIPANT_ROLE_LABELS: Record<EventParticipantRole, string> = {
  ORGANIZER: '主催',
  PERFORMER: '出演',
  STAFF: 'スタッフ',
  GUEST: 'ゲスト',
  AUDIENCE: '来場',
}

export type EventParticipantStatus = 'INVITED' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED'

export const EVENT_PARTICIPANT_STATUS_LABELS: Record<EventParticipantStatus, string> = {
  INVITED: '招待中',
  CONFIRMED: '確定',
  DECLINED: '辞退',
  CANCELLED: 'キャンセル',
}

export type EventOpenRoleStatus = 'OPEN' | 'FILLED' | 'CLOSED'

export const EVENT_OPEN_ROLE_STATUS_LABELS: Record<EventOpenRoleStatus, string> = {
  OPEN: '募集中',
  FILLED: '締切（定員到達）',
  CLOSED: '締切',
}
