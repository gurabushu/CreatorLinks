import type { MatchStatus } from './enums'
import type { Project } from './project'
import type { User } from './user'

// =============================================
// Match エンティティ型
// =============================================

export interface Match {
  id: string
  projectId: string
  artistId: string
  status: MatchStatus
  message: string | null
  createdAt: Date
}

export interface MatchWithDetails extends Match {
  project: Project
  artist: Pick<User, 'id' | 'name' | 'avatarUrl' | 'averageRating' | 'genres'>
}

// =============================================
// Message エンティティ型
// =============================================

export interface Message {
  id: string
  matchId: string
  senderId: string
  body: string
  readAt: Date | null
  createdAt: Date
}

// =============================================
// Review エンティティ型
// =============================================

export interface Review {
  id: string
  matchId: string
  reviewerId: string
  score: number // 1〜5
  comment: string | null
  createdAt: Date
}
