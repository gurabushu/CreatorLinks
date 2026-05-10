// app/api/inngest/route.ts — Inngest サーブエンドポイント
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { functions } from '@/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
