'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, Search, Edit2, Trash2, Tag, Layers, Image as ImageIcon, Barcode, ExternalLink, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import productService from '@/services/productService';
import productVariationService from '@/services/productVariationService';
import commonService from '@/services/commonService';
import { confirm, notify } from '@/lib/notifications';
import type { Product, ProductVariation, Category } from '@/types/api.types';
import BusinessTypeSelect from '@/components/ui/business-type-select';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';

type TabKey = 'products' | 'variations';

export function ProductDetailPanel({
  selectedCategoryId,
  categories,
  businessTypeId,
  onBusinessTypeChange,
  onCategoryCreated,
}: {
  selectedCategoryId: string | null;
  categories: Category[];
  businessTypeId: number | null;
  onBusinessTypeChange: (id: number | null) => void;
  onCategoryCreated?: () => void;
}) {
  const router = useRouter();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const user = useAuthStore(s => s.user);
  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;
  const effectiveBtId = isSuperAdmin ? businessTypeId : tenantBusinessTypeId;

  const [tab, setTab] = useState<TabKey>('products');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Variations for selected product
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const categoryName = selectedCategoryId ? categories.find(c => String(c.id) === selectedCategoryId)?.name : null;

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const params: any = { page, per_page: 10 };
      if (debounced) params.search = debounced;
      if (selectedCategoryId) params.category_id = selectedCategoryId;
      // Business type scoping is handled server-side; for super admin we pass filter explicitly only when needed elsewhere.
      // Products endpoint respects business_type_id for tenant scoping; pass when super admin filtered.
      if (isSuperAdmin && effectiveBtId) params.business_type_id = effectiveBtId;
      const res: any = await productService.getProducts(params);
      // ProductService returns ProductListResponse {data, meta}; controller also supports paginated wrapper.
      const data: Product[] = res?.data ?? res?.products ?? [];
      const meta = res?.meta ?? res?.pagination ?? {};
      setProducts(data);
      setTotal(meta.total ?? data.length);
      setTotalPages(meta.last_page ?? meta.totalPages ?? 1);
    } catch (e: any) {
      notify.error(e?.response?.data?.message || 'Failed to load products');
    } finally { setLoadingProducts(false); }
  }, [page, debounced, selectedCategoryId, isSuperAdmin, effectiveBtId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setPage(1); setSelectedProductId(null); }, [selectedCategoryId, debounced, effectiveBtId]);
  useEffect(() => { setSelectedProductId(null); setVariations([]); }, [tab]);

  const fetchVariations = useCallback(async (productId: string) => {
    setLoadingVariations(true);
    try {
      // Prefer product-variations index filtered by product; fallback to commonService variation dropdown
      try {
        const res: any = await productVariationService.getVariations({ product_id: productId, per_page: 50 } as any);
        const data: ProductVariation[] = res?.data ?? res?.variations ?? [];
        if (Array.isArray(data) && data.length >= 0) { setVariations(data); return; }
      } catch {}
      const list = await commonService.getVariationsByProduct(productId);
      setVariations(list as any);
    } catch (e: any) {
      notify.error(e?.response?.data?.message || 'Failed to load variations');
    } finally { setLoadingVariations(false); }
  }, []);

  useEffect(() => {
    if (tab === 'variations' && selectedProductId) fetchVariations(selectedProductId);
  }, [tab, selectedProductId, fetchVariations]);

  const handleDeleteProduct = async (p: Product) => {
    const r = await confirm({ title: 'Delete product', html: `Delete <b>${p.name}</b>?`, confirmButtonText: 'Delete', cancelButtonText: 'Cancel' });
    if (!r.isConfirmed) return;
    try { await productService.deleteProduct(String(p.id)); notify.success('Product deleted'); fetchProducts(); } catch (e: any) { notify.error(e?.response?.data?.message || 'Delete failed'); }
  };

  const handleDeleteVariation = async (v: ProductVariation) => {
    const r = await confirm({ title: 'Delete variation', html: `Delete <b>${v.sku}</b>?`, confirmButtonText: 'Delete', cancelButtonText: 'Cancel' });
    if (!r.isConfirmed) return;
    try { await productVariationService.deleteVariation(String(v.id)); notify.success('Variation deleted'); if (selectedProductId) fetchVariations(selectedProductId); } catch (e: any) { notify.error(e?.response?.data?.message || 'Delete failed'); }
  };

  const canCreateProduct = hasPermission('create-product');
  const canEditProduct = hasPermission('edit-product') || hasPermission('update-product');
  const canDeleteProduct = hasPermission('delete-product') || hasPermission('delete-products');
  const canViewVariations = hasPermission('view-product-variation');
  const canCreateVariation = hasPermission('create-product-variation') || hasPermission('create-products');
  const canEditVariation = hasPermission('update-product-variation') || hasPermission('update-products');
  const canDeleteVariation = hasPermission('delete-products');

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 truncate">
            <Package className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate">{categoryName ? categoryName : 'All Products'}</span>
            <span className="text-xs font-normal text-gray-500">· {total} items</span>
          </h2>
          {isSuperAdmin && (
            <div className="w-48 shrink-0">
              <BusinessTypeSelect value={businessTypeId} onChange={onBusinessTypeChange} placeholder="All business types" isClearable />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'products' ? 'Search products...' : 'Search variations...'} className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          {tab === 'products' && canCreateProduct && (
            <button onClick={() => router.push(selectedCategoryId ? `/products/add?category_id=${selectedCategoryId}` : '/products/add')} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded"><Plus className="w-3.5 h-3.5" /> Add Product</button>
          )}
          {tab === 'variations' && selectedProductId && canCreateVariation && (
            <button onClick={() => router.push(`/product-variations/add?product_id=${selectedProductId}`)} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded"><Plus className="w-3.5 h-3.5" /> Add Variation</button>
          )}
        </div>

        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 -mb-2">
          <button onClick={() => setTab('products')} className={`px-3 py-1.5 text-xs font-medium border-b-2 ${tab === 'products' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Products</button>
          <button onClick={() => setTab('variations')} className={`px-3 py-1.5 text-xs font-medium border-b-2 ${tab === 'variations' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Variations</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'products' ? (
          loadingProducts ? (
            <div className="p-6 flex items-center justify-center gap-2 text-xs text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
          ) : products.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500">No products found{categoryName ? ` in ${categoryName}` : ''}.</div>
          ) : (
            <>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {products.map(p => (
                  <li key={String(p.id)} className={`px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedProductId === String(p.id) ? 'bg-indigo-50/60 dark:bg-indigo-900/20' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => { setSelectedProductId(String(p.id)); setTab('variations'); }} className="text-left flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate" title={p.name}>{p.name}</div>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {p.category?.name && <span className="px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px]">{p.category.name}</span>}
                          {p.brand?.name && <span className="px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px]">{p.brand.name}</span>}
                          {p.status && <span className={`px-1.5 py-0.5 rounded text-[10px] ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{p.status}</span>}
                          <span className="text-[10px] text-gray-400">{p.type}</span>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        {canViewVariations && (
                          <button onClick={() => { setSelectedProductId(String(p.id)); setTab('variations'); }} className="p-1 rounded hover:bg-white dark:hover:bg-gray-600 text-gray-500 hover:text-indigo-600" title="View variations"><Layers className="w-3.5 h-3.5" /></button>
                        )}
                        {canEditProduct && (
                          <button onClick={() => router.push(`/products/edit?id=${p.id}`)} className="p-1 rounded hover:bg-white dark:hover:bg-gray-600 text-gray-500 hover:text-blue-600" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                        )}
                        {canDeleteProduct && (
                          <button onClick={() => handleDeleteProduct(p)} className="p-1 rounded hover:bg-white dark:hover:bg-gray-600 text-gray-500 hover:text-red-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                        <a href={`/products`} onClick={e => { e.preventDefault(); router.push(`/products/edit?id=${p.id}`); }} className="p-1 rounded hover:bg-white dark:hover:bg-gray-600 text-gray-400" title="Open"><ExternalLink className="w-3 h-3" /></a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button onClick={() => { setSelectedProductId(String(p.id)); setTab('variations'); }} className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700"><Tag className="w-3 h-3" /> Variations</button>
                      <span className="text-gray-300">·</span>
                      <button onClick={() => router.push(`/products/images?product_id=${p.id}`)} className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700"><ImageIcon className="w-3 h-3" /> Images</button>
                      <span className="text-gray-300">·</span>
                      <button onClick={() => router.push(`/product-barcodes?product_id=${p.id}`)} className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700"><Barcode className="w-3 h-3" /> Barcodes</button>
                    </div>
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs">
                  <span className="text-gray-500">Page {page} of {totalPages}</span>
                  <div className="flex items-center gap-1">
                    <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50">Prev</button>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          <div className="p-3 space-y-3">
            {!selectedProductId ? (
              <div className="text-xs text-gray-500 text-center py-6">Select a product from the Products tab to view its variations.</div>
            ) : loadingVariations ? (
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 py-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading variations...</div>
            ) : variations.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-6">No variations for this product.</div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-600 dark:text-gray-400">SKU</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-600 dark:text-gray-400">Name</th>
                      <th className="px-2 py-1.5 text-right font-medium text-gray-600 dark:text-gray-400">Cost</th>
                      <th className="px-2 py-1.5 text-right font-medium text-gray-600 dark:text-gray-400">Price</th>
                      <th className="px-2 py-1.5 text-center font-medium text-gray-600 dark:text-gray-400">Active</th>
                      <th className="px-2 py-1.5 text-right font-medium text-gray-600 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {variations.map(v => (
                      <tr key={String(v.id)} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-2 py-1.5 font-mono text-gray-900 dark:text-gray-100">{v.sku}</td>
                        <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{v.name || '—'}</td>
                        <td className="px-2 py-1.5 text-right">{Number(v.cost_price).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right">{Number(v.selling_price).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{v.is_active ? 'Yes' : 'No'}</span></td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center justify-end gap-1">
                            {canEditVariation && (
                              <button onClick={() => router.push(`/product-variations/${v.id}/edit`)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-blue-600"><Edit2 className="w-3 h-3" /></button>
                            )}
                            {canDeleteVariation && (
                              <button onClick={() => handleDeleteVariation(v)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-red-600"><Trash2 className="w-3 h-3" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selectedProductId && (
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedProductId(null)} className="text-xs text-gray-600 hover:text-gray-800">← Back to products</button>
                {canCreateVariation && (
                  <button onClick={() => router.push(`/product-variations/bulk-add`)} className="ml-auto text-xs text-indigo-600 hover:text-indigo-700">Bulk add →</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
