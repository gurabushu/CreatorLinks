import { router } from '../trpc'
import { userRouter } from './user'
import { projectRouter } from './project'
import { matchRouter, messageRouter, reviewRouter } from './match'
import { portfolioRouter } from './portfolio'

// アプリケーションルートルーター
export const appRouter = router({
  user: userRouter,
  project: projectRouter,
  match: matchRouter,
  message: messageRouter,
  review: reviewRouter,
  portfolio: portfolioRouter,
})

// クライアント型推論用エクスポート
export type AppRouter = typeof appRouter
