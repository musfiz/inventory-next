'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import {
  User,
  Heart,
  Menu,
  ChevronDown,
  MapPin,
  Clock,
  Phone,
} from 'lucide-react';
import { ImCart } from 'react-icons/im';
import { useStorefrontCategories } from '@/hooks/use-storefront-categories';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import { formatMoney } from '@/lib/utils/format';
import { useBranding } from '@/hooks/use-branding';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import { SearchBar } from '@/components/storefront/navigation/SearchBar';
import { AccountMenu } from '@/components/storefront/navigation/AccountMenu';
import { MobileMenu } from '@/components/storefront/navigation/MobileMenu';

export default function GroceryHeader() {
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const itemCount = useCartStore(s => s.getItemCount());
  const subtotal = useCartStore(s => s.getSubtotal());
  const wishlistCount = useWishlistStore(s => s.items.length);
  const openCart = useCartStore(s => s.openDrawer);
  const { headerLogo, ready } = useBranding();
  const { categories } = useStorefrontCategories();
  const { storeName } = useStorefrontStatus();
  const user = useCustomerAuthStore(s => s.user);
  const router = useRouter();

  const groceryCategories = [
    { name: 'Vegetables', slug: 'vegetables', emoji: '🥬' },
    { name: 'Fruits', slug: 'fruits', emoji: '🍎' },
    { name: 'Meat & Fish', slug: 'meat-fish', emoji: '🥩' },
    { name: 'Dairy & Eggs', slug: 'dairy-eggs', emoji: '🥛' },
    { name: 'Bakery', slug: 'bakery', emoji: '🍞' },
    { name: 'Beverages', slug: 'beverages', emoji: '🥤' },
    { name: 'Snacks', slug: 'snacks', emoji: '🍿' },
    { name: 'Cleaning', slug: 'cleaning', emoji: '🧹' },
  ];

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
      {/* Top delivery info bar */}
      <div className="hidden bg-green-700 text-xs text-white lg:block">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="h-3 w-3" /> Deliver to: Dhaka 1205
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="h-3 w-3" /> Order before 2PM for same-day delivery
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5 font-medium">
              <Phone className="h-3 w-3" /> +880 1700-000000
            </span>
          </div>
        </div>
      </div>

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
                  className="h-10 w-auto object-contain"
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

        {/* Grocery category nav */}
        <nav className={`hidden border-t border-gray-100 bg-white/50 backdrop-blur-sm lg:block dark:border-gray-800 dark:bg-gray-950/50 ${scrolled ? 'hidden' : ''}`}>
          <div className="mx-auto max-w-screen-2xl px-4">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
              <Link
                href="/store"
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700"
              >
                <Menu className="h-4 w-4" />
                All Categories
              </Link>
              {groceryCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/store/category/${cat.slug}`}
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-green-50 hover:text-green-700 dark:text-gray-200 dark:hover:bg-green-950/30"
                >
                  <span>{cat.emoji}</span>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} headerLogo={headerLogo} ready={ready} storeName={storeName} />
    </>
  );
}
