// =============================================
// Event 関連の型定義（Prisma enum と一致させること）
// =============================================

export type EventType =
  | 'LIVE'
  | 'SESSION'
  | 'RECORDING'
  | 'WORKSHOP'
  | 'MEETUP'
  | 'REHEARSAL'
  | 'MEETING'
  | 'TODO'
  | 'OTHER'

export const EVENT_TYPES: readonly EventType[] = [
  'LIVE',
  'SESSION',
  'RECORDING',
  'WORKSHOP',
  'MEETUP',
  'REHEARSAL',
  'MEETING',
  'TODO',
  'OTHER',
] as const

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  LIVE: 'ライブ',
  SESSION: 'セッション',
  RECORDING: 'レコーディング',
  WORKSHOP: 'ワークショップ',
  MEETUP: '交流会',
  REHEARSAL: 'リハーサル',
  MEETING: '打ち合わせ',
  TODO: 'タスク',
  OTHER: 'その他',
}

// Phase A.5: 可視性（status と直交する軸）
export type EventVisibility = 'PRIVATE' | 'PARTICIPANTS_ONLY' | 'FOLLOWERS' | 'PUBLIC'

export const EVENT_VISIBILITIES: readonly EventVisibility[] = [
  'PRIVATE',
  'PARTICIPANTS_ONLY',
  'FOLLOWERS',
  'PUBLIC',
] as const

export const EVENT_VISIBILITY_LABELS: Record<EventVisibility, string> = {
  PRIVATE: '非公開',
  PARTICIPANTS_ONLY: '参加者のみ',
  FOLLOWERS: 'フォロワー',
  PUBLIC: '一般公開',
}

export const EVENT_VISIBILITY_DESCRIPTIONS: Record<EventVisibility, string> = {
  PRIVATE: '本人だけが見られる（個人予定・タスク向け）',
  PARTICIPANTS_ONLY: '招待した共演者・スタッフだけに公開',
  FOLLOWERS: 'フォロワーと参加者に公開（限定告知）',
  PUBLIC: '誰でも閲覧可能（一般告知）',
}

// UI 用のアイコン絵文字（軽量表示）
export const EVENT_VISIBILITY_ICONS: Record<EventVisibility, string> = {
  PRIVATE: '🔒',
  PARTICIPANTS_ONLY: '👥',
  FOLLOWERS: '⭐',
  PUBLIC: '🌐',
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
