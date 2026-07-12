'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ShoppingBag,
  User,
  Heart,
  Menu,
  X,
  ChevronDown,
  Phone,
  MapPin,
  LogOut,
  Package,
  LayoutDashboard,
  Settings,
  LogIn,
  UserPlus,
  Sparkles,
  TrendingUp,
  History,
} from 'lucide-react';
import { CATEGORIES, POPULAR_SEARCHES } from '@/lib/storefront/mock-data';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import { PRODUCTS } from '@/lib/storefront/mock-data';
import Image from 'next/image';
import { formatMoney } from '@/lib/storefront/mock-data';

const TOP_LINKS = [
  { label: 'Track Order', href: '/order/track', icon: Truck },
  { label: 'Help', href: '/help', icon: null },
  { label: 'Sell on UIMS', href: '/sell', icon: null },
];

const MegaMenu = ({ onClose }: { onClose: () => void }) => {
  const parentCats = CATEGORIES.filter(c => !c.parentId);

  return (
    <div
      className="absolute left-0 right-0 top-full border-b border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950 sf-fade-in z-40"
      onMouseLeave={onClose}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-8 gap-y-6 px-4 py-8 md:grid-cols-3 lg:grid-cols-5">
        {parentCats.map(cat => {
          const subs = CATEGORIES.filter(c => c.parentId === cat.id);
          return (
            <div key={cat.id} className="space-y-3">
              <Link
                href={`/store/category/${cat.slug}`}
                onClick={onClose}
                className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-900 hover:text-brand-600 dark:text-gray-100"
              >
                {cat.image && (
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                )}
                {cat.name}
              </Link>
              {subs.length > 0 && (
                <ul className="space-y-1.5">
                  {subs.map(sub => {
                    const subSubs = CATEGORIES.filter(c => c.parentId === sub.id);
                    return (
                      <li key={sub.id}>
                        <Link
                          href={`/store/category/${sub.slug}`}
                          onClick={onClose}
                          className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
                        >
                          {sub.name}
                        </Link>
                        {subSubs.length > 0 && (
                          <ul className="ml-2 mt-1 space-y-1">
                            {subSubs.map(subSub => (
                              <li key={subSub.id}>
                                <Link
                                  href={`/store/category/${subSub.slug}`}
                                  onClick={onClose}
                                  className="text-xs text-gray-500 hover:text-brand-600 dark:text-gray-500"
                                >
                                  · {subSub.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SearchBar = ({ onClose }: { onClose?: () => void }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'iphone 15',
    'wireless earbuds',
  ]);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const suggestions = query.trim()
    ? PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const submit = (term: string) => {
    if (!term.trim()) return;
    if (!recentSearches.includes(term)) {
      setRecentSearches([term, ...recentSearches].slice(0, 6));
    }
    setOpen(false);
    setQuery('');
    router.push(`/store/search?q=${encodeURIComponent(term)}`);
    onClose?.();
  };

  return (
    <div ref={ref} className="relative w-full">
      <form
        onSubmit={e => {
          e.preventDefault();
          submit(query);
        }}
      >
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-4 h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search for products, brands and more..."
            className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-11 pr-24 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-950"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-16 rounded-full p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Search
          </button>
        </div>
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[480px] overflow-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 sf-fade-in">
          {!query.trim() ? (
            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
              {recentSearches.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <History className="h-3.5 w-3.5" />
                    Recent
                  </p>
                  <ul className="space-y-1">
                    {recentSearches.map(s => (
                      <li key={s}>
                        <button
                          onClick={() => submit(s)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <Search className="h-3.5 w-3.5 text-gray-400" />
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Popular
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map(p => (
                    <button
                      key={p}
                      onClick={() => submit(p)}
                      className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-brand-100 hover:text-brand-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-brand-900/30 dark:hover:text-brand-300"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {suggestions.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      setOpen(false);
                      router.push(`/store/products/${p.slug}`);
                      onClose?.();
                    }}
                    className="flex w-full items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={p.images[0]}
                        alt={p.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {p.brand?.name} · {p.category.name}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {formatMoney(p.variations[0].sellingPrice)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-gray-500">
              No products found for &quot;{query}&quot;
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const AccountMenu = ({ onClose }: { onClose?: () => void }) => {
  const user = useCustomerAuthStore(s => s.user);
  const isAuthed = useCustomerAuthStore(s => s.isAuthenticated);
  const logout = useCustomerAuthStore(s => s.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    onClose?.();
    router.push('/');
  };

  if (!isAuthed || !user) {
    return (
      <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 sf-fade-in">
        <div className="border-b border-gray-100 bg-gradient-to-br from-brand-50 to-purple-50 p-5 dark:border-gray-800 dark:from-brand-950/50 dark:to-purple-950/50">
          <p className="text-sm text-gray-600 dark:text-gray-400">Welcome</p>
          <p className="text-base font-bold text-gray-900 dark:text-gray-100">
            Sign in to your account
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/store/account/login"
              onClick={onClose}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
            <Link
              href="/store/account/register"
              onClick={onClose}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <UserPlus className="h-4 w-4" />
              Register
            </Link>
          </div>
        </div>
        <ul className="p-2 text-sm">
          {[
            { icon: Package, label: 'My Orders', href: '/store/account/orders' },
            { icon: Heart, label: 'My Wishlist', href: '/store/account/wishlist' },
            { icon: MapPin, label: 'Saved Addresses', href: '/store/account/addresses' },
            { icon: Settings, label: 'Account Settings', href: '/store/account/settings' },
          ].map(({ icon: Icon, label, href }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Icon className="h-4 w-4 text-gray-500" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="border-t border-gray-100 p-3 dark:border-gray-800">
          <p className="text-xs text-gray-500">
            <span className="font-semibold">Demo:</span> Use any email + any
            password to sign in
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 sf-fade-in">
      <div className="border-b border-gray-100 bg-gradient-to-br from-brand-50 to-purple-50 p-5 dark:border-gray-800 dark:from-brand-950/50 dark:to-purple-950/50">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-purple-600 text-lg font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-gray-900 dark:text-gray-100">
              {user.name}
            </p>
            <p className="truncate text-xs text-gray-600 dark:text-gray-400">
              {user.email}
            </p>
          </div>
        </div>
      </div>
      <ul className="p-2 text-sm">
        {[
          {
            icon: LayoutDashboard,
            label: 'Dashboard',
            href: '/store/account',
          },
          { icon: Package, label: 'My Orders', href: '/store/account/orders' },
          { icon: Heart, label: 'My Wishlist', href: '/store/account/wishlist' },
          {
            icon: MapPin,
            label: 'Saved Addresses',
            href: '/store/account/addresses',
          },
          {
            icon: Settings,
            label: 'Account Settings',
            href: '/store/account/settings',
          },
        ].map(({ icon: Icon, label, href }) => (
          <li key={href}>
            <Link
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Icon className="h-4 w-4 text-gray-500" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-gray-100 p-2 dark:border-gray-800">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
};

const MobileMenu = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!open) return null;
  const parentCats = CATEGORIES.filter(c => !c.parentId);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto bg-white shadow-2xl dark:bg-gray-950 sf-slide-in-right">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white/90 px-5 py-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90">
          <Link
            href="/"
            onClick={onClose}
            className="text-xl font-black text-gray-900 dark:text-white"
          >
            UIMS<span className="text-brand-600">.</span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 py-4">
          <p className="px-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Shop by Category
          </p>
          <ul className="mt-2 space-y-1">
            {parentCats.map(cat => {
              const subs = CATEGORIES.filter(c => c.parentId === cat.id);
              const isOpen = expanded === cat.id;
              return (
                <li key={cat.id}>
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/store/category/${cat.slug}`}
                      onClick={onClose}
                      className="flex-1 rounded-lg px-2 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      {cat.name}
                    </Link>
                    {subs.length > 0 && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : cat.id)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    )}
                  </div>
                  {isOpen && subs.length > 0 && (
                    <ul className="ml-2 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3 dark:border-gray-800">
                      {subs.map(sub => (
                        <li key={sub.id}>
                          <Link
                            href={`/store/category/${sub.slug}`}
                            onClick={onClose}
                            className="block rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                          >
                            {sub.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-800">
            <p className="px-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              Quick Links
            </p>
            <ul className="mt-2 space-y-1">
              {[
                { icon: Package, label: 'My Orders', href: '/store/account/orders' },
                { icon: Heart, label: 'Wishlist', href: '/store/account/wishlist' },
                { icon: User, label: 'My Account', href: '/store/account' },
              ].map(({ icon: Icon, label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// local Truck icon
function Truck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}

export default function StorefrontHeader() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const itemCount = useCartStore(s => s.getItemCount());
  const subtotal = useCartStore(s => s.getSubtotal());
  const wishlistCount = useWishlistStore(s => s.items.length);
  const openCart = useCartStore(s => s.openDrawer);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        accountRef.current &&
        !accountRef.current.contains(e.target as Node)
      ) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const parentCats = CATEGORIES.filter(c => !c.parentId);

  return (
    <>
      {/* Top utility bar */}
      <div className="hidden border-b border-gray-200 bg-gray-900 text-xs text-gray-300 lg:block dark:border-gray-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {STORE_PHONE}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Free shipping over ৳5,000
            </span>
          </div>
          <div className="flex items-center gap-4">
            {TOP_LINKS.map(l => (
              <Link
                key={l.label}
                href={l.href}
                className="hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto max-w-7xl px-4 py-3 lg:py-4">
          <div className="flex items-center gap-3 lg:gap-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 lg:hidden dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              href="/"
              className="flex shrink-0 items-center gap-2"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 text-white shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="hidden sm:block">
                <p className="text-xl font-black leading-none text-gray-900 dark:text-white">
                  UIMS<span className="text-brand-600">.</span>
                </p>
                <p className="text-[10px] font-medium uppercase tracking-widest text-gray-500">
                  Store
                </p>
              </div>
            </Link>

            <div className="hidden flex-1 lg:block">
              <SearchBar />
            </div>

            <div className="ml-auto flex items-center gap-1">
              <Link
                href="/store/account/wishlist"
                className="relative hidden rounded-lg p-2.5 text-gray-700 hover:bg-gray-100 sm:inline-flex dark:text-gray-200 dark:hover:bg-gray-800"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <div ref={accountRef} className="relative">
                <button
                  onClick={() => setAccountOpen(o => !o)}
                  className="rounded-lg p-2.5 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  aria-label="Account"
                >
                  <User className="h-5 w-5" />
                </button>
                {accountOpen && (
                  <AccountMenu onClose={() => setAccountOpen(false)} />
                )}
              </div>

              <button
                onClick={openCart}
                className="relative inline-flex items-center gap-2 rounded-lg bg-gray-900 py-2.5 pl-3 pr-3 text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 sm:pr-4"
                aria-label={`Open cart with ${itemCount} items, total ${formatMoney(subtotal)}`}
              >
                <div className="relative">
                  <ShoppingBag className="h-5 w-5" />
                  {itemCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                      {itemCount}
                    </span>
                  )}
                </div>
                <span className="hidden flex-col items-start leading-tight sm:flex">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-gray-300 dark:text-gray-500">
                    {itemCount === 0 ? 'Empty' : `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
                  </span>
                  <span className="text-sm font-bold">
                    {formatMoney(subtotal)}
                  </span>
                </span>
              </button>
            </div>
          </div>

          <div className="mt-3 lg:hidden">
            <SearchBar onClose={() => setMobileOpen(false)} />
          </div>
        </div>

        {/* Category nav */}
        <nav className="hidden border-t border-gray-200 dark:border-gray-800 lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-4">
            <button
              onMouseEnter={() => setActiveMenu('all')}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
            >
              <Menu className="h-4 w-4" />
              All Categories
              <ChevronDown className="h-4 w-4" />
            </button>

            {parentCats.slice(0, 6).map(cat => (
              <div
                key={cat.id}
                onMouseEnter={() => setActiveMenu(cat.id)}
                className="relative"
              >
                <Link
                  href={`/store/category/${cat.slug}`}
                  className="flex items-center gap-1 rounded-lg px-3 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {cat.name}
                  {CATEGORIES.some(c => c.parentId === cat.id) && (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Link>
              </div>
            ))}

            <div className="ml-auto flex items-center gap-2 text-xs">
              <Link
                href="/store/products?filter=sale"
                className="flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1.5 font-bold text-accent-600 hover:bg-accent-100 dark:bg-accent-950/30 dark:text-accent-400"
              >
                🔥 Flash Sale
              </Link>
              <Link
                href="/store/products?filter=new"
                className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 font-bold text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"
              >
                ✨ New Arrivals
              </Link>
            </div>
          </div>

          {activeMenu && (
            <MegaMenu onClose={() => setActiveMenu(null)} />
          )}
        </nav>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}

const STORE_PHONE = '+880 1700-000000';
