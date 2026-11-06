// カレンダー ICS フィード用の短いトークン生成・検証。
// - userId を直接 URL に出さない (SNS 等への露出リスク回避)
// - CALENDAR_FEED_SECRET を知らない限りトークンから userId を逆引きできない
// - SECRET を回せば既存トークン全てが無効化 (revoke)
//
// 使い方:
//   const token = await userIdToCalendarToken(userId)
//   const userId = await calendarTokenToUserId(token)
//
// 実装: userId を HMAC-SHA256 で正規化トークン化し、prefix 16 文字 + userId suffix を結合。
// 復号時は suffix から userId を取り出し、prefix を HMAC で再計算して一致確認 (改ざん検知)。

import { createHmac } from 'crypto'

const SECRET = process.env.CALENDAR_FEED_SECRET ?? 'dev-insecure-change-me'

export async function userIdToCalendarToken(userId: string): Promise<string> {
  const mac = createHmac('sha256', SECRET).update(userId).digest('hex').slice(0, 16)
  // token = <16 hex><base64url(userId)>
  const encoded = Buffer.from(userId).toString('base64url')
  return `${mac}${encoded}`
}

export async function calendarTokenToUserId(token: string): Promise<string | null> {
  if (token.length < 17) return null
  const mac = token.slice(0, 16)
  const encoded = token.slice(16)
  try {
    const userId = Buffer.from(encoded, 'base64url').toString('utf-8')
    const expected = createHmac('sha256', SECRET).update(userId).digest('hex').slice(0, 16)
    if (mac !== expected) return null
    return userId
  } catch {
    return null
  }
}
