import type { MediaType } from './enums'

// =============================================
// Portfolio エンティティ型
// =============================================

export interface Portfolio {
  id: string
  userId: string
  title: string
  description: string | null
  mediaType: MediaType
  fileKey: string
  createdAt: Date
}
