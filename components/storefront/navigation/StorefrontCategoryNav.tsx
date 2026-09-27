'use client';

/**
 * StorefrontCategoryNav — the category / navigation row shared by every
 * storefront theme.
 *
 * IMPORTANT: this component is the single source of navigation data. Themes
 * only change the `variant` (colors); they must NOT swap the underlying menu
 * items or categories. That keeps theme selection purely presentational and
 * prevents links to categories that do not exist for the active tenant (404).
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Menu,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutGrid,
  Sparkles,
  TrendingUp,
  Link as LinkIcon,
} from 'lucide-react';
import { useStorefrontCategories } from '@/hooks/use-storefront-categories';
import { useHeaderMenu } from '@/hooks/use-header-menu';
import type { CategoryTreeItem } from '@/services/storefrontService';
import type { StorefrontNavigationItem } from '@/types/api.types';
import { CategoryDropdown } from '@/components/storefront/navigation/CategoryDropdown';
import { CustomDropdown } from '@/components/storefront/navigation/CustomDropdown';
import { MegaMenu } from '@/components/storefront/navigation/MegaMenu';
import { CascadingMenu } from '@/components/storefront/navigation/CascadingMenu';

export type StorefrontNavVariant = 'default' | 'grocery';

interface VariantStyles {
  border: string;
  bg: string;
  allButton: string;
  arrow: string;
  link: string;
  activeLink: string;
}

const VARIANTS: Record<StorefrontNavVariant, VariantStyles> = {
  default: {
    border: 'border-gray-100 dark:border-gray-800',
    bg: 'bg-white/50 dark:bg-gray-950/50',
    allButton: 'bg-brand-600 hover:bg-brand-700',
    arrow: 'text-gray-500 hover:text-brand-600 dark:text-gray-400',
    link: 'text-gray-700 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800',
    activeLink: 'bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400',
  },
  grocery: {
    border: 'border-green-100 dark:border-gray-800',
    bg: 'bg-green-50/50 dark:bg-gray-950/50',
    allButton: 'bg-green-600 hover:bg-green-700',
    arrow: 'text-gray-500 hover:text-green-600 dark:text-gray-400',
    link: 'text-gray-700 hover:bg-green-50 hover:text-green-700 dark:text-gray-200 dark:hover:bg-green-950/30',
    activeLink: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  },
};

export function StorefrontCategoryNav({
  variant = 'default',
  scrolled = false,
}: {
  variant?: StorefrontNavVariant;
  scrolled?: boolean;
}) {
  const styles = VARIANTS[variant];
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);

  const { config: menu, ready: menuReady } = useHeaderMenu();
  const { categories } = useStorefrontCategories();

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

  const setMenuWithDelay = (id: string | null) => {
    if (menuTimer.current) clearTimeout(menuTimer.current);
    if (id) setActiveMenu(id);
    else menuTimer.current = setTimeout(() => setActiveMenu(null), 200);
  };

  const keepOpen = () => {
    if (menuTimer.current) clearTimeout(menuTimer.current);
  };

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

  // Render a category-based menu item with dropdown if display_mode is 'dropdown'
  const renderNavItem = (item: StorefrontNavigationItem) => {
    if (item.type === 'custom_link') {
      return (
        <Link
          key={item.id}
          href={item.url || '#'}
          target={item.open_in_new_tab ? '_blank' : undefined}
          rel={item.open_in_new_tab ? 'noopener noreferrer' : undefined}
          className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-sm font-semibold ${styles.link}`}
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
            className={`group flex cursor-pointer items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-sm font-semibold transition-all ${activeMenu === item.id ? styles.activeLink : styles.link}`}
          >
            {item.label}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeMenu === item.id ? 'rotate-180' : ''}`} />
          </button>
          {activeMenu === item.id && hasDropdownItems && menuAnchorRect && createPortal(
            <CustomDropdown
              item={item}
              style={{ top: menuAnchorRect.bottom, left: menuAnchorRect.left }}
              onClose={() => setMenuWithDelay(null)}
              onKeepOpen={keepOpen}
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
          className={`group flex items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-sm font-semibold transition-all ${activeMenu === item.id ? styles.activeLink : styles.link}`}
        >
          {item.label}
          {hasSubs && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeMenu === item.id ? 'rotate-180' : ''}`} />}
        </Link>
        {activeMenu === item.id && hasSubs && cat && menuAnchorRect && createPortal(
          <CategoryDropdown cat={cat} style={{ top: menuAnchorRect.bottom, left: menuAnchorRect.left }} onClose={() => setMenuWithDelay(null)} onKeepOpen={keepOpen} />,
          document.body
        )}
      </div>
    );
  };

  return (
    <nav
      className={`relative hidden border-t ${styles.border} ${styles.bg} backdrop-blur-sm lg:block ${scrolled ? 'hidden' : ''}`}
      onMouseLeave={() => setMenuWithDelay(null)}
    >
      <div className="mx-auto flex max-w-screen-2xl items-center gap-1 px-4">
        {menuReady ? (
          <>
            {/* All Categories button */}
            {(menu.mega_menu_config?.enabled === true) && (
              <div className="relative" onMouseEnter={() => setMenuWithDelay('all')}>
                <button className={`flex items-center gap-2.5 px-5 py-3 text-sm font-bold text-white transition-colors ${styles.allButton}`}>
                  <Menu className="h-4 w-4" />
                  All Categories
                  <ChevronDown className={`h-4 w-4 transition-transform ${activeMenu === 'all' ? 'rotate-180' : ''}`} />
                </button>
                {activeMenu === 'all' && menu.mega_menu_config?.display_style === 'cascading' && (
                  <CascadingMenu onClose={() => setMenuWithDelay(null)} onKeepOpen={keepOpen} />
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
                  className={`absolute left-0 z-10 flex h-full items-center bg-linear-to-r from-white via-white to-transparent pl-1 pr-4 dark:from-gray-950 dark:via-gray-950 ${styles.arrow}`}
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
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-sm font-semibold ${styles.link}`}
                >
                  <Home className="h-3.5 w-3.5" />
                  Home
                </Link>
                <Link
                  href="/store/products"
                  onMouseEnter={() => setMenuWithDelay(null)}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-sm font-semibold ${styles.link}`}
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
                        <Link href={`/store/category/${cat.slug}`} className={`group flex items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-sm font-semibold transition-all ${activeMenu === cat.id ? styles.activeLink : styles.link}`}>
                          {cat.name}
                          {hasSubs && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeMenu === cat.id ? 'rotate-180' : ''}`} />}
                        </Link>
                        {activeMenu === cat.id && hasSubs && menuAnchorRect && createPortal(
                          <CategoryDropdown cat={cat} style={{ top: menuAnchorRect.bottom, left: menuAnchorRect.left }} onClose={() => setMenuWithDelay(null)} onKeepOpen={keepOpen} />,
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
                  className={`absolute right-0 z-10 flex h-full items-center bg-linear-to-l from-white via-white to-transparent pl-4 pr-1 dark:from-gray-950 dark:via-gray-950 ${styles.arrow}`}
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
        <MegaMenu onClose={() => setMenuWithDelay(null)} onKeepOpen={keepOpen} />
      )}
    </nav>
  );
}

export default StorefrontCategoryNav;
