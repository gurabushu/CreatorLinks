import { router } from '../trpc'
import { userRouter } from './user'
import { projectRouter } from './project'
import { matchRouter, messageRouter, reviewRouter } from './match'
import { portfolioRouter } from './portfolio'
import { eventRouter } from './event'
import { calendarRouter } from './calendar'

// アプリケーションルートルーター
export const appRouter = router({
  user: userRouter,
  project: projectRouter,
  match: matchRouter,
  message: messageRouter,
  review: reviewRouter,
  portfolio: portfolioRouter,
  event: eventRouter,
  calendar: calendarRouter,
})

// クライアント型推論用エクスポート
export type AppRouter = typeof appRouter
