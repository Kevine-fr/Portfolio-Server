import { AdminShell } from '@/components/layout/admin-shell';
export default function SkillsLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
export const metadata = { title: 'Compétences' };
