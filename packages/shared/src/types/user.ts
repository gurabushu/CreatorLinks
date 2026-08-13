import type { CommitmentLevel, Gender, UserRole } from './enums'
import type { Portfolio } from './portfolio'

// =============================================
// User エンティティ型
// =============================================

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  genres: string[]
  bio: string | null
  avatarUrl: string | null
  averageRating: number
  gender: Gender | null
  heightCm: number | null
  activityYears: number | null
  skillLevel: CommitmentLevel | null
  instruments: string[]
  createdAt: Date
  updatedAt: Date
}

export interface UserWithPortfolios extends User {
  portfolios: Portfolio[]
}

export interface UserPublicProfile {
  id: string
  name: string
  role: UserRole
  genres: string[]
  bio: string | null
  avatarUrl: string | null
  averageRating: number
  portfolios: Portfolio[]
}
