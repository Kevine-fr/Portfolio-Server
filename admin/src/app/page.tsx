'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    (async () => {
      await hydrate();
      router.replace(useAuth.getState().user ? '/dashboard' : '/login');
    })();
  }, [hydrate, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="font-mono text-goldDeep animate-pulse text-sm uppercase tracking-widest">
        Booting portfolio.sys ...
      </p>
    </div>
  );
}
