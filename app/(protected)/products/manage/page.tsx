'use client';

import { LayoutGrid, List, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import { ProductDetailPanel } from '@/components/product-manage/product-detail-panel';
import { ProductTreePanel } from '@/components/product-manage/product-tree';
import { usePermissions } from '@/hooks/use-permissions';
import { useCategories } from '@/services/queries/useCategories';
import { useAuthStore } from '@/stores/auth-store';
import type { Product } from '@/types/api.types';

export default function ProductManageTreePage() {
  const router = useRouter();
  const { hasPermission, hasAnyPermission, isSuperAdmin, isHydrated } = usePermissions();
  const { mutate } = useSWRConfig();
  const user = useAuthStore(s => s.user);

  const tenantBusinessTypeId = user?.tenant?.business_type?.id ?? null;
  // Start null (not a pre-hydration guess) — the real scope resolves after
  // hydration via effectiveBtId below, and queries stay disabled until then,
  // so no request ever fires with a wrong/null business type.
  const [businessTypeId, setBusinessTypeId] = useState<string | number | null>(null);
  const effectiveBtId = (isSuperAdmin ? businessTypeId : tenantBusinessTypeId) as string | number | null;

  // Restore super admin's stored business type selection once auth is hydrated.
  useEffect(() => {
    if (!isSuperAdmin) return;
    try {
      const stored = window.localStorage.getItem('manage-selected-business-type');
      if (stored) setBusinessTypeId(stored);
    } catch { /* storage unavailable */ }
  }, [isSuperAdmin]);

  // Persist the business type selection so it survives page reloads.
  useEffect(() => {
    if (!isSuperAdmin) return;
    try {
      if (businessTypeId) window.localStorage.setItem('manage-selected-business-type', String(businessTypeId));
      else window.localStorage.removeItem('manage-selected-business-type');
    } catch { /* storage unavailable */ }
  }, [isSuperAdmin, businessTypeId]);

  // Tenant scope for warehouse selection. Super admin picks a tenant explicitly and
  // the choice persists in sessionStorage until the tab closes or they clear it.
  // Tenant users are scoped to their own tenant via the user object, so this stays null.
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Restore the super admin's stored tenant selection once auth is hydrated.
  useEffect(() => {
    if (!isSuperAdmin) return;
    try {
      const stored = window.sessionStorage.getItem('manage-selected-tenant');
      if (stored) setTenantId(stored);
    } catch { /* storage unavailable */ }
  }, [isSuperAdmin]);

  // Persist the selection for the current tab session; clearing removes it.
  useEffect(() => {
    if (!isSuperAdmin) return;
    try {
      if (tenantId) window.sessionStorage.setItem('manage-selected-tenant', tenantId);
      else window.sessionStorage.removeItem('manage-selected-tenant');
    } catch { /* storage unavailable */ }
  }, [isSuperAdmin, tenantId]);

  // Categories for the product form dropdown. Gated on hydration — this single
  // change eliminates the pre-hydration double fetch (Issue 1). The key includes
  // the business type, so switching scope refetches automatically.
  const { data: categories = [] } = useCategories(effectiveBtId, isHydrated);

  // Left tree selection (business_type_id-wise product nodes)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [createTrigger, setCreateTrigger] = useState(0);

  useEffect(() => {
    if (isHydrated && !hasAnyPermission(['view-product', 'view-product-variation', 'view-product-image', 'view-product-barcode'])) {
      router.push('/access-denied');
    }
  }, [isHydrated, hasAnyPermission, router]);

  // When business type changes, clear selection. No refresh-key bump needed —
  // the SWR keys contain the business type, so tree + categories refetch alone.
  // Tenant selection is intentionally preserved — it's a separate scope and
  // only cleared manually (or when the tab closes).
  const handleBusinessTypeChange = (id: string | number | null) => {
    setBusinessTypeId(id ? String(id) : null);
    setSelectedProductId(null);
  };

  const handleAddProduct = () => {
    setSelectedProductId(null);
    setCreateTrigger(v => v + 1);
  };

  const handleSelectProduct = (id: string | null) => {
    setSelectedProductId(id);
  };

  const handleProductSaved = (p: Product) => {
    setSelectedProductId(String(p.id));
    // New/renamed product must appear in the tree.
    void mutate(key => Array.isArray(key) && key[0] === 'products');
  };

  const handleProductDeleted = () => {
    setSelectedProductId(null);
    void mutate(key => Array.isArray(key) && key[0] === 'products');
  };

  // Reload product/variation/category data without resetting the tenant
  // selection (super admin) or the business type input. One invalidation fans
  // out to every hook (tree + detail panel); SWR dedupes concurrent refetches.
  const handleRefresh = () => {
    void mutate(
      key =>
        Array.isArray(key) &&
        (key[0] === 'categories' || key[0] === 'products' || key[0] === 'product' || key[0] === 'variations')
    );
  };

  const canCreateProduct = hasPermission('create-product') || isSuperAdmin;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Product Management
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">Tree view · Products → Variations (with brand)</span>
        </h1>
        <div className="flex items-center gap-1.5">
          <button onClick={handleRefresh} title="Refresh product data" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => router.push('/products')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50">
            <List className="w-3.5 h-3.5" /> List view
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-2 items-start">
        {/* Left: Business type selector ABOVE + business_type_id-wise product tree (products → variations) */}
        <div className="lg:sticky lg:top-2 lg:h-[calc(100vh-120px)] lg:overflow-hidden h-130]">
          <ProductTreePanel
            businessTypeId={businessTypeId}
            onBusinessTypeChange={handleBusinessTypeChange}
            tenantId={tenantId}
            onTenantChange={setTenantId}
            selectedProductId={selectedProductId}
            onSelectProduct={handleSelectProduct}
            onAddProduct={handleAddProduct}
            onRefresh={handleRefresh}
            canCreate={canCreateProduct}
          />
        </div>

        <div className="min-h-105 lg:h-[calc(100vh-120px)] lg:overflow-hidden flex flex-col">
          <ProductDetailPanel
            selectedProductId={selectedProductId}
            categories={categories}
            businessTypeId={businessTypeId}
            tenantId={tenantId}
            createTrigger={createTrigger}
            onProductSaved={handleProductSaved}
            onProductDeleted={handleProductDeleted}
          />
        </div>
      </div>
    </div>
  );
}
