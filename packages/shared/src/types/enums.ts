// =============================================
// 共通 Enum 定義（Prisma enum と一致させること）
// =============================================

export type UserRole = 'GENERAL' | 'PRO' | 'ADMIN'

export type MediaType = 'IMAGE' | 'AUDIO' | 'VIDEO'

export type ContractType = 'SPOT' | 'SUBSCRIPTION'

export type ProjectStatus = 'OPEN' | 'MATCHING' | 'CLOSED'

export type MatchStatus = 'APPLIED' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED'
