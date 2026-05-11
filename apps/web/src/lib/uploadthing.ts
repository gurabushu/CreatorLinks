// lib/uploadthing.ts — Uploadthing クライアント生成コンポーネント
import { generateReactHelpers, generateUploadButton, generateUploadDropzone } from '@uploadthing/react'
import type { OurFileRouter } from '@/app/api/uploadthing/core'

// 型安全な UploadButton / UploadDropzone コンポーネントを生成
export const UploadButton = generateUploadButton<OurFileRouter>()
export const UploadDropzone = generateUploadDropzone<OurFileRouter>()
export const { useUploadThing } = generateReactHelpers<OurFileRouter>()
