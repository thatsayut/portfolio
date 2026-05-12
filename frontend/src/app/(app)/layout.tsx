'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/utils/cn';

const userNav = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/checkin', label: 'Daily Check-in', icon: '✅' },
  { href: '/lucky-draw', label: 'Lucky Draw', icon: '🎰' },
  { href: '/wallet', label: 'Wallet', icon: '💰' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

const adminNav = [
  { href: '/admin', label: 'Overview', icon: '📈' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/rewards', label: 'Reward Config', icon: '⚙️' },
  { href: '/admin/lucky-draw', label: 'Lucky Draw Config', icon: '🎰' },
  { href: '/admin/bonus', label: 'Bonus Campaigns', icon: '🎁' },
  { href: '/admin/audit', label: 'Audit Logs', icon: '📋' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user, logout, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push('/login');
  }, [_hasHydrated, isAuthenticated, router]);

  // Wait for localStorage to hydrate before deciding to redirect
  if (!_hasHydrated) return null;
  if (!isAuthenticated || !user) return null;

  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  const nav = isAdmin ? adminNav : userNav;

  const handleLogout = async () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎁</span>
            <span className="font-bold text-foreground">Reward Platform</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition text-sm font-medium"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="border-t border-border my-2" />
              <p className="px-3 text-xs text-muted-foreground uppercase tracking-wider mb-1">
                User Area
              </p>
              {userNav.slice(0, 3).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition text-sm font-medium"
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
              {user.username[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.username}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
