import { DashboardShell } from '@/components/dashboard-shell/dashboard-shell'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
