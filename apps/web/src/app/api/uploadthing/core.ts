// app/api/uploadthing/core.ts — Uploadthing ファイルルーター定義
import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { auth } from '@/lib/auth'

const f = createUploadthing()

export const ourFileRouter = {
  // アバター画像（4MB まで、1ファイル）
  avatarImage: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user?.id) throw new Error('Unauthorized')
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // onUploadComplete はサーバー側で実行される
      // 戻り値は clientSideCallback に渡される
      return {
        uploadedBy: metadata.userId,
        fileKey: file.key,
        url: file.url,
      }
    }),

  // ポートフォリオファイル（画像 16MB / 音声 64MB / 動画 256MB）
  portfolioFile: f({
    image: { maxFileSize: '16MB', maxFileCount: 1 },
    audio: { maxFileSize: '64MB', maxFileCount: 1 },
    video: { maxFileSize: '256MB', maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user?.id) throw new Error('Unauthorized')
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        fileKey: file.key,
        url: file.url,
      }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
