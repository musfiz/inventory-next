'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { IoCartSharp } from 'react-icons/io5';
import { useStorefrontCategoriesStore } from '@/stores/storefront-categories-store';
import { useHeaderMenu } from '@/hooks/use-header-menu';
import type { CategoryTreeItem } from '@/services/storefrontService';
import type { MegaMenuItem } from '@/types/api.types';

/**
 * CascadingMenu — "All Categories" flyout that reveals nested category levels
 * one column at a time (level 1 groups → level 2 categories → level 3 sub-categories),
 * driven by the same mega_menu_config.items used by MegaMenu. Anchored to the
 * left, under the trigger button, with a flat, dense layout so long category
 * lists stay scannable without excess whitespace.
 */
export const CascadingMenu = ({ onClose, onKeepOpen }: { onClose: () => void; onKeepOpen: () => void }) => {
  // Read-only — StorefrontHeader already fetches categories once per session.
  const categories = useStorefrontCategoriesStore((s) => s.categories);
  const loading = useStorefrontCategoriesStore((s) => s.loading);
  const { config: menu } = useHeaderMenu();
  const megaConfig = menu.mega_menu_config;
  const [activeGroup, setActiveGroup] = useState<MegaMenuItem | null>(null);
  const [activePath, setActivePath] = useState<CategoryTreeItem[]>([]);

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

  const sortedGroups = useMemo(() => {
    if (!megaConfig?.items) return [];
    return [...megaConfig.items].sort((a, b) => a.sort_order - b.sort_order);
  }, [megaConfig]);

  // ── Early returns (safe — all hooks above) ──
  if (loading) return null;
  if (categories.length === 0) return null;
  if (megaConfig?.enabled !== true) return null;
  if (sortedGroups.length === 0) return null;

  const showProductCount = megaConfig?.show_product_count ?? false;
  const groupCategories = activeGroup
    ? (activeGroup.category_ids.map(id => categoryMap.get(id)).filter(Boolean) as CategoryTreeItem[])
    : [];

  const handleClose = () => {
    setActiveGroup(null);
    setActivePath([]);
    onClose();
  };

  // Categories shown in the deepest active column — nothing beyond the group
  // labels until a group is hovered, then its children cascade to the right.
  const visibleColumns: CategoryTreeItem[][] = activeGroup
    ? [groupCategories, ...activePath.map(cat => cat.children ?? [])]
    : [];

  return (
    <div
      className="absolute left-0 top-full z-40 flex overflow-hidden border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 sf-fade-in"
      onMouseEnter={onKeepOpen}
      onMouseLeave={onClose}
    >
      {/* Level 0 — group list (parent items from mega_menu_config) */}
      <ul className="max-h-[70vh] w-52 shrink-0 overflow-y-auto border-r border-gray-100 py-1 dark:border-gray-800">
        {sortedGroups.map(group => {
          const isActive = activeGroup?.id === group.id;
          return (
            <li key={group.id}>
              <button
                onMouseEnter={() => { setActiveGroup(group); setActivePath([]); }}
                className={`group flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm font-medium transition-colors ${isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900'
                  }`}
              >
                <span className="truncate">{group.name}</span>
                <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-brand-500' : 'text-gray-300 group-hover:text-gray-400'}`} />
              </button>
            </li>
          );
        })}
        <li className="border-t border-gray-100 dark:border-gray-800">
          <Link href="/store/products" onClick={handleClose} className="flex items-center justify-between gap-1.5 px-3 py-2 text-xs font-semibold text-gray-900 transition-colors hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-900">
            <span>Browse all products</span>
            <IoCartSharp className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          </Link>
        </li>
      </ul>

      {/* Cascading levels — each column reveals children of the hovered category */}
      {visibleColumns.map((cats, colIdx) => (
        cats.length > 0 && (
          <ul
            key={colIdx}
            className="sf-cascade-in max-h-[70vh] w-52 shrink-0 overflow-y-auto border-r border-gray-100 py-1 last:border-r-0 dark:border-gray-800"
            style={{ animationDelay: `${colIdx * 40}ms` }}
          >
            {cats.map(cat => {
              const hasChildren = (cat.children?.length ?? 0) > 0;
              const isActive = activePath[colIdx]?.id === cat.id;
              return (
                <li key={cat.id}>
                  <div
                    className={`group flex items-center justify-between transition-colors ${isActive
                      ? 'bg-brand-50 dark:bg-brand-950/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    onMouseEnter={() => setActivePath(prev => [...prev.slice(0, colIdx), cat])}
                  >
                    <Link
                      href={`/store/category/${cat.slug}`}
                      onClick={handleClose}
                      className={`flex-1 truncate px-3 py-1.5 text-sm ${isActive ? 'font-medium text-brand-700 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      {cat.name}
                      {showProductCount && (
                        <span className="ml-1.5 text-[10px] font-normal text-gray-400">({cat.productCount ?? 0})</span>
                      )}
                    </Link>
                    {hasChildren && (
                      <ChevronRight className={`mr-3 h-3.5 w-3.5 shrink-0 ${isActive ? 'text-brand-500' : 'text-gray-300 group-hover:text-gray-400'}`} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ))}
    </div>
  );
};
