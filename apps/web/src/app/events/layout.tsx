import { DashboardShell } from '@/components/dashboard-shell/dashboard-shell'

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  // イベント関連ページは公開だが、ログイン中はサイドバーを表示する
  return <DashboardShell requireAuth={false}>{children}</DashboardShell>
}
