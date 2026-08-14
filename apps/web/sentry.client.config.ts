// Sentry: ブラウザ側（クライアントコンポーネント）で発生した例外を捕捉
// NEXT_PUBLIC_SENTRY_DSN 未設定時は init を呼ばず完全 no-op（bundle にコードは残るが送信 0）
import * as Sentry from '@sentry/nextjs'
import { beforeSend } from './sentry.scrub'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    // ベータ段階はサンプリング多め。負荷が問題になれば下げる
    tracesSampleRate: 0.2,
    // Replay はコスト高いので現段階は無効。必要になれば replayIntegration を追加
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // dev では大量の HMR ノイズが出るので送らない（明示的に上書き可）
    enabled: process.env.NODE_ENV === 'production',
    // PII 保護: email / IP を自動送信しない
    sendDefaultPii: false,
    beforeSend,
  })
}
