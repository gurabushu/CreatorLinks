import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const runtime = 'nodejs'

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg', 'audio/x-m4a',
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska',
]

export async function POST(request: NextRequest): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody

  // blob.upload-completed はVercelサーバーから送られるのでauth不要
  if (body.type === 'blob.generate-client-token') {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production',
    })
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: 256 * 1024 * 1024,
      }),
      onUploadCompleted: async () => {},
    })
    return Response.json(jsonResponse)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 400 })
  }
}
