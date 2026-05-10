import type { ContractType, ProjectStatus } from './enums'
import type { Match } from './match'

// =============================================
// Project エンティティ型
// =============================================

export interface Project {
  id: string
  clientId: string
  title: string
  description: string | null
  genres: string[]
  budget: number | null
  contractType: ContractType
  status: ProjectStatus
  createdAt: Date
}

export interface ProjectWithMatches extends Project {
  matches: Match[]
}

export interface ProjectWithClient extends Project {
  client: {
    id: string
    name: string
    avatarUrl: string | null
    averageRating: number
  }
}
