// Portfolio.fileKey に格納された値が
// - Vercel Blob などの直接 URL（新規はこれ）
// - 旧 Uploadthing のファイルキー（legacy、utfs.io にフォールバック）
// - YouTube / Vimeo / Spotify / SoundCloud / Bandcamp / TikTok / Twitter(X) などの
//   埋め込み可能・不可能 な URL
// のどれであるかを判定し、表示に必要な情報を返す。

export type MediaSource =
  | { kind: 'file'; url: string }
  | { kind: 'youtube'; videoId: string; embedUrl: string; thumbnailUrl: string; watchUrl: string }
  | { kind: 'vimeo'; videoId: string; embedUrl: string; watchUrl: string }
  | { kind: 'spotify'; embedUrl: string; watchUrl: string }
  | { kind: 'soundcloud'; embedUrl: string; watchUrl: string }
  | { kind: 'bandcamp'; watchUrl: string } // Bandcamp embed は album/track ID が必要で URL 単体からは特定不可 → リンクのみ
  | { kind: 'tiktok'; videoId: string; embedUrl: string; watchUrl: string }
  | { kind: 'instagram'; watchUrl: string } // Meta oEmbed が承認 gate なのでリンクのみ
  | { kind: 'twitter'; watchUrl: string }
  | { kind: 'other'; watchUrl: string }

export function buildYouTubeEmbed(videoId: string, opts?: { muted?: boolean }): string {
  const muted = opts?.muted ?? true
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${videoId}&controls=0&modestbranding=1&playsinline=1&rel=0`
}

export function buildVimeoEmbed(videoId: string, opts?: { muted?: boolean }): string {
  const muted = opts?.muted ?? true
  // background=1 は強制 muted。音を出したい時は通常プレイヤー設定にする
  return muted
    ? `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&background=1`
    : `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=0&loop=1&controls=0&title=0&byline=0&portrait=0`
}

// Spotify embed URL の組み立て。
// 対象 URL の path をそのまま /embed/ 配下に差し替える (artist/track/album/playlist/episode/show 全てで動く)
// 例: https://open.spotify.com/track/XXX → https://open.spotify.com/embed/track/XXX
export function buildSpotifyEmbed(watchUrl: string): string | null {
  try {
    const u = new URL(watchUrl)
    if (!/(^|\.)spotify\.com$/.test(u.hostname)) return null
    // /track/XXX, /artist/XXX, /playlist/XXX, /album/XXX, /episode/XXX, /show/XXX
    const m = u.pathname.match(/^\/(track|artist|album|playlist|episode|show)\/([A-Za-z0-9]+)/)
    if (!m) return null
    return `https://open.spotify.com/embed/${m[1]}/${m[2]}`
  } catch {
    return null
  }
}

// SoundCloud oEmbed の代替: 公式 widget iframe を直組み。
// watchUrl をエンコードして /player URL に渡す。
export function buildSoundCloudEmbed(watchUrl: string): string {
  const encoded = encodeURIComponent(watchUrl)
  return `https://w.soundcloud.com/player/?url=${encoded}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`
}

// TikTok の embed URL。
// 例: https://www.tiktok.com/@user/video/1234567890 → https://www.tiktok.com/embed/v2/1234567890
function extractTikTokVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (!/(^|\.)tiktok\.com$/.test(u.hostname)) return null
    const m = u.pathname.match(/\/video\/(\d+)/)
    return m?.[1] ?? null
  } catch {
    return null
  }
}
export function buildTikTokEmbed(videoId: string): string {
  return `https://www.tiktok.com/embed/v2/${videoId}`
}

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
      videoId: youtubeId,
      embedUrl: buildYouTubeEmbed(youtubeId, { muted: true }),
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      watchUrl: fileKey,
    }
  }

  const vimeoId = extractVimeoId(fileKey)
  if (vimeoId) {
    return {
      kind: 'vimeo',
      videoId: vimeoId,
      embedUrl: buildVimeoEmbed(vimeoId, { muted: true }),
      watchUrl: fileKey,
    }
  }

  // Spotify (アーティスト / トラック / プレイリスト / アルバム / episode / show)
  const spotifyEmbed = buildSpotifyEmbed(fileKey)
  if (spotifyEmbed) {
    return { kind: 'spotify', embedUrl: spotifyEmbed, watchUrl: fileKey }
  }

  // SoundCloud (track / playlist / user)
  if (/(?:^|\.)soundcloud\.com\//.test(fileKey)) {
    return {
      kind: 'soundcloud',
      embedUrl: buildSoundCloudEmbed(fileKey),
      watchUrl: fileKey,
    }
  }

  // Bandcamp: track/album ID の抽出が meta tag 経由必須で URL 単体からは特定できない
  // → 埋め込み諦めてリンクのみ (favicon + label)
  if (/(?:^|\.)bandcamp\.com\//.test(fileKey)) {
    return { kind: 'bandcamp', watchUrl: fileKey }
  }

  // TikTok (video)
  const tiktokId = extractTikTokVideoId(fileKey)
  if (tiktokId) {
    return {
      kind: 'tiktok',
      videoId: tiktokId,
      embedUrl: buildTikTokEmbed(tiktokId),
      watchUrl: fileKey,
    }
  }

  // Instagram: 2021 以降 oEmbed が Meta 承認必須 → リンクのみ
  if (/(?:^|\.)instagram\.com\//.test(fileKey)) {
    return { kind: 'instagram', watchUrl: fileKey }
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
  featuredPortfolioId?: string | null,
): { lead: T | null; coverUrl: string | null } {
  // アーティスト本人が指定した「メイン作品」を最優先
  if (featuredPortfolioId) {
    const featured = portfolios.find((p) => p.id === featuredPortfolioId)
    if (featured) return { lead: featured, coverUrl }
  }
  const video = portfolios.find((p) => p.mediaType === 'VIDEO')
  if (video) return { lead: video, coverUrl }
  // cover があるならそれを最優先で見せる（lead=null＋coverUrlで描画）
  if (coverUrl) return { lead: null, coverUrl }
  const image = portfolios.find((p) => p.mediaType === 'IMAGE')
  return { lead: image ?? null, coverUrl: null }
}
