'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { IoCartSharp } from 'react-icons/io5';
import { useStorefrontCategoriesStore } from '@/stores/storefront-categories-store';
import { useHeaderMenu } from '@/hooks/use-header-menu';
import type { CategoryTreeItem } from '@/services/storefrontService';

export const MegaMenu = ({ onClose, onKeepOpen }: { onClose: () => void; onKeepOpen: () => void }) => {
  // Read-only — StorefrontHeader already fetches categories once per session.
  const categories = useStorefrontCategoriesStore((s) => s.categories);
  const loading = useStorefrontCategoriesStore((s) => s.loading);
  const { config: menu } = useHeaderMenu();
  const megaConfig = menu.mega_menu_config;

  // ── All hooks MUST be before any early return ──
  const categoryMap = useMemo(() => {
    const map = new Map<string, CategoryTreeItem>();
    const walk = (items: CategoryTreeItem[]) => {
      for (const item of items) {
        map.set(item.id, item);
        if (item.children) walk(item.children);
      }
    };
    walk(categories);
    return map;
  }, [categories]);

  const sortedItems = useMemo(() => {
    if (!megaConfig?.items) return [];
    return [...megaConfig.items].sort((a, b) => a.sort_order - b.sort_order);
  }, [megaConfig]);

  // ── Early returns (safe — all hooks above) ──
  if (loading) return null;
  if (categories.length === 0) return null;
  if (megaConfig?.enabled !== true) return null;
  if (sortedItems.length === 0) return null;

  const colCount = megaConfig?.columns && megaConfig.columns > 0
    ? Math.min(megaConfig.columns, 6)
    : Math.min(sortedItems.length, 4);
  const showProductCount = megaConfig?.show_product_count ?? false;

  const renderCategoryTree = (cat: CategoryTreeItem, depth: number) => {
    const children = cat.children ?? [];
    return (
      <div key={cat.id}>
        <Link
          href={`/store/category/${cat.slug}`}
          onClick={onClose}
          className={`group flex items-center gap-1 transition-colors ${depth === 0
              ? 'text-xs font-medium text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400'
              : 'text-[11px] text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
        >
          <span>{cat.name}</span>
          {showProductCount && (
            <span className="text-[10px] text-gray-300 group-hover:text-inherit">({cat.productCount ?? 0})</span>
          )}
        </Link>
        {children.length > 0 && (
          <div className={`space-y-0.5 ${depth === 0
              ? 'mt-1'
              : 'ml-2 mt-0.5 pl-2 border-l-[1.5px] border-gray-100 dark:border-gray-800'
            }`}>
            {children.map(child => renderCategoryTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="absolute left-0 right-0 top-full z-40 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 sf-fade-in"
      onMouseEnter={onKeepOpen}
      onMouseLeave={onClose}
    >
      <div className="mx-auto max-w-7xl px-5 py-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">All Categories</p>
        <div className="grid gap-x-6 gap-y-5" style={{ gridTemplateColumns: `repeat(${Math.min(colCount, 6)}, 1fr)` }}>
          {sortedItems.map(item => {
            const span = item.columns ?? 1;
            const assigned = item.category_ids
              .map(id => categoryMap.get(id))
              .filter(Boolean) as CategoryTreeItem[];

            return (
              <div key={item.id} style={{ gridColumn: `span ${Math.min(span, colCount)}` }}>
                {/* Parent header — accent bar */}
                <div className="mb-2 border-l-[3px] border-brand-500 pl-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                    {item.name}
                  </h3>
                </div>

                {/* Category tree */}
                {assigned.length === 0 ? (
                  <p className="pl-2 text-[11px] italic text-gray-400">No categories</p>
                ) : (
                  <div className="space-y-1.5 pl-2">
                    {assigned.map(cat => renderCategoryTree(cat, 0))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Link href="/store/products" onClick={onClose} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900 transition-colors hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-400">
            Browse all products <IoCartSharp className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
