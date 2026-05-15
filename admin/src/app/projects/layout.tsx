import { AdminShell } from '@/components/layout/admin-shell';
export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
export const metadata = { title: 'Projets' };
