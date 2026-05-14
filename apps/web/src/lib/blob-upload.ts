import { upload } from '@vercel/blob/client'
import type { PutBlobResult } from '@vercel/blob'

interface UploadOptions {
  onProgress?: (percentage: number) => void
  /** 進捗イベントがこの時間以上止まったら中止する（ms） */
  stallTimeoutMs?: number
}

/**
 * `@vercel/blob/client` の `upload()` をラップして、
 * - 進捗が止まったら自動的に abort して分かりやすいエラーを出す（デフォルト 20s）
 * - 既定の 10 回サイレントリトライによる「0% のまま動かない」状態を防ぐ
 * - pathname の特殊文字を除去
 */
export async function uploadBlob(
  file: File,
  { onProgress, stallTimeoutMs = 20_000 }: UploadOptions = {},
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

  const safeName = sanitizeFileName(file.name)

  try {
    return await upload(safeName, file, {
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
      throw new Error('アップロードが進まないため中止しました。通信状況を確認してもう一度お試しください。')
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
