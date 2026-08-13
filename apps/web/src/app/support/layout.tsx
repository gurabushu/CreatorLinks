import { DashboardShell } from '@/components/dashboard-shell/dashboard-shell'

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell requireAuth={false}>{children}</DashboardShell>
}
