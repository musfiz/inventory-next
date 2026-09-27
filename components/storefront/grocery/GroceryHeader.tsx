'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import {
  User,
  Heart,
  Menu,
  Phone,
  Truck,
  BadgePercent,
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

export default function GroceryHeader() {
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
      {/* Top info bar — same admin-configured content as the default theme, grocery skin */}
      {menuReady && menu.utility_bar_enabled && (
        <div className="hidden bg-green-700 text-xs text-white lg:block">
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
                  width={220}
                  height={75}
                  className="h-[75px] w-auto max-w-[220px] object-contain"
                  unoptimized={headerLogo.startsWith('data:')}
                />
              ) : ready ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-white shadow-lg shadow-green-600/20">
                    <span className="text-lg">🛒</span>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xl font-black leading-none tracking-tight text-gray-900 dark:text-white">
                      {storeName || 'Grocery'}<span className="text-green-600">.</span>
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-600">Fresh & Fast</p>
                  </div>
                </>
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
              )}
            </Link>

            <div className="hidden flex-1 lg:flex lg:justify-center">
              <div className="w-full max-w-4xl">
                <SearchBar />
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              <Link href="/store/account/wishlist" className="relative hidden rounded-xl p-2.5 text-gray-600 transition-all hover:bg-gray-100 sm:inline-flex dark:text-gray-300 dark:hover:bg-gray-800" aria-label="Wishlist">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white shadow-sm">
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
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">
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

              <button onClick={openCart} className="relative inline-flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-4 text-gray-900 shadow-sm transition-all hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700" aria-label={`Cart with ${itemCount} items`}>
                <div className="relative">
                  <ImCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white shadow-sm">
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

        {/* Category nav — same data as the default theme, grocery skin */}
        <StorefrontCategoryNav variant="grocery" scrolled={scrolled} />
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} headerLogo={headerLogo} ready={ready} storeName={storeName} />
    </>
  );
}
