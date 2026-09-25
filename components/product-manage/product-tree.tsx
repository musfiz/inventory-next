'use client';

import { ChevronRight, ChevronDown, Package, Search, X, Plus, RefreshCw, Maximize2, Minimize2, Tag, Loader2, Store, Hash } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import BusinessTypeSelect from '@/components/ui/business-type-select';
import TenantSelect from '@/components/ui/tenant-select';
import { usePermissions } from '@/hooks/use-permissions';
import { useProducts } from '@/services/queries/useProducts';
import { useProductVariations } from '@/services/queries/useProductVariations';
import { useAuthStore } from '@/stores/auth-store';
import type { Product } from '@/types/api.types';

interface ProductTreePanelProps {
  businessTypeId: number | null;
  onBusinessTypeChange: (id: number | null) => void;
  /** Tenant scope for warehouse selection — super admin only picks one explicitly. */
  tenantId?: string | null;
  onTenantChange?: (id: string | null) => void;
  selectedProductId: string | null;
  onSelectProduct: (id: string | null) => void;
  onAddProduct: () => void;
  onRefresh?: () => void;
  canCreate: boolean;
  formErrors?: Record<string, string>;
  onTenantErrorClear?: () => void;
}

const noopTenantChange = (_id?: string | null) => { /* tenant change handled by parent */ };

/**
 * Compute total stock across all stock rows for a variation.
 */
function getVariationStock(v: any): number {
  // variations from useProductVariations may have stocks[] or a single stock
  if (Array.isArray(v.stocks)) {
    return v.stocks.reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0);
  }
  if (v.stock) return Number(v.stock.quantity) || 0;
  return 0;
}

/**
 * Format stock display for a variation row.
 */
function StockBadge({ quantity }: { quantity: number }) {
  if (quantity === 0) {
    return <span className="px-1 py-0.5 rounded text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Out of Stock</span>;
  }
  if (quantity <= 10) {
    return <span className="px-1 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Low: {quantity}</span>;
  }
  return <span className="px-1 py-0.5 rounded text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">In Stock: {quantity}</span>;
}

export function ProductTreePanel({
  businessTypeId,
  onBusinessTypeChange,
  tenantId,
  onTenantChange = noopTenantChange,
  selectedProductId,
  onSelectProduct,
  onAddProduct,
  onRefresh,
  canCreate,
  formErrors = {},
  onTenantErrorClear,
}: ProductTreePanelProps) {
  const handleTenantChange = (id?: string | null) => onTenantChange(id ?? null);
  const { isSuperAdmin, isHydrated } = usePermissions();
  const user = useAuthStore(s => s.user);
  const tenantBusinessTypeId = user?.tenant?.business_type?.id ?? null;
  const effectiveBtId = isSuperAdmin ? businessTypeId : tenantBusinessTypeId;

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: products = [], isLoading: loading } = useProducts(effectiveBtId, debounced, isHydrated);

  // Reset expansion when the scope changes.
  useEffect(() => { setExpanded(new Set()); }, [effectiveBtId]);

  const handleToggle = (productId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleSelect = (productId: string) => {
    onSelectProduct(productId);
  };

  const handleSelectAll = () => {
    onSelectProduct(null);
    setExpanded(new Set());
  };

  const expandAll = () => {
    const productIds = new Set(filteredProducts.map(p => String(p.id)));
    setExpanded(productIds);
  };
  const collapseAll = () => setExpanded(new Set());

  // Filter products by search (name, category, or variation brand name)
  const filteredProducts = useMemo(() => {
    if (!debounced) return products;
    const q = debounced.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p as Product & { sku?: string }).sku?.toLowerCase().includes(q) ||
      (p.category?.name || '').toLowerCase().includes(q) ||
      (p as Product & { variations?: Array<{ brand?: { name?: string } }> }).variations?.some(
        v => v.brand?.name?.toLowerCase().includes(q)
      ) || false
    );
  }, [products, debounced]);

  // Sort products alphabetically A-Z by name
  const sortedProducts = useMemo(
    () => [...filteredProducts].sort((a, b) => a.name.localeCompare(b.name)),
    [filteredProducts]
  );

  const totalProducts = filteredProducts.length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Business Type selector — above tree */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
        {/* Tenant selector — super admin only */}
        {isSuperAdmin && (
          <div>
            <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Tenant</label>
            <TenantSelect
              value={tenantId}
              onChange={(o) => {
                handleTenantChange(o);
                if (o && formErrors.tenant && onTenantErrorClear) onTenantErrorClear();
              }}
              placeholder="Select tenant"
              compact
              isClearable
              isInvalid={!!formErrors.tenant}
            />
            {formErrors.tenant && (
              <p className="text-red-600 text-xs mt-1">{formErrors.tenant}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Business Type</label>
          {isSuperAdmin ? (
            <BusinessTypeSelect
              value={businessTypeId}
              onChange={onBusinessTypeChange}
              placeholder="All business types"
              isClearable
              className="w-full"
              compact
            />
          ) : (
            <div className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 truncate">
              {user?.tenant?.business_type?.name || '—'}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-indigo-600" /> Products
            <span className="text-xs font-normal text-gray-500">· {totalProducts}</span>
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={expandAll} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Expand all"><Maximize2 className="w-3.5 h-3.5" /></button>
            <button onClick={collapseAll} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Collapse all"><Minimize2 className="w-3.5 h-3.5" /></button>
            <button onClick={onRefresh} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products, brands..."
            className="w-full pl-7 pr-8 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); onRefresh?.(); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSelectAll}
            className={`flex-1 text-xs px-2 py-1 rounded border ${selectedProductId === null ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50'}`}
          >
            All
          </button>
          {canCreate && (
            <button onClick={onAddProduct} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-3 h-3" /> New Product
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-1 scrollbar-thin">
        {loading ? (
          <div className="p-4 flex items-center justify-center gap-2 text-xs text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
        ) : !effectiveBtId ? (
          <div className="p-4 text-center text-xs text-gray-500">
            Select a business type to view products.
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500">
            No products found.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {sortedProducts.map(product => (
              <ProductNode
                key={String(product.id)}
                product={product}
                isSelected={selectedProductId === String(product.id)}
                isExpanded={expanded.has(String(product.id))}
                onToggle={() => handleToggle(String(product.id))}
                onSelect={() => handleSelect(String(product.id))}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        {totalProducts} products {effectiveBtId ? '' : '· select business type'}
      </div>
    </div>
  );
}

/**
 * Product node — shows product name with variation count.
 * Click to select the product (opens detail panel).
 * Expand to see variations: "BrandName - VariationName" with stock + status.
 */
function ProductNode({
  product,
  isSelected,
  isExpanded,
  onToggle,
  onSelect,
}: {
  product: Product;
  isSelected: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const pid = String(product.id);
  const { data: variations = [], isLoading: isLoadingVar } = useProductVariations(isExpanded ? pid : null);

  // Backend provides variations_count via withCount — no need to expand
  const variationCount = (product as any).variations_count ?? (product as any).variations?.length ?? 0;

  return (
    <li>
      <div
        className={`group flex items-center gap-1 px-1.5 py-1.5 rounded text-xs cursor-pointer select-none border ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-transparent'}`}
        onClick={onSelect}
      >
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 shrink-0"
          title={isExpanded ? 'Collapse variations' : 'Expand variations'}
        >
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <Package className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        <span className="truncate flex-1 font-medium" title={product.name}>{product.name}</span>
        {variationCount > 0 ? (
          <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-1">
            {variationCount} {variationCount === 1 ? 'var' : 'vars'}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400 ml-1">no vars</span>
        )}
      </div>
      {isExpanded && (
        <ul className="ml-5 border-l border-gray-200 dark:border-gray-700 pl-2 mt-0.5">
          {isLoadingVar ? (
            <li className="px-2 py-1 text-[11px] text-gray-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</li>
          ) : variations.length === 0 ? (
            <li className="px-2 py-1 text-[11px] text-gray-400">No variations</li>
          ) : (
            variations.map(v => {
              const brandName = (v as any).brand?.name || '';
              const displayName = brandName
                ? `${brandName} - ${v.name || v.sku}`
                : v.name || v.sku;
              const stock = getVariationStock(v);

              return (
                <li
                  key={String(v.id)}
                  className="flex items-center gap-1.5 px-2 py-0.5 leading-tight rounded text-[11px] hover:bg-gray-50 dark:hover:bg-gray-700/40 text-gray-600 dark:text-gray-400"
                  title={`${displayName} — Stock: ${stock}`}
                >
                  <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="truncate flex-1">{displayName}</span>
                  <StockBadge quantity={stock} />
                  <span className={`px-1 py-0.5 rounded text-[10px] shrink-0 ${v.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {v.is_active ? 'Act' : 'Inact'}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </li>
  );
}
