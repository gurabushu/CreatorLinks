// YouTube / Vimeo の視聴 URL を判定・埋め込み URL に変換するヘルパー。
// フォーム側 (バリデーション + プレビュー) と詳細ページ (iframe src) の両方で使う。
// 対応:
//   YouTube: https://www.youtube.com/watch?v=<id> / https://youtu.be/<id> / https://www.youtube.com/shorts/<id>
//   Vimeo:   https://vimeo.com/<id> / https://player.vimeo.com/video/<id>
// 対応外 URL は null を返す（VIDEO 種別のバリデーション失敗と、詳細ページの非表示に使う）。

export type VideoEmbed = {
  provider: 'youtube' | 'vimeo'
  id: string
  embedUrl: string
}

export function parseVideoEmbed(rawUrl: string): VideoEmbed | null {
  let u: URL
  try {
    u = new URL(rawUrl.trim())
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null

  const host = u.hostname.replace(/^www\./, '')

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    const v = u.searchParams.get('v')
    if (v && /^[\w-]{6,}$/.test(v)) {
      return { provider: 'youtube', id: v, embedUrl: `https://www.youtube.com/embed/${v}` }
    }
    // /shorts/<id> 対応
    const shortsMatch = u.pathname.match(/^\/shorts\/([\w-]{6,})/)
    if (shortsMatch) {
      const id = shortsMatch[1]
      return { provider: 'youtube', id, embedUrl: `https://www.youtube.com/embed/${id}` }
    }
    return null
  }

  if (host === 'youtu.be') {
    const id = u.pathname.replace(/^\//, '')
    if (/^[\w-]{6,}$/.test(id)) {
      return { provider: 'youtube', id, embedUrl: `https://www.youtube.com/embed/${id}` }
    }
    return null
  }

  if (host === 'vimeo.com') {
    // https://vimeo.com/123456789
    const match = u.pathname.match(/^\/(\d{6,})/)
    if (match) {
      const id = match[1]
      return { provider: 'vimeo', id, embedUrl: `https://player.vimeo.com/video/${id}` }
    }
    return null
  }

  if (host === 'player.vimeo.com') {
    const match = u.pathname.match(/^\/video\/(\d{6,})/)
    if (match) {
      const id = match[1]
      return { provider: 'vimeo', id, embedUrl: `https://player.vimeo.com/video/${id}` }
    }
    return null
  }

  return null
}

export function isSupportedVideoUrl(url: string): boolean {
  return parseVideoEmbed(url) !== null
}
