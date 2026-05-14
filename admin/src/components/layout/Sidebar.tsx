'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

const NAV = [
  { path: '/dashboard',    label: 'dashboard',    sys: '00' },
  { path: '/projects',     label: 'projects',     sys: '01' },
  { path: '/skills',       label: 'skills',       sys: '02' },
  { path: '/experiences',  label: 'experiences',  sys: '03' },
  { path: '/education',    label: 'education',    sys: '04' },
  { path: '/tags',         label: 'tags',         sys: '05' },
  { path: '/contacts',     label: 'contacts',     sys: '06' },
  { path: '/users',        label: 'users',        sys: '07', adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  // Live unread contacts counter
  const { data: unreadData } = useQuery({
    queryKey: ['contacts', 'unread-count'],
    queryFn: () => apiGet<{ count: number }>('/contacts/unread-count'),
    refetchInterval: 30_000,
    enabled: !!user,
  });

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-surface/40 backdrop-blur-md border-r border-goldDeep/15 flex flex-col">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-goldDeep/15">
        <p className="font-mono text-xs text-goldDeep uppercase tracking-widest mb-1">
          [ portfolio.sys ]
        </p>
        <p className="font-mono text-sm text-goldPale">admin.console</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {NAV.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') return null;
          const isActive = pathname.startsWith(item.path);
          const isContacts = item.path === '/contacts';
          const unread = unreadData?.count ?? 0;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`group flex items-center justify-between px-3 py-2 rounded-sm font-mono text-sm transition-all ${
                isActive
                  ? 'bg-goldDeep/15 text-goldGlow shadow-inset-gold'
                  : 'text-muted hover:text-goldPale hover:bg-goldDeep/5'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`text-xs ${isActive ? 'text-goldGlow' : 'text-goldDeep/60'}`}>
                  {item.sys}
                </span>
                <span className="uppercase tracking-wider text-xs">
                  {isActive && <span className="text-goldGlow">{`> `}</span>}
                  {item.label}
                </span>
              </span>
              {isContacts && unread > 0 && (
                <span className="badge badge-gold !px-1.5 !py-0 !text-[10px]">{unread}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User block */}
      <div className="border-t border-goldDeep/15 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-goldDeep/20 border border-goldDeep/40 flex items-center justify-center text-goldGlow text-xs font-mono">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-whiteHex truncate font-mono">{user?.name}</p>
            <p className="text-[10px] text-muted uppercase tracking-widest">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left font-mono text-xs uppercase tracking-widest text-muted hover:text-danger transition-colors px-3 py-1.5 rounded-sm hover:bg-danger/5"
        >
          {`> logout`}
        </button>
      </div>
    </aside>
  );
}
