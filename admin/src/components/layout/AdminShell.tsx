'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/lib/auth';
import { Loader } from '../ui/Loader';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    (async () => {
      await hydrate();
      if (!useAuth.getState().user) router.replace('/login');
    })();
  }, [hydrate, router]);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader label="Authenticating..." /></div>;
  }

  return (
    <div className="relative z-10 flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-6 md:px-10 py-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">{children}</div>
        <footer className="max-w-7xl mx-auto mt-16 pt-6 border-t border-goldDeep/10 flex justify-between items-center font-mono text-[10px] uppercase tracking-widest text-muted/60">
          <span>SYS:READY <span className="text-success animate-pulse">●</span></span>
          <span>ADMIN PANEL v1.0</span>
        </footer>
      </main>
    </div>
  );
}
