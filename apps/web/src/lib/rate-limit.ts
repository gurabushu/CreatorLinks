import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type Bucket = 'auth' | 'webhook' | 'message'

const BUCKETS: Record<Bucket, { limit: number; window: `${number} s` }> = {
  auth: { limit: 10, window: '60 s' },
  webhook: { limit: 60, window: '60 s' },
  message: { limit: 30, window: '60 s' },
}

let cachedRedis: Redis | null = null
const cachedLimiters = new Map<Bucket, Ratelimit>()

function getRedis(): Redis | null {
  if (cachedRedis) return cachedRedis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
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
  if (!limiter) return { ok: true } // Upstash 未設定時はスキップ（dev 用）
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
