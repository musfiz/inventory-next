'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  User,
  Heart,
  Menu,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Phone,
  BadgePercent,
  Home,
  LayoutGrid,
  Sparkles,
  TrendingUp,
  Link as LinkIcon,
} from 'lucide-react';
import { ImCart } from 'react-icons/im';
import { useStorefrontCategories } from '@/hooks/use-storefront-categories';
import type { CategoryTreeItem } from '@/services/storefrontService';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import { formatMoney } from '@/lib/utils/format';
import { useBranding } from '@/hooks/use-branding';
import { useHeaderMenu } from '@/hooks/use-header-menu';
import type { StorefrontNavigationItem } from '@/types/api.types';
import { CategoryDropdown } from '@/components/storefront/navigation/CategoryDropdown';
import { CustomDropdown } from '@/components/storefront/navigation/CustomDropdown';
import { MegaMenu } from '@/components/storefront/navigation/MegaMenu';
import { CascadingMenu } from '@/components/storefront/navigation/CascadingMenu';
import { SearchBar } from '@/components/storefront/navigation/SearchBar';
import { AccountMenu } from '@/components/storefront/navigation/AccountMenu';
import { MobileMenu } from '@/components/storefront/navigation/MobileMenu';

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
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
  const itemCount = useCartStore(s => s.getItemCount());
  const subtotal = useCartStore(s => s.getSubtotal());
  const wishlistCount = useWishlistStore(s => s.items.length);
  const openCart = useCartStore(s => s.openDrawer);
  const { headerLogo, ready } = useBranding();
  const { config: menu, ready: menuReady } = useHeaderMenu();
  const { categories } = useStorefrontCategories();
  const user = useCustomerAuthStore(s => s.user);
  const router = useRouter();

  // Navigation from admin config
  const navConfig = menu.menu_items ?? [];
  const activeMenuItems = navConfig.filter((i: StorefrontNavigationItem) => i.is_active);
  const hasCustomNav = activeMenuItems.length > 0;

  // Recursively find a category by slug across the entire tree
  const findCategoryBySlug = (slug: string, list?: CategoryTreeItem[]): CategoryTreeItem | undefined => {
    const cats = list ?? categories;
    for (const cat of cats) {
      if (cat.slug === slug) return cat;
      if (cat.children?.length) {
        const found = findCategoryBySlug(slug, cat.children);
        if (found) return found;
      }
    }
    return undefined;
  };

  // Render a category-based menu item with dropdown if display_mode is 'dropdown'
  const renderNavItem = (item: StorefrontNavigationItem) => {
    if (item.type === 'custom_link') {
      return (
        <Link
          key={item.id}
          href={item.url || '#'}
          target={item.open_in_new_tab ? '_blank' : undefined}
          rel={item.open_in_new_tab ? 'noopener noreferrer' : undefined}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800"
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
        <div
          key={item.id}
          className="relative shrink-0"
          onMouseEnter={(e) => { setMenuWithDelay(item.id); setMenuAnchorRect(e.currentTarget.getBoundingClientRect()); }}
        >
          <button
            className={`group flex items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-sm font-semibold transition-all cursor-pointer ${activeMenu === item.id
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400'
              : 'text-gray-700 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
          >
            {item.label}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeMenu === item.id ? 'rotate-180' : ''}`} />
          </button>
          {activeMenu === item.id && hasDropdownItems && menuAnchorRect && createPortal(
            <CustomDropdown
              item={item}
              style={{ top: menuAnchorRect.bottom, left: menuAnchorRect.left }}
              onClose={() => setMenuWithDelay(null)}
              onKeepOpen={() => { if (menuTimer.current) clearTimeout(menuTimer.current); }}
            />,
            document.body
          )}
        </div>
      );
    }

    // Category item — single link mode
    const cat = item.category_slug ? findCategoryBySlug(item.category_slug) : null;
    const hasSubs = cat ? (cat.children?.length ?? 0) > 0 : false;

    return (
      <div
        key={item.id}
        className="relative shrink-0"
        onMouseEnter={(e) => { setMenuWithDelay(item.id); setMenuAnchorRect(e.currentTarget.getBoundingClientRect()); }}
      >
        <Link
          href={item.url || '#'}
          className={`group flex items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-sm font-semibold transition-all ${activeMenu === item.id
            ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400'
            : 'text-gray-700 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800'
            }`}
        >
          {item.label}
          {hasSubs && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeMenu === item.id ? 'rotate-180' : ''}`} />}
        </Link>
        {activeMenu === item.id && hasSubs && cat && menuAnchorRect && createPortal(
          <CategoryDropdown cat={cat} style={{ top: menuAnchorRect.bottom, left: menuAnchorRect.left }} onClose={() => setMenuWithDelay(null)} onKeepOpen={() => { if (menuTimer.current) clearTimeout(menuTimer.current); }} />,
          document.body
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

  // Show/hide slide arrows when the category nav row overflows its width
  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;

    const updateScrollState = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };

    updateScrollState();
    el.addEventListener('scroll', updateScrollState);
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [menuReady, hasCustomNav, activeMenuItems.length, categories.length]);

  const slideNav = (direction: -1 | 1) => {
    navScrollRef.current?.scrollBy({ left: direction * 240, behavior: 'smooth' });
  };

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
            <button onClick={() => setMobileOpen(true)} className="p-2.5 text-gray-700 hover:bg-gray-100 lg:hidden dark:text-gray-200 dark:hover:bg-gray-800">
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

        {/* Category nav */}
        <nav className={`relative hidden border-t border-gray-100 bg-white/50 backdrop-blur-sm lg:block dark:border-gray-800 dark:bg-gray-950/50 ${scrolled ? 'hidden' : ''}`} onMouseLeave={() => setMenuWithDelay(null)}>
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-4">
            {menuReady ? (
              <>
                {/* All Categories button */}
                {(menu.mega_menu_config?.enabled === true) && (
                  <div className="relative" onMouseEnter={() => setMenuWithDelay('all')}>
                    <button className="flex items-center gap-2.5 bg-brand-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700">
                      <Menu className="h-4 w-4" />
                      All Categories
                      <ChevronDown className={`h-4 w-4 transition-transform ${activeMenu === 'all' ? 'rotate-180' : ''}`} />
                    </button>
                    {activeMenu === 'all' && menu.mega_menu_config?.display_style === 'cascading' && (
                      <CascadingMenu onClose={() => setMenuWithDelay(null)} onKeepOpen={() => { if (menuTimer.current) clearTimeout(menuTimer.current); }} />
                    )}
                  </div>
                )}

                {/* Menu items from admin config, or fallback to full category tree — horizontally scrollable when overflowing */}
                <div className="relative flex min-w-0 flex-1 items-center">
                  {canScrollLeft && (
                    <button
                      type="button"
                      onClick={() => slideNav(-1)}
                      aria-label="Scroll categories left"
                      className="absolute left-0 z-10 flex h-full items-center bg-linear-to-r from-white via-white to-transparent pl-1 pr-4 text-gray-500 hover:text-brand-600 dark:from-gray-950 dark:via-gray-950 dark:text-gray-400"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                  <div
                    ref={navScrollRef}
                    className="flex items-center gap-1 overflow-x-auto scroll-smooth scrollbar-none"
                  >
                    <Link
                      href="/store"
                      onMouseEnter={() => setMenuWithDelay(null)}
                      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <Home className="h-3.5 w-3.5" />
                      Home
                    </Link>
                    <Link
                      href="/store/products"
                      onMouseEnter={() => setMenuWithDelay(null)}
                      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      All Products
                    </Link>
                    {hasCustomNav
                      ? activeMenuItems.map(renderNavItem)
                      : categories.slice(0, 6).map(cat => {
                        const hasSubs = (cat.children?.length ?? 0) > 0;
                        return (
                          <div
                            key={cat.id}
                            className="relative shrink-0"
                            onMouseEnter={(e) => { setMenuWithDelay(cat.id); setMenuAnchorRect(e.currentTarget.getBoundingClientRect()); }}
                          >
                            <Link href={`/store/category/${cat.slug}`} className={`group flex items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-sm font-semibold transition-all ${activeMenu === cat.id ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400' : 'text-gray-700 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800'}`}>
                              {cat.name}
                              {hasSubs && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeMenu === cat.id ? 'rotate-180' : ''}`} />}
                            </Link>
                            {activeMenu === cat.id && hasSubs && menuAnchorRect && createPortal(
                              <CategoryDropdown cat={cat} style={{ top: menuAnchorRect.bottom, left: menuAnchorRect.left }} onClose={() => setMenuWithDelay(null)} onKeepOpen={() => { if (menuTimer.current) clearTimeout(menuTimer.current); }} />,
                              document.body
                            )}
                          </div>
                        );
                      })}
                  </div>
                  {canScrollRight && (
                    <button
                      type="button"
                      onClick={() => slideNav(1)}
                      aria-label="Scroll categories right"
                      className="absolute right-0 z-10 flex h-full items-center bg-linear-to-l from-white via-white to-transparent pl-4 pr-1 text-gray-500 hover:text-brand-600 dark:from-gray-950 dark:via-gray-950 dark:text-gray-400"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Best Sellers + New Arrivals (Flash Sale removed per request) */}
                <div className="ml-auto flex items-center gap-2">
                  <Link href="/store/products?filter=bestseller" className="flex items-center gap-1.5 bg-amber-500 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-600">
                    <TrendingUp className="h-3.5 w-3.5" /> Best Sellers
                  </Link>
                  {menu.navigation_show_new_arrivals && (
                    <Link href="/store/products?filter=new" className="flex items-center gap-1.5 bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700">
                      <Sparkles className="h-3.5 w-3.5" /> New Arrivals
                    </Link>
                  )}
                </div>
              </>
            ) : (
              /* Loading skeleton while header menu data is being fetched */
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-10 w-24 animate-pulse bg-gray-100 dark:bg-gray-800" />
              ))
            )}
          </div>
          {activeMenu === 'all' && menu.mega_menu_config?.display_style !== 'cascading' && (
            <MegaMenu onClose={() => setMenuWithDelay(null)} onKeepOpen={() => { if (menuTimer.current) clearTimeout(menuTimer.current); }} />
          )}
        </nav>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} headerLogo={headerLogo} ready={ready} />
    </>
  );
}
