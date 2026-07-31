'use client';

import Link from 'next/link';
import type { StorefrontNavigationItem } from '@/types/api.types';

/**
 * CustomDropdown — renders a dropdown menu with user-assigned categories
 * (from admin StorefrontNavigation → dropdown_items).
 */
export const CustomDropdown = ({
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
      className="absolute left-0 top-full z-40 mt-0 w-56 overflow-hidden border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 sf-fade-in"
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
