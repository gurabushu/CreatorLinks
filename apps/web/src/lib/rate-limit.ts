import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type Bucket = 'auth' | 'webhook' | 'message' | 'promo' | 'invite'

const BUCKETS: Record<Bucket, { limit: number; window: `${number} s` }> = {
  auth: { limit: 10, window: '60 s' },
  webhook: { limit: 60, window: '60 s' },
  message: { limit: 30, window: '60 s' },
  promo: { limit: 5, window: '60 s' }, // プロモコードのブルートフォース抑止
  invite: { limit: 5, window: '3600 s' }, // 招待メール送信呼び出し (1 回最大 10 件 = 1h 最大 50 件/ユーザー)
}

let cachedRedis: Redis | null = null
const cachedLimiters = new Map<Bucket, Ratelimit>()

const isProd = process.env.NODE_ENV === 'production'

function getRedis(): Redis | null {
  if (cachedRedis) return cachedRedis
  // Vercel Marketplace の Upstash Redis 統合が投入する env は KV_REST_API_URL / KV_REST_API_TOKEN。
  // 素の Upstash Console 経由で設定する場合は UPSTASH_REDIS_REST_URL / TOKEN を使うので両対応。
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    // 本番で Upstash 未設定はレート制限完全無効化を意味するので fail-closed にする。
    // これがないと signin / password reset / promo / invite / message が丸腰。
    if (isProd) {
      throw new Error(
        '[rate-limit] KV_REST_API_URL / TOKEN (or UPSTASH_REDIS_REST_URL / TOKEN) が未設定です。' +
          '本番では必ず設定してください（fail-closed）。',
      )
    }
    return null
  }
  cachedRedis = new Redis({ url, token })
  return cachedRedis
}

function getLimiter(bucket: Bucket): Ratelimit | null {
  const cached = cachedLimiters.get(bucket)
  if (cached) return cached
  const redis = getRedis()
  if (!redis) return null
  const { limit, window } = BUCKETS[bucket]
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: false,
    prefix: `cl:rl:${bucket}`,
  })
  cachedLimiters.set(bucket, limiter)
  return limiter
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number }

export async function checkRateLimit(
  bucket: Bucket,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(bucket)
  // dev / test で Upstash 未設定はスキップ（getRedis が prod なら throw 済み）
  if (!limiter) return { ok: true }
  const { success, reset } = await limiter.limit(identifier)
  if (success) return { ok: true }
  return { ok: false, retryAfterSec: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) }
}

export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}
