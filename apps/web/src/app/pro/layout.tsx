import { DashboardShell } from '@/components/dashboard-shell/dashboard-shell'

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell requireAuth={false}>{children}</DashboardShell>
}
