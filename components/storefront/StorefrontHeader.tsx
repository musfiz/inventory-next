'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
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
  ChevronRight,
  BadgePercent,
  Gift,
  Link as LinkIcon,
} from 'lucide-react';
import { ImCart } from 'react-icons/im';
import { IoCartSharp } from 'react-icons/io5';
import { CATEGORIES, POPULAR_SEARCHES } from '@/lib/storefront/mock-data';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import { PRODUCTS } from '@/lib/storefront/mock-data';
import Image from 'next/image';
import { formatMoney } from '@/lib/storefront/mock-data';
import { useBranding } from '@/hooks/use-branding';
import { useHeaderMenu } from '@/hooks/use-header-menu';
import type { StorefrontNavigationItem } from '@/types/api.types';

const CategoryDropdown = ({ cat, onClose, onKeepOpen }: { cat: typeof CATEGORIES[0]; onClose: () => void; onKeepOpen: () => void }) => {
  const subs = CATEGORIES.filter(c => c.parentId === cat.id);
  if (subs.length === 0) return null;

  return (
    <div
      className="absolute left-0 top-full z-40 mt-0 w-56 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 sf-fade-in"
      onMouseEnter={onKeepOpen}
      onMouseLeave={onClose}
    >
      <div className="p-2">
        <Link href={`/store/category/${cat.slug}`} onClick={onClose} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-brand-600 transition-all hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/30">
          View all {cat.name} <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="border-t border-gray-100 p-2 dark:border-gray-800">
        {subs.map(sub => {
          const subSubs = CATEGORIES.filter(c => c.parentId === sub.id);
          return (
            <li key={sub.id}>
              <Link href={`/store/category/${sub.slug}`} onClick={onClose} className="block rounded-none px-3 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-brand-50 hover:text-brand-700 dark:text-gray-300 dark:hover:bg-brand-950/30">
                {sub.name}
              </Link>
              {subSubs.length > 0 && (
                <ul className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-3 dark:border-gray-800">
                  {subSubs.map(subSub => (
                    <li key={subSub.id}>
                      <Link href={`/store/category/${subSub.slug}`} onClick={onClose} className="block rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400">{subSub.name}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/**
 * CustomDropdown — renders a dropdown menu with user-assigned categories
 * (from admin StorefrontNavigation → dropdown_items).
 */
const CustomDropdown = ({
  item,
  onClose,
  onKeepOpen,
}: {
  item: StorefrontNavigationItem;
  onClose: () => void;
  onKeepOpen: () => void;
}) => {
  const dropdownItems = item.dropdown_items || [];
  if (dropdownItems.length === 0) return null;

  return (
    <div
      className="absolute left-0 top-full z-40 mt-0 w-56 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 sf-fade-in"
      onMouseEnter={onKeepOpen}
      onMouseLeave={onClose}
    >
      <div className="p-2">
        <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          {item.label}
        </p>
      </div>
      <ul className="border-t border-gray-100 p-2 dark:border-gray-800">
        {dropdownItems.map(di => (
          <li key={di.id}>
            <Link
              href={`/store/category/${di.category_slug}`}
              onClick={onClose}
              className="block rounded-none px-3 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-brand-50 hover:text-brand-700 dark:text-gray-300 dark:hover:bg-brand-950/30"
            >
              {di.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

const MegaMenu = ({ onClose, onKeepOpen }: { onClose: () => void; onKeepOpen: () => void }) => {
  const parentCats = CATEGORIES.filter(c => !c.parentId);
  const colCount = Math.min(parentCats.length, 4);

  return (
    <div
      className="absolute left-0 right-0 top-full z-40 bg-white shadow-xl dark:bg-gray-950 sf-fade-in"
      onMouseEnter={onKeepOpen}
      onMouseLeave={onClose}
    >
      <div className="mx-auto max-w-7xl px-4 py-10">
        <p className="mb-6 text-xs font-bold uppercase tracking-[0.15em] text-gray-400">All Categories</p>
        <div className="grid gap-x-12 gap-y-8" style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
          {parentCats.map(cat => {
            const subs = CATEGORIES.filter(c => c.parentId === cat.id);
            return (
              <div key={cat.id}>
                <Link href={`/store/category/${cat.slug}`} onClick={onClose} className="text-sm font-bold text-gray-900 transition-colors hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-400">
                  {cat.name}
                </Link>
                {subs.length > 0 && (
                  <ul className="mt-2.5 space-y-1">
                    {subs.map(sub => {
                      const subSubs = CATEGORIES.filter(c => c.parentId === sub.id);
                      return (
                        <li key={sub.id}>
                          <Link href={`/store/category/${sub.slug}`} onClick={onClose} className="block text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                            {sub.name}
                          </Link>
                          {subSubs.length > 0 && (
                            <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3 dark:border-gray-700">
                              {subSubs.map(subSub => (
                                <li key={subSub.id}>
                                  <Link href={`/store/category/${subSub.slug}`} onClick={onClose} className="block text-xs text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300">{subSub.name}</Link>
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

        <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800">
          <Link href="/store/products" onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 transition-colors hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-400">
            Browse all products <IoCartSharp className="h-4 w-4" />
          </Link>
        </div>
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
    <div ref={ref} className="relative w-full max-w-2xl">
      <form onSubmit={e => { e.preventDefault(); submit(query); }}>
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-4 h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search products, brands, categories..."
            className="w-full rounded-full border-2 border-gray-100 bg-gray-50 py-3 pl-11 pr-24 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-950"
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
            className="absolute right-1.5 rounded-full bg-linear-to-r from-brand-600 to-purple-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition-all hover:shadow-xl hover:shadow-brand-600/30"
          >
            Search
          </button>
        </div>
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[480px] overflow-auto rounded-lg border border-gray-100 bg-white shadow-2xl shadow-black/5 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950 sf-fade-in">
          {!query.trim() ? (
            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
              {recentSearches.length > 0 && (
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                    <History className="h-3.5 w-3.5" />
                    Recent
                  </p>
                  <ul className="space-y-0.5">
                    {recentSearches.map(s => (
                      <li key={s}>
                        <button
                          onClick={() => submit(s)}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 transition-all hover:bg-brand-50 hover:text-brand-700 dark:text-gray-300 dark:hover:bg-brand-950/30"
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
                <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Trending
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map(p => (
                    <button
                      key={p}
                      onClick={() => submit(p)}
                      className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
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
                    onClick={() => { setOpen(false); router.push(`/store/products/${p.slug}`); onClose?.(); }}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-all hover:bg-linear-to-r hover:from-brand-50 hover:to-transparent dark:hover:from-brand-950/20"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm dark:bg-gray-800">
                      {p.images[0] ? (
                        <Image src={p.images[0]} alt={p.name} fill sizes="56px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-lg font-bold text-gray-300 dark:text-gray-600">{p.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{p.brand?.name} · {p.category.name}</p>
                    </div>
                    <p className="text-sm font-bold text-brand-600">{formatMoney(p.variations[0].sellingPrice)}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-sm text-gray-500">No products found for &ldquo;{query}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
};

const AccountMenu = ({ onClose }: { onClose?: () => void }) => {
  const user = useCustomerAuthStore(s => s.user)!;
  const logout = useCustomerAuthStore(s => s.logout);
  const router = useRouter();

  const handleLogout = () => { logout(); onClose?.(); router.push('/'); };

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-2xl shadow-black/5 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950 sf-fade-in">
      <div className="bg-linear-to-br from-brand-600 to-purple-700 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-bold backdrop-blur-sm">{user.name.charAt(0).toUpperCase()}</div>
          <div className="min-w-0">
            <p className="truncate font-bold">{user.name}</p>
            <p className="truncate text-xs text-white/80">{user.email}</p>
          </div>
        </div>
      </div>
      <ul className="p-2">
        {[
          { icon: LayoutDashboard, label: 'Dashboard', href: '/store/account' },
          { icon: Package, label: 'My Orders', href: '/store/account/orders' },
          { icon: Heart, label: 'Wishlist', href: '/store/account/wishlist' },
          { icon: MapPin, label: 'Saved Addresses', href: '/store/account/addresses' },
          { icon: Settings, label: 'Account Settings', href: '/store/account/settings' },
        ].map(({ icon: Icon, label, href }) => (
          <li key={href}>
            <Link href={href} onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-brand-50 hover:text-brand-700 dark:text-gray-300 dark:hover:bg-brand-950/30">
              <Icon className="h-4 w-4 text-gray-500" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-gray-100 p-2 dark:border-gray-800">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 dark:hover:bg-red-950/30">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
};

const MobileMenu = ({ open, onClose, headerLogo, ready }: { open: boolean; onClose: () => void; headerLogo: string | null; ready: boolean }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { config: menu, ready: menuReady } = useHeaderMenu();
  if (!open) return null;
  const parentCats = CATEGORIES.filter(c => !c.parentId);

  // Custom nav items from admin config
  const navConfig = menu.menu_items ?? [];
  const activeMenuItems = navConfig.filter((i: StorefrontNavigationItem) => i.is_active);
  const hasCustomNav = activeMenuItems.length > 0;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto bg-white shadow-2xl dark:bg-gray-950 sf-slide-in-right">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/90">
          <Link href="/" onClick={onClose} className="flex items-center gap-2">
            {headerLogo ? (
              <img src={headerLogo} alt="Logo" className="h-8 w-auto object-contain" />
            ) : ready ? (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-brand-600 to-purple-600 text-white"><Sparkles className="h-4 w-4" /></div>
                <span className="text-lg font-black text-gray-900 dark:text-white">UIMS<span className="text-brand-600">.</span></span>
              </>
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800" />
            )}
          </Link>
          <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-3 py-4">
          <p className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-gray-500">Shop by Category</p>
          <ul className="space-y-0.5">
            {!menuReady ? (
              // Loading skeleton while header menu data is being fetched
              [...Array(5)].map((_, i) => (
                <li key={i}>
                  <div className="h-11 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                </li>
              ))
            ) : hasCustomNav ? (
              // Render custom nav items in mobile menu
              activeMenuItems.map((item: StorefrontNavigationItem) => {
                const dropdownItems = item.dropdown_items || [];
                const isOpen = expanded === item.id;
                return (
                  <li key={item.id}>
                    {item.type === 'custom_link' ? (
                      <Link href={item.url || '#'} onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-gray-800 transition-all hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900">
                        <LinkIcon className="h-4 w-4 text-gray-400" />
                        {item.label}
                      </Link>
                    ) : item.display_mode === 'single' ? (
                      <Link href={`/store/category/${item.category_slug}`} onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-gray-800 transition-all hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900">
                        {item.label}
                      </Link>
                    ) : (
                      <>
                        <div className="flex items-center justify-between rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-gray-900">
                          <span className="flex-1 px-3 py-3 text-sm font-bold text-gray-800 dark:text-gray-200">{item.label}</span>
                          {dropdownItems.length > 0 && (
                            <button onClick={() => setExpanded(isOpen ? null : item.id)} className="rounded-lg p-3 text-gray-500">
                              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                        {isOpen && dropdownItems.length > 0 && (
                          <ul className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-brand-100 pl-3 dark:border-brand-900/40">
                            {dropdownItems.map(di => (
                              <li key={di.id}>
                                <Link href={`/store/category/${di.category_slug}`} onClick={onClose} className="block rounded-lg px-3 py-2 text-sm text-gray-600 transition-all hover:bg-brand-50 hover:text-brand-700 dark:text-gray-400 dark:hover:bg-brand-950/30 dark:hover:text-brand-300">
                                  {di.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </li>
                );
              })
            ) : (
              // Fallback: render mock categories
              parentCats.map(cat => {
                const subs = CATEGORIES.filter(c => c.parentId === cat.id);
                const isOpen = expanded === cat.id;
                return (
                  <li key={cat.id}>
                    <div className="flex items-center justify-between rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-gray-900">
                      <Link href={`/store/category/${cat.slug}`} onClick={onClose} className="flex-1 px-3 py-3 text-sm font-bold text-gray-800 dark:text-gray-200">{cat.name}</Link>
                      {subs.length > 0 && (
                        <button onClick={() => setExpanded(isOpen ? null : cat.id)} className="rounded-lg p-3 text-gray-500">
                          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                    {isOpen && subs.length > 0 && (
                      <ul className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-brand-100 pl-3 dark:border-brand-900/40">
                        {subs.map(sub => (
                          <li key={sub.id}>
                            <Link href={`/store/category/${sub.slug}`} onClick={onClose} className="block rounded-lg px-3 py-2 text-sm text-gray-600 transition-all hover:bg-brand-50 hover:text-brand-700 dark:text-gray-400 dark:hover:bg-brand-950/30 dark:hover:text-brand-300">{sub.name}</Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })
            )}
          </ul>
          <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
            <p className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-gray-500">Quick Links</p>
            <ul className="space-y-0.5">
              {[
                { icon: Package, label: 'My Orders', href: '/store/account/orders' },
                { icon: Heart, label: 'Wishlist', href: '/store/account/wishlist' },
                { icon: User, label: 'My Account', href: '/store/account' },
              ].map(({ icon: Icon, label, href }) => (
                <li key={href}>
                  <Link href={href} onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                    <Icon className="h-4 w-4 text-gray-500" /> {label}
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

function Truck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" />
    </svg>
  );
}

export default function StorefrontHeader() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const itemCount = useCartStore(s => s.getItemCount());
  const subtotal = useCartStore(s => s.getSubtotal());
  const wishlistCount = useWishlistStore(s => s.items.length);
  const openCart = useCartStore(s => s.openDrawer);
  const { headerLogo, ready } = useBranding();
  const { config: menu, ready: menuReady } = useHeaderMenu();
  const user = useCustomerAuthStore(s => s.user);
  const router = useRouter();

  const parentCats = CATEGORIES.filter(c => !c.parentId);

  // Navigation from admin config
  const navConfig = menu.menu_items ?? [];
  const activeMenuItems = navConfig.filter((i: StorefrontNavigationItem) => i.is_active);
  const hasCustomNav = activeMenuItems.length > 0;

  // Find a mock category by slug (for subcategory dropdowns fallback)
  const findCategoryBySlug = (slug: string) => CATEGORIES.find(c => c.slug === slug || c.name.toLowerCase().replace(/\s+/g, '-') === slug);

  // Render a category-based menu item with dropdown if display_mode is 'dropdown'
  const renderNavItem = (item: StorefrontNavigationItem) => {
    if (item.type === 'custom_link') {
      return (
        <Link
          key={item.id}
          href={item.url || '#'}
          target={item.open_in_new_tab ? '_blank' : undefined}
          rel={item.open_in_new_tab ? 'noopener noreferrer' : undefined}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <LinkIcon className="h-3.5 w-3.5" />
          {item.label}
        </Link>
      );
    }

    // Category item with dropdown (multiple selected categories)
    if (item.display_mode === 'dropdown') {
      const hasDropdownItems = item.dropdown_items && item.dropdown_items.length > 0;
      return (
        <div key={item.id} className="relative" onMouseEnter={() => setMenuWithDelay(item.id)}>
          <button
            className={`group flex items-center gap-1.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all cursor-pointer ${
              activeMenu === item.id
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400'
                : 'text-gray-700 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            {item.label}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeMenu === item.id ? 'rotate-180' : ''}`} />
          </button>
          {activeMenu === item.id && hasDropdownItems && (
            <CustomDropdown
              item={item}
              onClose={() => setMenuWithDelay(null)}
              onKeepOpen={() => { if (menuTimer.current) clearTimeout(menuTimer.current); }}
            />
          )}
        </div>
      );
    }

    // Category item — single link mode
    const cat = item.category_slug ? findCategoryBySlug(item.category_slug) : null;
    const hasSubs = cat ? CATEGORIES.some(c => c.parentId === cat.id) : false;

    return (
      <div key={item.id} className="relative" onMouseEnter={() => setMenuWithDelay(item.id)}>
        <Link
          href={item.url || '#'}
          className={`group flex items-center gap-1.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
            activeMenu === item.id
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400'
              : 'text-gray-700 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800'
          }`}
        >
          {item.label}
          {hasSubs && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeMenu === item.id ? 'rotate-180' : ''}`} />}
        </Link>
        {activeMenu === item.id && hasSubs && cat && (
          <CategoryDropdown cat={cat} onClose={() => setMenuWithDelay(null)} onKeepOpen={() => { if (menuTimer.current) clearTimeout(menuTimer.current); }} />
        )}
      </div>
    );
  };

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

  const setMenuWithDelay = (id: string | null) => {
    if (menuTimer.current) clearTimeout(menuTimer.current);
    if (id) setActiveMenu(id);
    else menuTimer.current = setTimeout(() => setActiveMenu(null), 200);
  };

  return (
    <>
      {/* Top announcement bar — dynamic from header-menu API */}
      {menuReady && menu.utility_bar_enabled && (
        <div
          className="hidden text-xs lg:block"
          style={{ backgroundColor: menu.utility_bar_bg_color, color: menu.utility_bar_text_color }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
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
        <div className={`mx-auto max-w-7xl px-4 transition-all duration-300 ${scrolled ? 'py-2' : 'py-3 lg:py-4'}`}>
          <div className="flex items-center gap-4 lg:gap-8">
            <button onClick={() => setMobileOpen(true)} className="rounded-xl p-2.5 text-gray-700 hover:bg-gray-100 lg:hidden dark:text-gray-200 dark:hover:bg-gray-800">
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              {headerLogo ? (
                <img src={headerLogo} alt="Store logo" className="h-10 w-auto object-contain" />
              ) : ready ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-600 to-purple-600 text-white shadow-lg shadow-brand-600/20">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xl font-black leading-none tracking-tight text-gray-900 dark:text-white">
                      UIMS<span className="text-brand-600">.</span>
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
                  className="rounded-xl p-2.5 text-gray-600 transition-all hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  aria-label="Account"
                >
                  {user ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-linear-to-br from-brand-600 to-purple-600 text-[11px] font-bold text-white">
                      {user.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
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

        {/* Category nav */}
        <nav className={`relative hidden border-t border-gray-100 bg-white/50 backdrop-blur-sm lg:block dark:border-gray-800 dark:bg-gray-950/50 ${scrolled ? 'hidden' : ''}`} onMouseLeave={() => setMenuWithDelay(null)}>
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-4">
            {menuReady ? (
              <>
                {/* All Categories button */}
                {menu.navigation_show_all_categories && (
                  <div onMouseEnter={() => setMenuWithDelay('all')}>
                    <button className="flex items-center gap-2.5 rounded-xl bg-linear-to-r from-brand-600 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition-all hover:shadow-lg hover:shadow-brand-600/30">
                      <Menu className="h-4 w-4" />
                      All Categories
                      <ChevronDown className={`h-4 w-4 transition-transform ${activeMenu === 'all' ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                )}

                {/* Menu items from admin config, or fallback to full category tree */}
                {hasCustomNav
                  ? activeMenuItems.map(renderNavItem)
                  : parentCats.slice(0, 6).map(cat => {
                      const hasSubs = CATEGORIES.some(c => c.parentId === cat.id);
                      return (
                        <div key={cat.id} className="relative" onMouseEnter={() => setMenuWithDelay(cat.id)}>
                          <Link href={`/store/category/${cat.slug}`} className={`group flex items-center gap-1.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${activeMenu === cat.id ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400' : 'text-gray-700 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800'}`}>
                            {cat.name}
                            {hasSubs && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeMenu === cat.id ? 'rotate-180' : ''}`} />}
                          </Link>
                          {activeMenu === cat.id && hasSubs && <CategoryDropdown cat={cat} onClose={() => setMenuWithDelay(null)} onKeepOpen={() => { if (menuTimer.current) clearTimeout(menuTimer.current); }} />}
                        </div>
                      );
                    })}

                {/* Flash Sale & New Arrivals */}
                <div className="ml-auto flex items-center gap-3">
                  {menu.navigation_show_flash_sale && (
                    <Link href="/store/products?filter=sale" className="flex items-center gap-1.5 rounded-full bg-linear-to-r from-rose-500 to-pink-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md">
                      <Gift className="h-3.5 w-3.5" /> Flash Sale
                    </Link>
                  )}
                  {menu.navigation_show_new_arrivals && (
                    <Link href="/store/products?filter=new" className="flex items-center gap-1.5 rounded-full bg-linear-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md">
                      <Sparkles className="h-3.5 w-3.5" /> New Arrivals
                    </Link>
                  )}
                </div>
              </>
            ) : (
              /* Loading skeleton while header menu data is being fetched */
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-10 w-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ))
            )}
          </div>
          {activeMenu === 'all' && <MegaMenu onClose={() => setMenuWithDelay(null)} onKeepOpen={() => { if (menuTimer.current) clearTimeout(menuTimer.current); }} />}
        </nav>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} headerLogo={headerLogo} ready={ready} />
    </>
  );
}
