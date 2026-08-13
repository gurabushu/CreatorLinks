// サーバーの Node runtime は Vercel 上で UTC 動作のため、日本時間で年月日/時刻を扱う共通ヘルパー。
// 直接 Date#getHours() / getDate() 等を使うと日本のユーザーに UTC 表示が漏れて 1 日ズレる。
// カレンダーの日付キー・時刻表示は必ずこのモジュール経由に統一する。

const JST_TZ = 'Asia/Tokyo'

const dtf = new Intl.DateTimeFormat('en-CA', {
  timeZone: JST_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  weekday: 'short',
})

export type JstParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number // 0=Sun..6=Sat
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

export function jstParts(d: Date): JstParts {
  const parts = dtf.formatToParts(d)
  const map: Record<string, string> = {}
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  // Node 実装によっては 00:00 が "24" で返る quirk があるので正規化。
  const hour = map.hour === '24' ? 0 : Number(map.hour)
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    weekday: WEEKDAY_MAP[map.weekday] ?? 0,
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

// "YYYY-MM-DD" を JST 基準で返す。カレンダーの日付キーに使う。
export function jstDateKey(d: Date): string {
  const p = jstParts(d)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

// "YYYY/MM/DD HH:mm" (JST)
export function jstDatetime(d: Date): string {
  const p = jstParts(d)
  return `${p.year}/${pad(p.month)}/${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`
}

// "HH:mm" (JST)
export function jstTime(d: Date): string {
  const p = jstParts(d)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

// "YYYY-MM-DDTHH:mm" (JST) — <input type="datetime-local"> の value に使う
export function jstDatetimeLocal(d: Date): string {
  const p = jstParts(d)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

// カレンダー現在月の {year, month}（JST 基準）
export function jstCurrentMonth(now: Date = new Date()): { year: number; month: number } {
  const p = jstParts(now)
  return { year: p.year, month: p.month }
}
