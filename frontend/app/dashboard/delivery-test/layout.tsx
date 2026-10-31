import { requireDashboardSection } from '@/lib/dashboard-session';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireDashboardSection('roles');
  return children;
}
