'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Package, Search, Plus, Edit2, Trash2, RefreshCw, Maximize2, Minimize2, Tag, Loader2 } from 'lucide-react';
import BusinessTypeSelect from '@/components/ui/business-type-select';
import TenantSelect from '@/components/ui/tenant-select';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import productService from '@/services/productService';
import productVariationService from '@/services/productVariationService';
import type { Product, ProductVariation } from '@/types/api.types';
import { confirm, notify } from '@/lib/notifications';

interface ProductTreePanelProps {
  businessTypeId: number | null;
  onBusinessTypeChange: (id: number | null) => void;
  /** Tenant scope for warehouse selection — super admin only picks one explicitly. */
  tenantId?: string | null;
  onTenantChange?: (id: string | null) => void;
  selectedProductId: string | null;
  onSelectProduct: (id: string | null) => void;
  onAddProduct: () => void;
  onEditProduct: (p: Product) => void;
  onRefresh?: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  refreshKey?: number;
  categories?: any[];
  /**
   * Signal for the tree to refetch a product's variations (e.g. after a
   * variation save/delete in the detail panel). Bumps with { productId, nonce }.
   */
  variationsSignal?: { productId: string; nonce: number } | null;
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
  canUpdate,
  canDelete,
  refreshKey = 0,
  variationsSignal,
}: ProductTreePanelProps) {
  // onTenantChange accepts the optional-param form TenantSelect passes.
  const handleTenantChange = (id?: string | null) => onTenantChange(id ?? null);
  const { isSuperAdmin } = usePermissions();
  const user = useAuthStore(s => s.user);
  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;
  const effectiveBtId = isSuperAdmin ? businessTypeId : tenantBusinessTypeId;

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [variationMap, setVariationMap] = useState<Record<string, ProductVariation[]>>({});
  const [loadingVariations, setLoadingVariations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { per_page: 100, lite: 1 };
      if (debounced) params.search = debounced;
      if (effectiveBtId) params.business_type_id = effectiveBtId;
      const res: any = await productService.getProducts(params);
      // getProducts returns the bare array (service already unwraps response.data.data).
      const data: Product[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : (res?.products ?? []);
      setProducts(data);
      // keep selection valid
      if (selectedProductId && !data.some(p => String(p.id) === selectedProductId)) {
        // do not auto-clear, parent can decide
      }
    } catch (e: any) {
      notify.error(e?.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [debounced, effectiveBtId, selectedProductId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts, refreshKey, effectiveBtId]);
  // refetch when business type changes resets expanded
  useEffect(() => { setExpanded(new Set()); setVariationMap({}); }, [effectiveBtId]);

  // When the detail panel saves/deletes a variation, refetch that product's
  // variations so the tree row reflects the latest backend state.
  useEffect(() => {
    if (!variationsSignal?.productId) return;
    let cancelled = false;
    (async () => {
      const pid = variationsSignal.productId;
      setLoadingVariations(prev => ({ ...prev, [pid]: true }));
      try {
        const res: any = await productVariationService.getVariations({ product_id: pid, per_page: 100 } as any);
        if (cancelled) return;
        const data: ProductVariation[] = Array.isArray(res) ? res : (res?.data ?? res?.variations ?? []);
        setVariationMap(prev => ({ ...prev, [pid]: data }));
      } catch {
        if (!cancelled) setVariationMap(prev => ({ ...prev, [pid]: [] }));
      } finally {
        if (!cancelled) setLoadingVariations(prev => ({ ...prev, [pid]: false }));
      }
    })();
    return () => { cancelled = true; };
  }, [variationsSignal]);

  const handleToggle = async (productId: string) => {
    const isExpanded = expanded.has(productId);
    if (isExpanded) {
      setExpanded(prev => { const n = new Set(prev); n.delete(productId); return n; });
      return;
    }
    setExpanded(prev => new Set(prev).add(productId));
    if (!variationMap[productId]) {
      setLoadingVariations(prev => ({ ...prev, [productId]: true }));
      try {
        const res: any = await productVariationService.getVariations({ product_id: productId, per_page: 100 } as any);
        // getVariations already unwraps to the items array via response.data.data.
        const data: ProductVariation[] = Array.isArray(res) ? res : (res?.data ?? res?.variations ?? []);
        setVariationMap(prev => ({ ...prev, [productId]: data }));
      } catch {
        setVariationMap(prev => ({ ...prev, [productId]: [] }));
      } finally {
        setLoadingVariations(prev => ({ ...prev, [productId]: false }));
      }
    }
  };

  const expandAll = async () => {
    const allIds = products.map(p => String(p.id));
    setExpanded(new Set(allIds));
    // lazy load variations for all
    for (const pid of allIds) {
      if (!variationMap[pid]) {
        setLoadingVariations(prev => ({ ...prev, [pid]: true }));
        try {
          const res: any = await productVariationService.getVariations({ product_id: pid, per_page: 100 } as any);
          const data: ProductVariation[] = Array.isArray(res) ? res : (res?.data ?? res?.variations ?? []);
          setVariationMap(prev => ({ ...prev, [pid]: data }));
        } catch {
          setVariationMap(prev => ({ ...prev, [pid]: [] }));
        } finally {
          setLoadingVariations(prev => ({ ...prev, [pid]: false }));
        }
      }
    }
  };
  const collapseAll = () => setExpanded(new Set());

  const handleDeleteProduct = async (p: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const r = await confirm({ title: 'Delete product', html: `Delete <b>${p.name}</b>?`, confirmButtonText: 'Delete', cancelButtonText: 'Cancel' });
    if (!r.isConfirmed) return;
    try {
      await productService.deleteProduct(String(p.id));
      notify.success('Product deleted');
      if (selectedProductId === String(p.id)) onSelectProduct(null);
      fetchProducts();
      onRefresh?.();
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Delete failed');
    }
  };

  const filteredProducts = useMemo(() => {
    if (!debounced) return products;
    const q = debounced.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p as any).sku?.toLowerCase().includes(q) ||
      (p.category?.name || '').toLowerCase().includes(q) ||
      (p.brand?.name || '').toLowerCase().includes(q)
    );
  }, [products, debounced]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Business Type selector — above tree, as requested */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
        {/* Tenant selector — super admin only; warehouses are tenant-scoped & shown per tenant */}
        {isSuperAdmin && (
          <div>
            <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Tenant</label>
            <TenantSelect
              value={tenantId}
              onChange={handleTenantChange}
              placeholder="Select tenant"
              compact
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
              {(user as any)?.tenant?.business_type?.name || '—'}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-indigo-600" /> Products
            <span className="text-xs font-normal text-gray-500">· {filteredProducts.length}</span>
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={expandAll} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Expand all"><Maximize2 className="w-3.5 h-3.5" /></button>
            <button onClick={collapseAll} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Collapse all"><Minimize2 className="w-3.5 h-3.5" /></button>
            <button onClick={fetchProducts} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSelectProduct(null)}
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
          <div className="p-4 flex items-center justify-center gap-2 text-xs text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500">
            No products found{effectiveBtId ? ' for this business type' : ''}.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {filteredProducts.map(product => {
              const pid = String(product.id);
              const isSelected = selectedProductId === pid;
              const isExpanded = expanded.has(pid);
              const variations = variationMap[pid] || [];
              const isLoadingVar = !!loadingVariations[pid];
              const hasVariations = (product.variations && product.variations.length > 0) || variations.length > 0 || true; // always expandable to show variations
              return (
                <li key={pid}>
                  <div
                    className={`group flex items-center gap-1 px-1.5 py-1.5 rounded text-xs cursor-pointer select-none border ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-transparent'}`}
                    onClick={() => onSelectProduct(pid)}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); handleToggle(pid); }}
                      className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 shrink-0"
                      title={isExpanded ? 'Collapse' : 'Expand variations'}
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    <Package className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate flex-1" title={product.name}>{product.name}</span>
                    {product.status && (
                      <span className={`ml-1 px-1 py-0.5 rounded text-[10px] leading-none ${product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{product.status}</span>
                    )}
                    <span className="hidden group-hover:flex items-center gap-0.5 ml-1">
                      {canDelete && (
                        <button onClick={e => handleDeleteProduct(product, e)} className="p-1 rounded hover:bg-white dark:hover:bg-gray-600 text-gray-500 hover:text-red-600" title="Delete">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  </div>
                  {isExpanded && (
                    <ul className="ml-5 border-l border-gray-200 dark:border-gray-700 pl-2 mt-1 space-y-0.5">
                      {isLoadingVar ? (
                        <li className="px-2 py-1 text-[11px] text-gray-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading variations...</li>
                      ) : variations.length === 0 ? (
                        <li className="px-2 py-1 text-[11px] text-gray-400">No variations</li>
                      ) : (
                        variations.map(v => (
                          <li
                            key={String(v.id)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] hover:bg-gray-50 dark:hover:bg-gray-700/40 text-gray-600 dark:text-gray-400"
                            title={`${v.sku}${v.name ? ' · ' + v.name : ''}`}
                          >
                            <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="font-mono truncate">{v.sku}</span>
                            {v.name && <span className="truncate text-gray-500">· {v.name}</span>}
                            <span className={`ml-auto px-1 py-0.5 rounded text-[10px] ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{v.is_active ? 'Active' : 'Inactive'}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        {filteredProducts.length} products {effectiveBtId ? '· filtered by business type' : '· all business types'}
      </div>
    </div>
  );
}
