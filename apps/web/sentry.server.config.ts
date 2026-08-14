// Sentry: サーバー側（Node ランタイム / Server Actions / API Routes）で発生した例外を捕捉
import * as Sentry from '@sentry/nextjs'
import { beforeSend } from './sentry.scrub'

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.2,
    enabled: process.env.NODE_ENV === 'production',
    // PII 保護: email / IP / cookie を自動送信しない
    sendDefaultPii: false,
    // request URL の ?token= や request.data (form input) を除去
    beforeSend,
  })
}
