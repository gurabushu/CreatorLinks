import type { PlanType, SubStatus } from './enums'

// =============================================
// Subscription エンティティ型
// =============================================

export interface Subscription {
  id: string
  subscriberId: string
  targetId: string
  stripeSubscriptionId: string
  plan: PlanType
  status: SubStatus
  createdAt: Date
}
