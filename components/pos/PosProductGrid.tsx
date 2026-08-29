'use client';

import { Search, Barcode, Plus, AlertCircle, Package, XCircle } from 'lucide-react';
import Spinner from '@/components/ui/spinner';
import type { Product, PosCategory } from './pos-types';

interface PosProductGridProps {
  products: Product[];
  filteredProducts: Product[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  selectedCategory: number | 'all';
  setSelectedCategory: (v: number | 'all') => void;
  categories: PosCategory[];
  productsLoading: boolean;
  productsError: string | null;
  addToCart: (product: Product) => void;
  loadProducts: (categoryId?: number, search?: string, tenantId?: string | number) => void;
  loadCategories: (tenantId?: string | number) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function PosProductGrid({
  products,
  filteredProducts,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  productsLoading,
  productsError,
  addToCart,
  loadProducts,
  loadCategories,
  searchInputRef,
}: PosProductGridProps) {
  return (
    <div className="w-[45%] flex flex-col border-r-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Search Bar - Fixed */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name, SKU, or barcode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {productsLoading ? (
            <Spinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2" />
          ) : searchQuery ? (
            <button
              onClick={() => { setSearchQuery(''); const catId = selectedCategory === 'all' ? undefined : selectedCategory; loadProducts(catId, searchQuery || undefined); searchInputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title="Clear search"
            >
              <XCircle className="w-4 h-4" />
            </button>
          ) : (
            <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Category Chips - Fixed */}
      <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto shrink-0 bg-white dark:bg-gray-900">
        <div className="flex gap-2">
          <button
            onClick={() => { setSelectedCategory('all'); loadProducts(undefined, searchQuery || undefined); }}
            className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${selectedCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); loadProducts(cat.id, searchQuery || undefined); }}
              className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${selectedCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0 overscroll-contain scrollbar-thin">
        {productsError && !productsLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-red-500 dark:text-red-400">
            <AlertCircle className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium mb-1">Failed to load products</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center px-4">{productsError}</p>
            <button
              onClick={() => { loadProducts(selectedCategory === 'all' ? undefined : selectedCategory, searchQuery || undefined); }}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        ) : productsLoading ? (
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2 animate-pulse">
                <div className="aspect-square mb-1.5 bg-gray-200 dark:bg-gray-700 rounded-md" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-1" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-2">
              {filteredProducts.map(product => {
                const stockStatus =
                  !product.stock || product.stock === 0
                    ? 'out'
                    : product.stock < 10
                      ? 'low'
                      : 'in';

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={stockStatus === 'out'}
                    className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute top-1 right-1 z-10">
                      {stockStatus === 'in' && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="In Stock" />
                      )}
                      {stockStatus === 'low' && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                          <AlertCircle className="w-3 h-3" />
                          Low
                        </div>
                      )}
                      {stockStatus === 'out' && (
                        <div className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded">
                          Out
                        </div>
                      )}
                    </div>

                    <div className="aspect-square mb-1.5 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden relative">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.product_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg></div>';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {product.images && product.images.length > 1 && (
                      <div className="flex items-center gap-0.5 mb-1">
                        {product.images.slice(0, 4).map((img, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden border border-gray-200 dark:border-gray-700"
                          >
                            <img
                              src={img}
                              alt={`${product.product_name} ${i}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-left">
                      <h3 title={product.product_name} className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 mb-0.5">
                        {product.product_name}
                      </h3>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium line-clamp-1 mb-0.5">
                        {product.variant_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        SKU: {product.sku}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          ৳{product.selling_price.toFixed(2)}
                        </span>
                        <Plus className="w-3.5 h-3.5 text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Package className="w-16 h-16 mb-3" />
                <p className="text-sm">No products found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}