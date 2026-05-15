import { AdminShell } from '@/components/layout/admin-shell';
export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
export const metadata = { title: 'Messages' };
