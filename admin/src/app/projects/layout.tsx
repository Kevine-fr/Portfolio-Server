import { AdminShell } from '@/components/layout/AdminShell';
export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
