// app/api/uploadthing/route.ts — Uploadthing Next.js Route Handler
import { createRouteHandler } from 'uploadthing/next'
import { ourFileRouter } from './core'

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
})
