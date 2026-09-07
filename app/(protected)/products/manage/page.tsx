'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, List } from 'lucide-react';
import apiClient from '@/lib/api/axios';
import { categoryService } from '@/services';
import { notify, confirm } from '@/lib/notifications';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { Category } from '@/types/api.types';
import { CategoryTreePanel } from '@/components/product-manage/category-tree';
import { CategoryFormDialog } from '@/components/product-manage/category-form-dialog';
import { ProductDetailPanel } from '@/components/product-manage/product-detail-panel';

export default function ProductManageTreePage() {
  const router = useRouter();
  const { hasPermission, hasAnyPermission, isSuperAdmin, isHydrated } = usePermissions();
  const user = useAuthStore(s => s.user);

  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;
  const [businessTypeId, setBusinessTypeId] = useState<number | null>(isSuperAdmin ? null : tenantBusinessTypeId);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);

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
      const params: Record<string, any> = { per_page: 200 };
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
      setSelectedCategoryId(prev => (prev && !normalized.some(c => String(c.id) === prev) ? null : prev));
    } catch (e: any) {
      notify.error(e?.response?.data?.message || 'Failed to load categories');
    } finally { setLoadingCategories(false); }
  }, [businessTypeId, isSuperAdmin, tenantBusinessTypeId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleAdd = (parentId?: string) => {
    setEditingCategory(null);
    setDefaultParentId(parentId ?? null);
    setDialogOpen(true);
  };
  const handleEdit = (c: Category) => {
    setEditingCategory(c);
    setDefaultParentId(null);
    setDialogOpen(true);
  };
  const handleDelete = async (c: Category) => {
    const r = await confirm({ title: 'Delete category', html: `Delete <b>${c.name}</b>?`, confirmButtonText: 'Delete', cancelButtonText: 'Cancel' });
    if (!r.isConfirmed) return;
    try {
      await categoryService.deleteCategory(String(c.id));
      notify.success('Category deleted');
      if (selectedCategoryId === String(c.id)) setSelectedCategoryId(null);
      fetchCategories();
    } catch (e: any) {
      notify.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  const canCreateCategory = hasPermission('create-product') || isSuperAdmin;
  // Categories are managed under Settings in sidebar (superAdminOnly), but allow product managers to manage within tree if they have product create.
  const canUpdateCategory = hasPermission('update-product') || hasPermission('edit-product') || isSuperAdmin;
  const canDeleteCategory = hasPermission('delete-product') || hasPermission('delete-products') || isSuperAdmin;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Product Management
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">Tree view · Categories → Products → Variations</span>
        </h1>
        <div className="flex items-center gap-1.5">
          <button onClick={() => router.push('/products')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50">
            <List className="w-3.5 h-3.5" /> List view
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-2 items-start">
        <div className="lg:sticky lg:top-2 lg:h-[calc(100vh-120px)] lg:overflow-hidden h-[420px] lg:h-[calc(100vh-120px)]">
          <CategoryTreePanel
            categories={categories}
            loading={loadingCategories}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefresh={fetchCategories}
            canCreate={canCreateCategory}
            canUpdate={canUpdateCategory}
            canDelete={canDeleteCategory}
          />
        </div>

        <div className="min-h-[420px] lg:h-[calc(100vh-120px)] lg:overflow-hidden flex flex-col">
          <ProductDetailPanel
            selectedCategoryId={selectedCategoryId}
            categories={categories}
            businessTypeId={businessTypeId}
            onBusinessTypeChange={setBusinessTypeId}
          />
        </div>
      </div>

      <CategoryFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={fetchCategories}
        editingCategory={editingCategory}
        defaultParentId={defaultParentId}
        allCategories={categories}
      />
    </div>
  );
}
