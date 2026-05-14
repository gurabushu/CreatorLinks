import { upload } from '@vercel/blob/client'
import type { PutBlobResult } from '@vercel/blob'

interface UploadOptions {
  onProgress?: (percentage: number) => void
  /** 進捗イベントがこの時間以上止まったら中止する（ms） */
  stallTimeoutMs?: number
}

const STALL_MESSAGE =
  'アップロードが進まないため中止しました。通信状況を確認してもう一度お試しください。'

// 小さい画像はサーバー経由で put() を呼ぶ：
// クライアント直 PUT が詰まる環境（firewall/proxy/拡張機能/3rdパーティ Cookie 拒否など）でも
// 同一オリジンの POST だけで完結するので確実
const SERVER_FALLBACK_MAX_SIZE = 4 * 1024 * 1024
const SERVER_FALLBACK_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

/**
 * 画像 (≤4MB) は Next.js サーバー経由でアップロードする。
 * それ以外（音声・動画など大きいファイル）は @vercel/blob/client の直接アップロードを使い、
 * stall 検知 + 1 回の自動リトライを掛ける。
 */
export async function uploadBlob(
  file: File,
  { onProgress, stallTimeoutMs = 30_000 }: UploadOptions = {},
): Promise<PutBlobResult> {
  if (SERVER_FALLBACK_TYPES.has(file.type) && file.size <= SERVER_FALLBACK_MAX_SIZE) {
    return uploadViaServer(file, onProgress)
  }

  const safeName = sanitizeFileName(file.name)
  const maxAttempts = 2
  let lastErr: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await attemptClientUpload(safeName, file, { onProgress, stallTimeoutMs })
    } catch (err) {
      lastErr = err
      const isStall = err instanceof Error && err.message === STALL_MESSAGE
      if (!isStall || attempt === maxAttempts) throw err
    }
  }
  throw lastErr
}

async function uploadViaServer(
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<PutBlobResult> {
  const formData = new FormData()
  formData.append('file', file)

  // サーバー経由は進捗イベントが取れないので、目視で「動いている」感だけ出す
  onProgress?.(10)

  let res: Response
  try {
    res = await fetch('/api/blob/server-upload', { method: 'POST', body: formData })
  } catch (err) {
    throw new Error(
      `サーバーへのアップロード中に通信エラーが発生しました: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  onProgress?.(90)

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const json = (await res.json()) as { error?: string }
      if (json.error) detail = json.error
    } catch {
      // ignore
    }
    throw new Error(`アップロードに失敗しました: ${detail}`)
  }

  const { url } = (await res.json()) as { url: string }
  onProgress?.(100)

  // PutBlobResult の `url` 以外は呼び出し側で使っていない
  return {
    url,
    downloadUrl: url,
    pathname: file.name,
    contentType: file.type,
    contentDisposition: `inline; filename="${file.name}"`,
  } as PutBlobResult
}

async function attemptClientUpload(
  pathname: string,
  file: File,
  {
    onProgress,
    stallTimeoutMs,
  }: Required<Pick<UploadOptions, 'stallTimeoutMs'>> & Pick<UploadOptions, 'onProgress'>,
): Promise<PutBlobResult> {
  const controller = new AbortController()
  let stallTimer: ReturnType<typeof setTimeout> | null = null
  let stalled = false

  const resetStallTimer = () => {
    if (stallTimer) clearTimeout(stallTimer)
    stallTimer = setTimeout(() => {
      stalled = true
      controller.abort()
    }, stallTimeoutMs)
  }
  resetStallTimer()

  try {
    return await upload(pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/blob',
      abortSignal: controller.signal,
      onUploadProgress: ({ percentage }) => {
        resetStallTimer()
        onProgress?.(Math.round(percentage))
      },
    })
  } catch (err) {
    if (stalled) {
      throw new Error(STALL_MESSAGE)
    }
    if (err instanceof Error && /failed to retrieve the client token/i.test(err.message)) {
      throw new Error('アップロード許可の取得に失敗しました。ログインし直して再度お試しください。')
    }
    throw err
  } finally {
    if (stallTimer) clearTimeout(stallTimer)
  }
}

function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/?#]+/g, '_')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f]+/g, '')
    .trim()
  return cleaned.length > 0 ? cleaned : `upload-${Date.now()}`
}
