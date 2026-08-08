// =============================================
// 共通 Enum 定義（Prisma enum と一致させること）
// =============================================

export type UserRole = 'GENERAL' | 'PRO' | 'ADMIN'

export type MediaType = 'IMAGE' | 'AUDIO' | 'VIDEO'

export type ContractType = 'SPOT' | 'SUBSCRIPTION'

export type ProjectStatus = 'OPEN' | 'MATCHING' | 'CLOSED'

export type CommitmentLevel = 'HOBBY' | 'SEMI_PRO' | 'PRO'

export const COMMITMENT_LEVELS: readonly CommitmentLevel[] = ['HOBBY', 'SEMI_PRO', 'PRO'] as const

export const COMMITMENT_LEVEL_LABELS: Record<CommitmentLevel, { label: string; description: string }> = {
  HOBBY: { label: '趣味', description: '楽しさ重視・報酬や納期はゆるめ' },
  SEMI_PRO: { label: '副業', description: 'しっかりやる副業レベル・本業ではない' },
  PRO: { label: 'プロ', description: 'プロ品質・納期と報酬をきっちり' },
}

export type MatchStatus = 'APPLIED' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED'

// 性別。UI 表示は「未回答」= null で扱う
export type Gender = 'MALE' | 'FEMALE' | 'NOT_SPECIFIED'

export const GENDERS: readonly Gender[] = ['MALE', 'FEMALE', 'NOT_SPECIFIED'] as const

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: '男性',
  FEMALE: '女性',
  NOT_SPECIFIED: '回答しない',
}

// 身長段階（フィルタ用）。null/未回答は含めない
export type HeightBucket = 'UNDER_150' | 'H150_160' | 'H160_170' | 'H170_180' | 'OVER_180'

export const HEIGHT_BUCKETS: readonly HeightBucket[] = [
  'UNDER_150',
  'H150_160',
  'H160_170',
  'H170_180',
  'OVER_180',
] as const

export const HEIGHT_BUCKET_LABELS: Record<HeightBucket, string> = {
  UNDER_150: '〜150cm',
  H150_160: '150–160cm',
  H160_170: '160–170cm',
  H170_180: '170–180cm',
  OVER_180: '180cm〜',
}

// 身長段階 → 半開区間 [min, max)（cm）。max = null は上限なし
export const HEIGHT_BUCKET_RANGES: Record<HeightBucket, { minCm: number | null; maxCm: number | null }> = {
  UNDER_150: { minCm: null, maxCm: 150 },
  H150_160: { minCm: 150, maxCm: 160 },
  H160_170: { minCm: 160, maxCm: 170 },
  H170_180: { minCm: 170, maxCm: 180 },
  OVER_180: { minCm: 180, maxCm: null },
}

// 標準楽器プリセット。ユーザーは自由タグも追加可能
export const INSTRUMENT_PRESETS: readonly string[] = [
  'ギター',
  'ベース',
  'ドラム',
  'ピアノ',
  'キーボード',
  'サックス',
  'トランペット',
  'バイオリン',
  'ボーカル',
  'DJ',
  'DTM',
] as const
