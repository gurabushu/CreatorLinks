import { put } from '@vercel/blob'
import { type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// クライアント側の PUT が詰まる環境向けの代替経路：
// ブラウザ → Next.js (Edge) → Vercel Blob で同一オリジン POST のみで完結させる
export const runtime = 'edge'

const MAX_BODY_SIZE = 4 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest): Promise<Response> {
  // env 未設定時のフェイルファスト: SDK の生エラーをユーザーに見せない
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('[api/blob/server-upload] BLOB_READ_WRITE_TOKEN not configured')
    return Response.json(
      { error: '画像アップロード機能が設定されていません。管理者にお問い合わせください。' },
      { status: 503 },
    )
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
  })
  if (!token) {
    return Response.json({ error: 'ログインが切れています。再ログインしてください。' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (err) {
    console.error('[api/blob/server-upload] formData parse failed:', err)
    return Response.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return Response.json({ error: 'ファイルが添付されていません' }, { status: 400 })
  }
  if (file.size > MAX_BODY_SIZE) {
    return Response.json({ error: 'ファイルが大きすぎます（最大 4MB）' }, { status: 413 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'この画像形式は対応していません' }, { status: 415 })
  }

  try {
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
    })
    return Response.json({ url: blob.url })
  } catch (err) {
    console.error('[api/blob/server-upload] put failed:', err)
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
