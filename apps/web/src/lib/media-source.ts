// Portfolio.fileKey に格納された値が
// - Uploadthing のファイルキー
// - Vercel Blob などの直接 URL
// - YouTube / Vimeo / Twitter(X) などの埋め込み可能な URL
// のどれであるかを判定し、表示に必要な情報を返す。

export type MediaSource =
  | { kind: 'file'; url: string }
  | { kind: 'youtube'; embedUrl: string; thumbnailUrl: string; watchUrl: string }
  | { kind: 'vimeo'; embedUrl: string; watchUrl: string }
  | { kind: 'twitter'; watchUrl: string }
  | { kind: 'other'; watchUrl: string }

function extractYouTubeId(url: string): string | null {
  // https://www.youtube.com/watch?v=XXXX / https://youtu.be/XXXX / https://www.youtube.com/shorts/XXXX
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  return m?.[1] ?? null
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return m?.[1] ?? null
}

export function resolveMediaSource(fileKey: string): MediaSource {
  if (!fileKey.startsWith('http')) {
    return { kind: 'file', url: `https://utfs.io/f/${fileKey}` }
  }

  const youtubeId = extractYouTubeId(fileKey)
  if (youtubeId) {
    return {
      kind: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&playsinline=1&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      watchUrl: fileKey,
    }
  }

  const vimeoId = extractVimeoId(fileKey)
  if (vimeoId) {
    return {
      kind: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=1&loop=1&background=1`,
      watchUrl: fileKey,
    }
  }

  if (/(?:twitter\.com|x\.com)\//.test(fileKey)) {
    return { kind: 'twitter', watchUrl: fileKey }
  }

  // Vercel Blob / その他のホストされた直リンク
  return { kind: 'file', url: fileKey }
}

// ポートフォリオ配列から「カードのメイン枠で見せる1件」を選ぶ。
// 動画系を優先し、なければ画像、それも無ければ null。
type PortfolioLike = { id: string; mediaType: string; title: string; fileKey: string }

export function pickLeadPortfolio<T extends PortfolioLike>(
  portfolios: T[],
  coverUrl: string | null,
): { lead: T | null; coverUrl: string | null } {
  const video = portfolios.find((p) => p.mediaType === 'VIDEO')
  if (video) return { lead: video, coverUrl }
  // cover があるならそれを最優先で見せる（lead=null＋coverUrlで描画）
  if (coverUrl) return { lead: null, coverUrl }
  const image = portfolios.find((p) => p.mediaType === 'IMAGE')
  return { lead: image ?? null, coverUrl: null }
}
