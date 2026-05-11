import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { type NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg', 'audio/x-m4a',
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska',
]

export async function POST(request: NextRequest): Promise<Response> {
  const session = await auth()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: 256 * 1024 * 1024, // 256 MB
      }),
      onUploadCompleted: async () => {
        // DB への保存はクライアント側の server action で行うため不要
      },
    })
    return Response.json(jsonResponse)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 400 })
  }
}
