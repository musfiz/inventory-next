'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Search, User, Grid3x3 } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/store/products', label: 'Categories', icon: Grid3x3 },
  { href: '/store/search', label: 'Search', icon: Search },
  { href: '/store/account', label: 'Account', icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const itemCount = useCartStore(s => s.getItemCount());
  const openCart = useCartStore(s => s.openDrawer);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-gray-200 bg-white/95 backdrop-blur-md lg:hidden dark:border-gray-800 dark:bg-gray-950/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.slice(0, 2).map(item => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold"
          >
            <Icon
              className={`h-5 w-5 transition-colors ${
                active
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            />
            <span
              className={
                active
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-gray-500 dark:text-gray-400'
              }
            >
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Cart as the center accent item */}
      <button
        onClick={openCart}
        aria-label={`Open cart with ${itemCount} items`}
        className="-mt-5 flex flex-col items-center justify-end"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg ring-4 ring-white dark:ring-gray-950">
          <ShoppingBag className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
              {itemCount}
            </span>
          )}
        </span>
        <span className="mt-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
          Cart
        </span>
      </button>

      {NAV_ITEMS.slice(2).map(item => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold"
          >
            <Icon
              className={`h-5 w-5 transition-colors ${
                active
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            />
            <span
              className={
                active
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-gray-500 dark:text-gray-400'
              }
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}