'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, List } from 'lucide-react';
import apiClient from '@/lib/api/axios';
import { notify } from '@/lib/notifications';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { Category, Product } from '@/types/api.types';
import { ProductTreePanel } from '@/components/product-manage/product-tree';
import { ProductDetailPanel } from '@/components/product-manage/product-detail-panel';

export default function ProductManageTreePage() {
  const router = useRouter();
  const { hasPermission, hasAnyPermission, isSuperAdmin, isHydrated } = usePermissions();
  const user = useAuthStore(s => s.user);

  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;
  const [businessTypeId, setBusinessTypeId] = useState<number | null>(isSuperAdmin ? null : tenantBusinessTypeId);

  // Tenant scope for warehouse selection: super admin picks a tenant explicitly;
  // tenant users are fixed to their own tenant.
  const [tenantId, setTenantId] = useState<string | null>(
    isSuperAdmin ? null : ((user as any)?.tenant_id ?? (user as any)?.tenant?.id ?? null)
  );

  // Categories still needed for the product form dropdown
  const [categories, setCategories] = useState<Category[]>([]);
  const [, setLoadingCategories] = useState(false);

  // Left tree selection (business_type_id-wise product nodes)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [createTrigger, setCreateTrigger] = useState(0);
  const [treeRefreshKey, setTreeRefreshKey] = useState(0);
  // Signal the tree to refetch a product's variations after save/delete in the detail panel.
  const [variationsSignal, setVariationsSignal] = useState<{ productId: string; nonce: number } | null>(null);

  useEffect(() => {
    if (!isSuperAdmin && tenantBusinessTypeId) setBusinessTypeId(tenantBusinessTypeId);
  }, [isSuperAdmin, tenantBusinessTypeId]);

  useEffect(() => {
    if (isHydrated && !hasAnyPermission(['view-product', 'view-product-variation', 'view-product-image', 'view-product-barcode'])) {
      router.push('/access-denied');
    }
  }, [isHydrated, hasAnyPermission, router]);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const params: Record<string, any> = { per_page: 100 };
      const bt = isSuperAdmin ? businessTypeId : tenantBusinessTypeId;
      if (bt) params.business_type_id = bt;
      const res = await apiClient.get('/api/v1/categories', { params });
      const raw: any[] = res.data?.data ?? res.data ?? [];
      const normalized: Category[] = raw.map((r: any) => ({
        id: String(r.id),
        name: r.name,
        description: r.description,
        parent_id: r.parent_id ? String(r.parent_id) : undefined,
        is_active: !!r.is_active,
        business_types: r.business_types,
        business_type: r.business_type,
        parent: r.parent,
      } as Category));
      setCategories(normalized);
    } catch (e: any) {
      notify.error(e?.response?.data?.message || 'Failed to load categories');
    } finally { setLoadingCategories(false); }
  }, [businessTypeId, isSuperAdmin, tenantBusinessTypeId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // When business type changes, clear selection and refresh tree
  const handleBusinessTypeChange = (id: number | null) => {
    setBusinessTypeId(id);
    setSelectedProductId(null);
    // Warehouses are tenant-scoped: reset tenant when business type changes so
    // a stale tenant selection from another business type isn't used.
    if (isSuperAdmin) setTenantId(null);
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
    setTreeRefreshKey(v => v + 1);
  };

  const handleProductDeleted = () => {
    setTreeRefreshKey(v => v + 1);
  };

  // Bump the tree to refetch a product's variations after a save/delete.
  const handleVariationsChanged = (productId: string) => {
    setVariationsSignal(prev => ({ productId, nonce: (prev?.nonce ?? 0) + 1 }));
  };

  const canCreateProduct = hasPermission('create-product') || isSuperAdmin;
  const canUpdateProduct = hasPermission('update-product') || hasPermission('edit-product') || isSuperAdmin;
  const canDeleteProduct = hasPermission('delete-product') || hasPermission('delete-products') || isSuperAdmin;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Product Management
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">Tree view · Business type → Products → Variations</span>
        </h1>
        <div className="flex items-center gap-1.5">
          <button onClick={() => router.push('/products')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50">
            <List className="w-3.5 h-3.5" /> List view
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-2 items-start">
        {/* Left: Business type selector ABOVE + business_type_id-wise product tree (products → variations) */}
        <div className="lg:sticky lg:top-2 lg:h-[calc(100vh-120px)] lg:overflow-hidden h-[520px] lg:h-[calc(100vh-120px)]">
          <ProductTreePanel
            businessTypeId={businessTypeId}
            onBusinessTypeChange={handleBusinessTypeChange}
            tenantId={tenantId}
            onTenantChange={setTenantId}
            selectedProductId={selectedProductId}
            onSelectProduct={handleSelectProduct}
            onAddProduct={handleAddProduct}
            onEditProduct={(p) => setSelectedProductId(String(p.id))}
            onRefresh={() => setTreeRefreshKey(v => v + 1)}
            canCreate={canCreateProduct}
            canUpdate={canUpdateProduct}
            canDelete={canDeleteProduct}
            refreshKey={treeRefreshKey}
            categories={categories}
            variationsSignal={variationsSignal}
          />
        </div>

        <div className="min-h-[420px] lg:h-[calc(100vh-120px)] lg:overflow-hidden flex flex-col">
          <ProductDetailPanel
            selectedProductId={selectedProductId}
            categories={categories}
            businessTypeId={businessTypeId}
            tenantId={tenantId}
            onTenantChange={setTenantId}
            createTrigger={createTrigger}
            onProductSaved={handleProductSaved}
            onProductDeleted={handleProductDeleted}
            onVariationsChanged={handleVariationsChanged}
          />
        </div>
      </div>
    </div>
  );
}
