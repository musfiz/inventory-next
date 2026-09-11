'use client';

import { ChevronRight, ChevronDown, Package, Search, Plus, RefreshCw, Maximize2, Minimize2, Tag, Loader2, Store } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import BusinessTypeSelect from '@/components/ui/business-type-select';
import TenantSelect from '@/components/ui/tenant-select';
import { usePermissions } from '@/hooks/use-permissions';
import { useProducts } from '@/services/queries/useProducts';
import { useProductVariations } from '@/services/queries/useProductVariations';
import { useBrandsByBusinessType } from '@/services/queries/useBrandsByBusinessType';
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
}

const noopTenantChange = (_id?: string | null) => { /* tenant change handled by parent */ };

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
}: ProductTreePanelProps) {
  // onTenantChange accepts the optional-param form TenantSelect passes.
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

  // Gated on hydration: no request fires with a wrong/null business type
  // before auth resolves (Issue 1). The key contains (bt, search), so scope
  // or search changes refetch automatically — no refreshKey plumbing needed.
  const { data: products = [], isLoading: loading } = useProducts(effectiveBtId, debounced, isHydrated);

  // Brands loaded by business type — only when business type is selected
  const { data: brands = [], isLoading: loadingBrands } = useBrandsByBusinessType(effectiveBtId, isHydrated && !!effectiveBtId);

  // Reset expansion when the scope changes.
  useEffect(() => { setExpanded(new Set()); }, [effectiveBtId]);

  const handleToggle = (brandId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(brandId)) next.delete(brandId);
      else next.add(brandId);
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
    const brandIds = new Set(brandGroups.map(g => g.brandId));
    setExpanded(brandIds);
  };
  const collapseAll = () => setExpanded(new Set());

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!debounced) return products;
    const q = debounced.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p as Product & { sku?: string }).sku?.toLowerCase().includes(q) ||
      (p.category?.name || '').toLowerCase().includes(q) ||
      (p.brand?.name || '').toLowerCase().includes(q)
    );
  }, [products, debounced]);

  // Group products by brand
  const brandGroups = useMemo(() => {
    const groupMap = new Map<string, { brandId: string; brandName: string; products: Product[] }>();

    // Initialize brands from API
    brands.forEach(brand => {
      groupMap.set(String(brand.id), {
        brandId: String(brand.id),
        brandName: brand.name,
        products: [],
      });
    });

    // Group filtered products by brand
    filteredProducts.forEach(product => {
      const brandId = product.brand_id ? String(product.brand_id) : 'unassigned';
      const brandName = product.brand?.name || 'Unassigned';

      if (!groupMap.has(brandId)) {
        groupMap.set(brandId, {
          brandId,
          brandName,
          products: [],
        });
      }
      groupMap.get(brandId)!.products.push(product);
    });

    // Sort: brands with products first, then alphabetical
    return Array.from(groupMap.values())
      .filter(g => g.brandId !== 'unassigned' || g.products.length > 0)
      .sort((a, b) => {
        if (a.products.length > 0 && b.products.length === 0) return -1;
        if (a.products.length === 0 && b.products.length > 0) return 1;
        return a.brandName.localeCompare(b.brandName);
      });
  }, [brands, filteredProducts]);

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
              onChange={handleTenantChange}
              placeholder="Select tenant"
              compact
              isClearable
            />
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
            <Store className="w-4 h-4 text-indigo-600" /> Brands
            <span className="text-xs font-normal text-gray-500">· {brandGroups.length}</span>
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
            placeholder="Search products or brands..."
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
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
        {loading || loadingBrands ? (
          <div className="p-4 flex items-center justify-center gap-2 text-xs text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
        ) : !effectiveBtId ? (
          <div className="p-4 text-center text-xs text-gray-500">
            Select a business type to view brands and products.
          </div>
        ) : brandGroups.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500">
            No brands or products found.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {brandGroups.map(group => (
              <BrandTreeNode
                key={group.brandId}
                brandId={group.brandId}
                brandName={group.brandName}
                products={group.products}
                isSelected={selectedProductId !== null && group.products.some(p => String(p.id) === selectedProductId)}
                isExpanded={expanded.has(group.brandId)}
                onToggle={() => handleToggle(group.brandId)}
                onSelectProduct={handleSelect}
                selectedProductId={selectedProductId}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        {totalProducts} products · {brandGroups.length} brands {effectiveBtId ? '' : '· select business type'}
      </div>
    </div>
  );
}

/**
 * Brand node — shows brand name with summary (product count, variation count).
 * When expanded, shows product nodes with their variations.
 */
function BrandTreeNode({
  brandId,
  brandName,
  products,
  isSelected,
  isExpanded,
  onToggle,
  onSelectProduct,
  selectedProductId,
}: {
  brandId: string;
  brandName: string;
  products: Product[];
  isSelected: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectProduct: (id: string) => void;
  selectedProductId: string | null;
}) {
  // Count products and variations
  const productCount = products.length;

  return (
    <li>
      <div
        className={`group flex items-center gap-1 px-1.5 py-1.5 rounded text-xs cursor-pointer select-none border ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-transparent'}`}
        onClick={onToggle}
      >
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 shrink-0"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <Store className="w-3.5 h-3.5 text-purple-500 shrink-0" />
        <span className="truncate flex-1 font-medium" title={brandName}>{brandName}</span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-1">
          {productCount} {productCount === 1 ? 'product' : 'products'}
        </span>
      </div>
      {isExpanded && (
        <ul className="ml-5 border-l border-gray-200 dark:border-gray-700 pl-2 mt-0.5">
          {products.length === 0 ? (
            <li className="px-2 py-1 text-[11px] text-gray-400">No products</li>
          ) : (
            products.map(product => (
              <ProductVariationNode
                key={String(product.id)}
                product={product}
                isSelected={selectedProductId === String(product.id)}
                onSelect={() => onSelectProduct(String(product.id))}
              />
            ))
          )}
        </ul>
      )}
    </li>
  );
}

/**
 * Product node with variations — click to select product,
 * expand to see variation names.
 */
function ProductVariationNode({
  product,
  isSelected,
  onSelect,
}: {
  product: Product;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const pid = String(product.id);
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: variations = [], isLoading: isLoadingVar } = useProductVariations(isExpanded ? pid : null);

  const hasVariations = variations.length > 0;

  return (
    <li>
      <div
        className={`group flex items-center gap-1 px-1.5 py-1 rounded text-xs cursor-pointer select-none border ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-transparent'}`}
        onClick={onSelect}
      >
        <button
          onClick={e => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 shrink-0"
          title={isExpanded ? 'Collapse' : 'Expand variations'}
        >
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <Package className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        <span className="truncate flex-1" title={product.name}>{product.name}</span>
        {hasVariations && product.status && (
          <span className={`ml-1 px-1 py-0.5 rounded text-[10px] leading-none ${product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {product.status}
          </span>
        )}
        {!hasVariations && (
          <span className="ml-1 text-[10px] text-gray-400">no variations</span>
        )}
      </div>
      {isExpanded && (
        <ul className="ml-5 border-l border-gray-200 dark:border-gray-700 pl-2 mt-0.5">
          {isLoadingVar ? (
            <li className="px-2 py-1 text-[11px] text-gray-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</li>
          ) : variations.length === 0 ? (
            <li className="px-2 py-1 text-[11px] text-gray-400">No variations</li>
          ) : (
            variations.map(v => (
              <li
                key={String(v.id)}
                className="flex items-center gap-1.5 px-2 py-0.5 leading-tight rounded text-[11px] hover:bg-gray-50 dark:hover:bg-gray-700/40 text-gray-600 dark:text-gray-400"
                title={v.name || v.sku}
              >
                <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="truncate">{v.name || v.sku}</span>
                <span className={`ml-auto px-1 py-0.5 rounded text-[10px] ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {v.is_active ? 'Active' : 'Inactive'}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </li>
  );
}
