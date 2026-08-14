// Sentry: Edge ランタイム（middleware, /api/blob 等）で発生した例外を捕捉
import * as Sentry from '@sentry/nextjs'
import { beforeSend } from './sentry.scrub'

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.2,
    enabled: process.env.NODE_ENV === 'production',
    sendDefaultPii: false,
    beforeSend,
  })
}
