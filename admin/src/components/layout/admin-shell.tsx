'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useScrollDirection } from '@/hooks/use-scroll-direction';
import { SidebarNav } from './sidebar-nav';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hidden = useScrollDirection(80, 8);
  // On force la topbar visible quand le drawer mobile est ouvert
  const topbarHidden = hidden && !mobileOpen;

  useEffect(() => {
    (async () => {
      await hydrate();
      if (!useAuth.getState().user) router.replace('/login');
    })();
  }, [hydrate, router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Authentification…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* ─── Desktop sidebar ──────────────────────────────────────────── */}
      <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarNav />
        </div>
      </aside>

      {/* ─── Main area ────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar — adapts to PWA standalone safe area on top + retracte au scroll */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-md md:px-6"
          style={{
            // height = 4rem (h-16) + safe-area top, content padded down
            paddingTop:    'env(safe-area-inset-top, 0px)',
            paddingLeft:   'calc(1rem + env(safe-area-inset-left, 0px))',
            paddingRight:  'calc(1rem + env(safe-area-inset-right, 0px))',
            minHeight:     'calc(4rem + env(safe-area-inset-top, 0px))',
            // Retracte au scroll vers le bas, reapparait au scroll vers le haut
            transform:     topbarHidden ? 'translateY(-110%)' : 'translateY(0)',
            transition:    'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Mobile burger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <div className="flex items-center gap-1 md:gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in"
          style={{
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
            paddingLeft:   'calc(1rem + env(safe-area-inset-left, 0px))',
            paddingRight:  'calc(1rem + env(safe-area-inset-right, 0px))',
          }}
        >
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
