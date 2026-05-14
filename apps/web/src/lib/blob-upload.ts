import { upload } from '@vercel/blob/client'
import type { PutBlobResult } from '@vercel/blob'

interface UploadOptions {
  onProgress?: (percentage: number) => void
  /** 進捗イベントがこの時間以上止まったら中止する（ms） */
  stallTimeoutMs?: number
}

const STALL_MESSAGE =
  'アップロードが進まないため中止しました。通信状況を確認してもう一度お試しください。'

/**
 * `@vercel/blob/client` の `upload()` をラップして、
 * - 進捗が止まったら abort して分かりやすいエラーを出す（デフォルト 30s）
 * - stall 検知後は新しい接続で 1 回だけ自動リトライ（UI 上では % が 0 に戻って再上昇）
 * - 既定の 10 回サイレントリトライによる「0% のまま動かない」状態を防ぐ
 * - pathname の特殊文字を除去
 */
export async function uploadBlob(
  file: File,
  { onProgress, stallTimeoutMs = 30_000 }: UploadOptions = {},
): Promise<PutBlobResult> {
  const safeName = sanitizeFileName(file.name)
  const maxAttempts = 2
  let lastErr: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await attemptUpload(safeName, file, { onProgress, stallTimeoutMs })
    } catch (err) {
      lastErr = err
      const isStall = err instanceof Error && err.message === STALL_MESSAGE
      // stall 以外（認証・コンテンツタイプ拒否など）は即座にエラーを返す
      if (!isStall || attempt === maxAttempts) throw err
    }
  }
  // ループは throw か return で必ず抜けるので到達しないが、型のために残す
  throw lastErr
}

async function attemptUpload(
  pathname: string,
  file: File,
  { onProgress, stallTimeoutMs }: Required<Pick<UploadOptions, 'stallTimeoutMs'>> & Pick<UploadOptions, 'onProgress'>,
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
  // パス区切り、クエリ・フラグメント記号、制御文字を除去
  const cleaned = name
    .replace(/[\\/?#]+/g, '_')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f]+/g, '')
    .trim()
  return cleaned.length > 0 ? cleaned : `upload-${Date.now()}`
}
