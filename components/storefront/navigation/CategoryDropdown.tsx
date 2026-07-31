'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { CategoryTreeItem } from '@/services/storefrontService';

export const CategoryDropdown = ({ cat, onClose, onKeepOpen }: { cat: CategoryTreeItem; onClose: () => void; onKeepOpen: () => void }) => {
  const children = cat.children ?? [];
  if (children.length === 0) return null;

  return (
    <div
      className="absolute left-0 top-full z-40 mt-0 w-56 overflow-hidden border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 sf-fade-in"
      onMouseEnter={onKeepOpen}
      onMouseLeave={onClose}
    >
      <div className="p-2">
        <Link href={`/store/category/${cat.slug}`} onClick={onClose} className="flex items-center gap-2 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-brand-600 transition-all hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/30">
          View all {cat.name} <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="border-t border-gray-100 p-2 dark:border-gray-800">
        {children.map(sub => {
          const grandChildren = sub.children ?? [];
          return (
            <li key={sub.id}>
              <Link href={`/store/category/${sub.slug}`} onClick={onClose} className="block rounded-none px-3 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-brand-50 hover:text-brand-700 dark:text-gray-300 dark:hover:bg-brand-950/30">
                {sub.name}
              </Link>
              {grandChildren.length > 0 && (
                <ul className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-3 dark:border-gray-800">
                  {grandChildren.map(grandChild => (
                    <li key={grandChild.id}>
                      <Link href={`/store/category/${grandChild.slug}`} onClick={onClose} className="block px-3 py-1.5 text-xs text-gray-500 transition-colors hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400">{grandChild.name}</Link>
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
