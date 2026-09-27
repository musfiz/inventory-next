'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Heart,
  Menu,
  Phone,
  BadgePercent,
  Sparkles,
} from 'lucide-react';
import { ImCart } from 'react-icons/im';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import { formatMoney } from '@/lib/utils/format';
import { useBranding } from '@/hooks/use-branding';
import { useHeaderMenu } from '@/hooks/use-header-menu';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import { SearchBar } from '@/components/storefront/navigation/SearchBar';
import { AccountMenu } from '@/components/storefront/navigation/AccountMenu';
import { MobileMenu } from '@/components/storefront/navigation/MobileMenu';
import { StorefrontCategoryNav } from '@/components/storefront/navigation/StorefrontCategoryNav';
import { useStorefrontTheme } from '@/contexts/storefront-theme-context';
import GroceryHeader from '@/components/storefront/grocery/GroceryHeader';

function Truck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" />
    </svg>
  );
}

export default function StorefrontHeader() {
  const { isGrocery } = useStorefrontTheme();
  return isGrocery ? <GroceryHeader /> : <DefaultStorefrontHeader />;
}

function DefaultStorefrontHeader() {
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const itemCount = useCartStore(s => s.getItemCount());
  const subtotal = useCartStore(s => s.getSubtotal());
  const wishlistCount = useWishlistStore(s => s.items.length);
  const openCart = useCartStore(s => s.openDrawer);
  const { headerLogo, ready } = useBranding();
  const { config: menu, ready: menuReady } = useHeaderMenu();
  const { storeName } = useStorefrontStatus();
  const user = useCustomerAuthStore(s => s.user);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      {/* Top announcement bar — dynamic from header-menu API */}
      {menuReady && menu.utility_bar_enabled && (
        <div
          className="hidden text-xs lg:block"
          style={{ backgroundColor: menu.utility_bar_bg_color, color: menu.utility_bar_text_color }}
        >
          <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-2">
            <div className="flex items-center gap-6">
              {menu.utility_bar_phone && (
                <span className="flex items-center gap-1.5 font-medium">
                  <Phone className="h-3 w-3" /> {menu.utility_bar_phone}
                </span>
              )}
              {menu.utility_bar_text_free_shipping && (
                <span className="flex items-center gap-1.5 font-medium">
                  <Truck className="h-3 w-3" /> {menu.utility_bar_text_free_shipping}
                </span>
              )}
              {menu.utility_bar_text_discount && (
                <span className="flex items-center gap-1.5 font-medium">
                  <BadgePercent className="h-3 w-3" /> {menu.utility_bar_text_discount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-5">
              <Link
                href="/order/track"
                className="flex items-center gap-1 font-medium text-white/80 transition-colors hover:text-white"
              >
                <Truck className="h-3 w-3" />
                Track Order
              </Link>
              <Link
                href="/help"
                className="flex items-center gap-1 font-medium text-white/80 transition-colors hover:text-white"
              >
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[9px] font-bold leading-none">?</span>
                Help Center
              </Link>
            </div>
          </div>
        </div>
      )}

      <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled
        ? 'bg-white/90 shadow-lg shadow-black/5 backdrop-blur-xl dark:bg-gray-950/90'
        : 'bg-white shadow-sm dark:bg-gray-950'
        }`}>
        <div className={`mx-auto max-w-screen-2xl px-4 transition-all duration-300 ${scrolled ? 'py-2' : 'py-3 lg:py-4'}`}>
          <div className="flex items-center gap-4 lg:gap-8">
            <button onClick={() => setMobileOpen(true)} className="p-2.5 text-gray-700 hover:bg-gray-100 lg:hidden dark:text-gray-200 dark:hover:bg-gray-800">
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              {headerLogo ? (
                <Image
                  src={headerLogo}
                  alt="Store logo"
                  width={160}
                  height={40}
                  className="h-[60px] w-auto max-w-[300px] object-contain"
                  unoptimized={headerLogo.startsWith('data:')}
                />
              ) : ready ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-600 to-purple-600 text-white shadow-lg shadow-brand-600/20">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xl font-black leading-none tracking-tight text-gray-900 dark:text-white">
                      {storeName || 'Store'}<span className="text-brand-600">.</span>
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">E‑Store</p>
                  </div>
                </>
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
              )}
            </Link>

            <div className="hidden flex-1 lg:flex lg:justify-center">
              <div className="w-full max-w-xl">
                <SearchBar />
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              <Link href="/store/account/wishlist" className="relative hidden rounded-xl p-2.5 text-gray-600 transition-all hover:bg-gray-100 sm:inline-flex dark:text-gray-300 dark:hover:bg-gray-800" aria-label="Wishlist">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-linear-to-r from-accent-500 to-pink-500 px-1 text-[10px] font-bold text-white shadow-sm">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <div ref={accountRef} className="relative">
                <button
                  onClick={() => {
                    if (user) { setAccountOpen(o => !o); }
                    else { router.push('/store/account/login'); }
                  }}
                  className="flex items-center gap-2 rounded-xl p-2 text-gray-600 transition-all hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  aria-label="Account"
                >
                  {user ? (
                    <>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-brand-600 to-purple-600 text-[11px] font-bold text-white">
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                      <span className="hidden text-sm font-semibold sm:inline-block">
                        Hi, {user.name?.split(' ')[0] || 'User'}
                      </span>
                    </>
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </button>
                {user && accountOpen && <AccountMenu onClose={() => setAccountOpen(false)} />}
              </div>

              <button onClick={openCart} className="relative inline-flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-4 text-gray-900 shadow-sm transition-all hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700" aria-label={`Cart with ${itemCount} items, total ${formatMoney(subtotal)}`}>
                <div className="relative">
                  <ImCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-linear-to-r from-accent-500 to-pink-500 px-1 text-[10px] font-bold text-white shadow-sm">
                      {itemCount}
                    </span>
                  )}
                </div>
                <span className="hidden flex-col items-start leading-tight sm:flex">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-gray-300 dark:text-gray-500">
                    {itemCount === 0 ? 'Empty' : `${itemCount} item${itemCount > 1 ? 's' : ''}`}
                  </span>
                  <span className="text-sm font-bold">{formatMoney(subtotal)}</span>
                </span>
              </button>
            </div>
          </div>

          <div className="mt-3 lg:hidden">
            <SearchBar onClose={() => setMobileOpen(false)} />
          </div>
        </div>

        {/* Category nav — shared data, default styling */}
        <StorefrontCategoryNav variant="default" scrolled={scrolled} />
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} headerLogo={headerLogo} ready={ready} storeName={storeName} />
    </>
  );
}
