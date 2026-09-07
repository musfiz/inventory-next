'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Heart,
  MapPin,
  Settings,
  LogOut,
  ChevronRight,
  Truck,
} from 'lucide-react';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import { useCustomerAuth } from '@/hooks/use-customer-auth';
import { notify } from '@/lib/notifications';

const NAV_ITEMS = [
  { href: '/store/account', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/store/account/orders', label: 'My Orders', icon: Package },
  { href: '/store/account/track-orders', label: 'Track Orders', icon: Truck },
  { href: '/store/account/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/store/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/store/account/settings', label: 'Settings', icon: Settings },
];

function AccountLayoutSkeleton() {
  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-screen-2xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="h-24 bg-gray-100 dark:bg-gray-800" />
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            </div>
          </aside>
          <main>
            <div className="animate-pulse space-y-4">
              <div className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-800" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/** Layout for auth pages (login/register) — no auth guard, no sidebar, no hooks */
function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-screen-2xl px-4 py-6">
        {children}
      </div>
    </div>
  );
}

/** Layout for protected account pages — auth guard, sidebar, loading skeleton */
function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCustomerAuthStore(s => s.user);
  const logout = useCustomerAuthStore(s => s.logout);
  const normalizedPath = pathname.replace(/\/$/, '');

  const { isLoading, isRedirecting } = useCustomerAuth({ middleware: 'auth' });

  const isActive = (href: string, exact?: boolean) => {
    const p = normalizedPath; // Reuse the trailing-slash-free pathname
    if (exact) return p === href;
    return p.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    notify.success('Signed out');
    router.push('/');
  };

  if (isLoading || isRedirecting) {
    return <AccountLayoutSkeleton />;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-screen-2xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-200 bg-linear-to-br from-brand-50 to-purple-50 p-5 dark:border-gray-800 dark:from-brand-950/30 dark:to-purple-950/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-brand-600 to-purple-600 text-lg font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900 dark:text-gray-100">
                      {user?.name}
                    </p>
                    <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              <nav className="p-2">
                {NAV_ITEMS.map(item => {
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${active
                          ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      {active && (
                        <ChevronRight className="ml-auto h-4 w-4" />
                      )}
                    </Link>
                  );
                })}
                <button
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </nav>
            </div>
          </aside>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/\/$/, '');
  const isAuthPage = normalizedPath === '/store/account/login' || normalizedPath === '/store/account/register';

  if (isAuthPage) {
    return <AuthLayout>{children}</AuthLayout>;
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
}