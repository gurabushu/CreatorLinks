// =============================================
// APIレスポンス共通型
// =============================================

export interface PaginatedResponse<T> {
  items: T[]
  nextCursor: string | null
  total: number
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}

export interface ApiSuccess<T = void> {
  data: T
  message?: string
}
