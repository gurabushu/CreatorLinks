import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'

const MAX_SIZES: Record<string, number> = {
  'image/': 16 * 1024 * 1024,   // 16 MB
  'audio/': 64 * 1024 * 1024,   // 64 MB
  'video/': 256 * 1024 * 1024,  // 256 MB
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg', 'audio/x-m4a',
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska',
]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'サポートされていないファイル形式です' }, { status: 400 })
  }

  const category = Object.keys(MAX_SIZES).find((k) => file.type.startsWith(k)) ?? 'image/'
  if (file.size > MAX_SIZES[category]!) {
    return NextResponse.json({ error: 'ファイルサイズが上限を超えています' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `uploads/${session.user.id}/${Date.now()}.${ext}`

  const blob = await put(path, file, { access: 'public' })

  return NextResponse.json({ url: blob.url })
}
