'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Sparkles, X, ChevronDown, Package, Heart, User, Link as LinkIcon } from 'lucide-react';
import { useHeaderMenu } from '@/hooks/use-header-menu';
import { useStorefrontCategories } from '@/hooks/use-storefront-categories';
import type { StorefrontNavigationItem } from '@/types/api.types';

export const MobileMenu = ({ open, onClose, headerLogo, ready }: { open: boolean; onClose: () => void; headerLogo: string | null; ready: boolean }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { config: menu, ready: menuReady } = useHeaderMenu();
  const { categories } = useStorefrontCategories();
  if (!open) return null;

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
              // Fallback: render dynamic categories from API
              categories.map(cat => {
                const subs = cat.children ?? [];
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
