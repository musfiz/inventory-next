'use client';

import { SlidersHorizontal, Star, X } from 'lucide-react';
import type { Brand } from '@/types/storefront';
import type { CategoryTreeItem } from '@/services/storefrontService';

export const PRICE_STEPS = [
  { id: 'all', label: 'All prices', min: 0, max: Infinity },
  { id: 'under-200', label: 'Under ৳200', min: 0, max: 200 },
  { id: '200-500', label: '৳200 – ৳500', min: 200, max: 500 },
  { id: '500-1000', label: '৳500 – ৳1,000', min: 500, max: 1000 },
  { id: '1000-2000', label: '৳1,000 – ৳2,000', min: 1000, max: 2000 },
  { id: 'over-2000', label: 'Over ৳2,000', min: 2000, max: Infinity },
] as const;

export const RATING_STEPS = [4, 3, 2, 1];

export interface ProductFilterFieldsProps {
  categories?: CategoryTreeItem[];
  selectedCategoryIds?: string[];
  onToggleCategory?: (id: string) => void;

  brands: Brand[];
  selectedBrandIds: string[];
  onToggleBrand: (id: string) => void;

  priceStep: string;
  onPriceStepChange: (id: string) => void;

  minRating: number;
  onMinRatingChange: (rating: number) => void;

  inStockOnly: boolean;
  onInStockChange: (value: boolean) => void;

  activeFilterCount: number;
  onClearAll: () => void;
}

/** Prop-driven filter controls shared by every storefront product-listing page. */
export function ProductFilterFields({
  categories,
  selectedCategoryIds = [],
  onToggleCategory,
  brands,
  selectedBrandIds,
  onToggleBrand,
  priceStep,
  onPriceStepChange,
  minRating,
  onMinRatingChange,
  inStockOnly,
  onInStockChange,
  activeFilterCount,
  onClearAll,
}: ProductFilterFieldsProps) {
  return (
    <div className="space-y-7">
      {categories && onToggleCategory && (
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
            Category
          </p>
          <ul className="space-y-2">
            {categories.map(c => {
              const children = c.children ?? [];
              return (
                <li key={c.id}>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      className="sf-check"
                      checked={selectedCategoryIds.includes(c.id)}
                      onChange={() => onToggleCategory(c.id)}
                    />
                    {c.name}
                    {typeof c.productCount === 'number' && (
                      <span className="text-xs text-gray-400">({c.productCount})</span>
                    )}
                  </label>
                  {children.length > 0 && selectedCategoryIds.includes(c.id) && (
                    <ul className="ml-6 mt-2 space-y-2">
                      {children.map(cc => (
                        <li key={cc.id}>
                          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <input
                              type="checkbox"
                              className="sf-check"
                              checked={selectedCategoryIds.includes(cc.id)}
                              onChange={() => onToggleCategory(cc.id)}
                            />
                            {cc.name}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Price
        </p>
        <ul className="space-y-2">
          {PRICE_STEPS.map(s => (
            <li key={s.id}>
              <label
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  priceStep === s.id
                    ? 'text-gray-900 outline outline-2 outline-brand-500 dark:text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="price"
                  className="sf-check"
                  checked={priceStep === s.id}
                  onChange={() => onPriceStepChange(s.id)}
                />
                {s.label}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Rating
        </p>
        <ul className="space-y-2">
          <li>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="rating"
                className="sf-check"
                checked={minRating === 0}
                onChange={() => onMinRatingChange(0)}
              />
              Any rating
            </label>
          </li>
          {RATING_STEPS.map(r => (
            <li key={r}>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="rating"
                  className="sf-check"
                  checked={minRating === r}
                  onChange={() => onMinRatingChange(r)}
                />
                <span className="inline-flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < r ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'}`}
                    />
                  ))}
                </span>
                & up
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Brand
        </p>
        {brands.length === 0 ? (
          <p className="text-xs text-gray-400">No brands available</p>
        ) : (
          <ul className="max-h-60 space-y-2 overflow-auto scrollbar-thin">
            {brands.map(b => (
              <li key={b.id}>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    className="sf-check"
                    checked={selectedBrandIds.includes(b.id)}
                    onChange={() => onToggleBrand(b.id)}
                  />
                  {b.name}
                  {typeof b.productCount === 'number' && (
                    <span className="text-xs text-gray-400">({b.productCount})</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Availability
        </p>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            className="sf-check"
            checked={inStockOnly}
            onChange={() => onInStockChange(!inStockOnly)}
          />
          In stock only
        </label>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={onClearAll}
          className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Clear all filters ({activeFilterCount})
        </button>
      )}
    </div>
  );
}

/** Desktop sticky sidebar wrapper. */
export function FilterSidebar(props: ProductFilterFieldsProps) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-32 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </h2>
        <ProductFilterFields {...props} />
      </div>
    </aside>
  );
}

/** Mobile slide-over drawer wrapper. */
export function FilterDrawer({
  open,
  onClose,
  resultCount,
  ...fieldProps
}: ProductFilterFieldsProps & { open: boolean; onClose: () => void; resultCount: number }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto bg-white p-5 sf-slide-in-left dark:bg-gray-950">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ProductFilterFields {...fieldProps} />
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700"
        >
          Show {resultCount} results
        </button>
      </div>
    </div>
  );
}
