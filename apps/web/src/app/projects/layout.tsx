import { DashboardShell } from '@/components/dashboard-shell/dashboard-shell'

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell requireAuth={false}>{children}</DashboardShell>
}
