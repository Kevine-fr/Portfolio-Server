'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Sparkle } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { NAV_ITEMS } from './nav-config';

interface Props {
  onNavigate?: () => void;   // for closing mobile sheet on click
}

export function SidebarNav({ onNavigate }: Props) {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);

  // Live unread contacts counter
  const { data: unreadData } = useQuery({
    queryKey: ['contacts', 'unread-count'],
    queryFn: () => apiGet<{ count: number }>('/contacts/unread-count'),
    refetchInterval: 30_000,
    enabled: !!user,
  });
  const unread = unreadData?.count ?? 0;

  return (
    <div
      className="flex h-full flex-col"
      style={{
        // En PWA standalone, le sidebar (desktop) ET le drawer mobile partagent
        // ce composant. Les insets safe-area l'empechent d'etre masque par la
        // status bar ou le home indicator.
        paddingTop:    'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b px-6 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkle className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Portfolio</span>
          <span className="text-xs text-muted-foreground">Administration</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') return null;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          const showBadge = item.href === '/contacts' && unread > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              {showBadge && <Badge variant="default" className="h-5 px-1.5 text-[10px]">{unread}</Badge>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
