// Next.js 15 の instrumentation.ts エントリポイント
// register() は Next の初回起動時に一度だけ呼ばれ、Sentry を該当ランタイムで初期化する

import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// App Router のサーバーコンポーネント／Server Actions の例外を Sentry に流す
export const onRequestError = Sentry.captureRequestError
