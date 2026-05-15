'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    (async () => {
      await hydrate();
      router.replace(useAuth.getState().user ? '/dashboard' : '/login');
    })();
  }, [hydrate, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Chargement…</p>
    </div>
  );
}
