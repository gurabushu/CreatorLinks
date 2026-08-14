// Sentry 送信前の PII scrubber。
// 個人情報監査で HIGH と判定された「token クエリ流出 / request.data 経由の email 流入」を封じる。
//
// 想定される PII 流入経路：
// - password reset / email-change リンク: ?token=<plain>
// - server action の form input (email, name, password, message body)
// - request headers: authorization, cookie
// - user context: email, name

import type { ErrorEvent, EventHint } from '@sentry/nextjs'

const SENSITIVE_QUERY_KEYS = ['token', 'code', 'secret', 'reset', 'ticket']
const SENSITIVE_HEADER_KEYS = ['authorization', 'cookie', 'x-api-key', 'stripe-signature']

// URL から機密クエリを除去
function scrubUrl(url: string): string {
  try {
    const u = new URL(url, 'http://x') // 相対 URL 対応
    for (const key of SENSITIVE_QUERY_KEYS) {
      if (u.searchParams.has(key)) u.searchParams.set(key, '[Filtered]')
    }
    // 相対だった場合は先頭の 'http://x' を落とす
    return url.startsWith('http') ? u.toString() : u.pathname + u.search + u.hash
  } catch {
    return url
  }
}

function scrubHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) return headers
  const cleaned: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    cleaned[k] = SENSITIVE_HEADER_KEYS.includes(k.toLowerCase()) ? '[Filtered]' : v
  }
  return cleaned
}

export function beforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  // request.url のクエリを scrub
  if (event.request?.url) {
    event.request.url = scrubUrl(event.request.url)
  }
  if (event.request?.headers) {
    event.request.headers = scrubHeaders(event.request.headers as Record<string, string>)
  }
  // request.data は Server Action の form input を含むので丸ごと落とす
  // （error message 内の PII は個別に手当てするしかない）
  if (event.request?.data) {
    event.request.data = '[Filtered]'
  }
  // breadcrumb 内の URL も scrub
  if (event.breadcrumbs) {
    for (const b of event.breadcrumbs) {
      if (b.data && typeof b.data === 'object' && 'url' in b.data && typeof b.data.url === 'string') {
        b.data.url = scrubUrl(b.data.url)
      }
    }
  }
  return event
}
