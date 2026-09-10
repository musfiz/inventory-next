'use client';

import { Package, Edit2, Trash2, Tag, Image as ImageIcon, Barcode, Loader2, Plus, ArrowLeft, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { mutate as globalMutate } from 'swr';
import CustomSelect, { SelectOption } from '@/components/ui/custom-select';
import { usePermissions } from '@/hooks/use-permissions';
import { confirm, notify } from '@/lib/notifications';
import binService from '@/services/binService';
import commonService from '@/services/commonService';
import productService from '@/services/productService';
import productVariationService from '@/services/productVariationService';
import { useBrandsDropdown } from '@/services/queries/useBrandsDropdown';
import { useProduct } from '@/services/queries/useProduct';
import { useProductVariations } from '@/services/queries/useProductVariations';
import { useUnitsDropdown } from '@/services/queries/useUnitsDropdown';
import stockService from '@/services/stockService';
import { useAuthStore } from '@/stores/auth-store';
import type { Product, ProductVariation, Category } from '@/types/api.types';

type PanelMode = 'empty' | 'form';

interface ProductFormState {
  name: string;
  category_id: string;
  brand_id: string;
  unit_id: string;
  type: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
  status: 'active' | 'inactive' | 'discontinued' | 'archived';
}

interface VariationFormState {
  name: string;
  sku: string;
  product_code: string;
  cost_price: string;
  selling_price: string;
  dp: string;
  mrp: string;
  is_active: boolean;
  // Stock entry captured on the variation form (warehouse required, bin optional)
  quantity: string;
  warehouse_id: string;
  bin_id: string;
}

const emptyProductForm = (): ProductFormState => ({
  name: '',
  category_id: '',
  brand_id: '',
  unit_id: '',
  type: 'simple',
  status: 'active',
});

const emptyVariationForm = (): VariationFormState => ({
  name: '',
  sku: '',
  product_code: '',
  cost_price: '0',
  selling_price: '0',
  dp: '0',
  mrp: '0',
  is_active: true,
  quantity: '0',
  warehouse_id: '',
  bin_id: '',
});

export function ProductDetailPanel({
  selectedProductId,
  categories,
  businessTypeId,
  tenantId,
  createTrigger = 0,
  onProductSaved,
  onProductDeleted,
}: {
  selectedProductId: string | null;
  categories: Category[];
  businessTypeId: number | null;
  /** Super admin-selected tenant for warehouse scope; tenant users pass their own. */
  tenantId?: string | null;
  createTrigger?: number;
  onProductSaved?: (p: Product) => void;
  onProductDeleted?: () => void;
}) {
  const router = useRouter();
  const { hasPermission, isSuperAdmin, isHydrated } = usePermissions();
  const user = useAuthStore(s => s.user);
  const tenantBusinessTypeId = user?.tenant?.business_type?.id ?? null;
  const effectiveBtId = isSuperAdmin ? businessTypeId : tenantBusinessTypeId;

  const [mode, setMode] = useState<PanelMode>('empty');

  const canCreateProduct = hasPermission('create-product');
  const canCreateVariation = hasPermission('create-product-variation') || hasPermission('create-products');
  const canEditVariation = hasPermission('update-product-variation') || hasPermission('update-products');
  const canDeleteVariation = hasPermission('delete-products');

  // ── Form mode state (product + variations, inline, no navigation) ──
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm());
  const [selectedCategoryOpt, setSelectedCategoryOpt] = useState<SelectOption | null>(null);
  const [selectedBrandOpt, setSelectedBrandOpt] = useState<SelectOption | null>(null);
  const [selectedUnitOpt, setSelectedUnitOpt] = useState<SelectOption | null>(null);
  const [productErrors, setProductErrors] = useState<Record<string, string[]>>({});
  const [savingProduct, setSavingProduct] = useState(false);

  // Cache-backed preloads (same Issue 5 rationale as tenant/business-type):
  // SWR dedupes StrictMode remounts and form open/close cycles, so the form
  // no longer fires a fresh GET /api/v1/dropdown/brand (and /unit, on first
  // focus) every time it opens. NOTE: no `= []` defaults — fresh [] literals
  // would retrigger the mapping effects below in a loop.
  const { data: preloadedBrands, isLoading: loadingBrands } = useBrandsDropdown(
    effectiveBtId,
    mode === 'form'
  );
  const { data: preloadedUnits } = useUnitsDropdown(mode === 'form');

  const [brandOptions, setBrandOptions] = useState<SelectOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<SelectOption[]>([]);
  const loadingFormOptions = loadingBrands;

  // Warehouse + bin options for the variation's optional stock entry
  const [warehouseOptions, setWarehouseOptions] = useState<SelectOption[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [binOptions, setBinOptions] = useState<SelectOption[]>([]);
  const [loadingBins, setLoadingBins] = useState(false);

  // ── Shared data: SWR handles dedup, caching, and stale-response ordering
  // internally, so rapid selection changes can no longer let an older fetch
  // overwrite a newer one (Issue 4), and the ['variations', id] key is shared
  // with the tree — one fetch serves both consumers (Issue 3).
  const variationProductId = selectedProductId && isHydrated ? selectedProductId : null;
  const { data: loadedProduct, isLoading: loadingProduct } = useProduct(
    selectedProductId && isHydrated ? selectedProductId : null
  );
  const { data: variations = [], isLoading: loadingVariations, mutate: mutateVariations } =
    useProductVariations(variationProductId);

  const loadWarehouseOptions = useCallback(async (input: string): Promise<SelectOption[]> => {
    try {
      // Super admin picks a tenant explicitly (tenant-scoped warehouses);
      // tenant users are scoped to their own tenant.
      const scopedTenantId = tenantId ?? user?.tenant_id ?? user?.tenant?.id;
      if (!scopedTenantId) return [];
      const list = await commonService.getWarehousesByTenant({
        search: input.trim() || undefined,
        tenant_id: scopedTenantId,
      });
      return (list || []).map((w) => ({ value: String(w.id), label: `${w.name}${w.code ? ` (${w.code})` : ''}` }));
    } catch {
      return [];
    }
  }, [tenantId, user]);

  const loadBinOptions = useCallback(async (scopedWarehouseId: string, input: string): Promise<SelectOption[]> => {
    // Bin is optional in the stock entry; only meaningful once a warehouse is chosen.
    if (!scopedWarehouseId) return [];
    try {
      const scopedTenantId = tenantId ?? user?.tenant_id ?? user?.tenant?.id;
      if (!scopedTenantId) return [];
      const list = await binService.getBinsForDropdown({
        search: input.trim() || undefined,
        warehouse_id: scopedWarehouseId,
        tenant_id: scopedTenantId,
      });
      return (list || []).map((b) => ({
        value: String(b.id),
        label: b.name || `Bin #${b.id}`,
      }));
    } catch {
      return [];
    }
  }, [tenantId, user]);

  // Server-side searchable unit loader (AsyncSelect). The empty preload path
  // is served by useUnitsDropdown above (cached); typed input fires live.
  const loadUnitOptions = useCallback(async (inputValue: string): Promise<SelectOption[]> => {
    const q = inputValue.trim();
    if (!q) return unitOptions;
    try {
      const units = await commonService.getUnitsForDropdown({ search: q });
      return units.map(u => ({ value: String(u.id), label: `${u.name} (${u.short_name})` }));
    } catch {
      return [];
    }
  }, [unitOptions]);

  const categoryOptions = useMemo(
    () => categories.filter(c => c.is_active !== false).map(c => ({ value: String(c.id), label: c.name })),
    [categories]
  );

  // Map the cached preloads into select options (no separate fetch).
  // A dropdown load failure is non-fatal — the form stays usable.
  useEffect(() => {
    if (!preloadedBrands) return;
    setBrandOptions(preloadedBrands.map(b => ({ value: String(b.id), label: b.name })));
  }, [preloadedBrands]);

  useEffect(() => {
    if (!preloadedUnits) return;
    setUnitOptions(preloadedUnits.map(u => ({ value: String(u.id), label: `${u.name} (${u.short_name})` })));
  }, [preloadedUnits]);

  // Variations of the currently open product
  const [variationDraftId, setVariationDraftId] = useState<string | null>(null); // 'new' | variation id | null
  const [variationForm, setVariationForm] = useState<VariationFormState>(emptyVariationForm());
  const [savingVariation, setSavingVariation] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);

  // When a variation draft opens, prefetch the warehouse options so the
  // required stock warehouse select is immediately usable (server search onward).
  useEffect(() => {
    if (mode !== 'form' || !editingProduct || variationDraftId === null) return;
    let mounted = true;
    (async () => {
      setLoadingWarehouses(true);
      try {
        const opts = await loadWarehouseOptions('');
        if (mounted) setWarehouseOptions(opts);
      } finally {
        if (mounted) setLoadingWarehouses(false);
      }
    })();
    return () => { mounted = false; };
  }, [mode, editingProduct, variationDraftId, loadWarehouseOptions]);

  const openNewProductForm = useCallback(() => {
    setEditingProduct(null);
    setProductForm(emptyProductForm());
    setSelectedCategoryOpt(null);
    setSelectedBrandOpt(null);
    setSelectedUnitOpt(null);
    setProductErrors({});
    setVariationDraftId(null);
    setMode('form');
  }, []);

  const openEditProductForm = useCallback((p: Product) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name || '',
      category_id: p.category_id ? String(p.category_id) : '',
      brand_id: p.brand_id ? String(p.brand_id) : '',
      unit_id: p.unit_id ? String(p.unit_id) : '',
      type: (p.type as ProductFormState['type']) || 'simple',
      status: (p.status as ProductFormState['status']) || 'active',
    });
    setSelectedCategoryOpt(p.category ? { value: String(p.category.id), label: p.category.name } : (categoryOptions.find(o => o.value === String(p.category_id)) || null));
    setSelectedBrandOpt(p.brand ? { value: String(p.brand.id), label: p.brand.name } : null);
    setSelectedUnitOpt(p.unit ? { value: String(p.unit.id), label: `${p.unit.name} (${p.unit.short_name ?? ''})` } : null);
    setProductErrors({});
    setVariationDraftId(null);
    setMode('form');
  }, [categoryOptions]);

  // Populate the form when the SWR product query resolves. Guarded by
  // syncedProductId so background revalidations don't wipe unsaved edits —
  // the form only resets when a *different* product is selected.
  const syncedProductId = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedProductId || !loadedProduct) return;
    if (syncedProductId.current === String(loadedProduct.id)) return;
    syncedProductId.current = String(loadedProduct.id);
    openEditProductForm(loadedProduct);
  }, [selectedProductId, loadedProduct, openEditProductForm]);

  // Clearing the selection returns to the empty placeholder — unless a
  // brand-new (unsaved) draft is open, which has no selection by design.
  useEffect(() => {
    if (selectedProductId) return;
    syncedProductId.current = null;
    if (editingProduct) {
      setEditingProduct(null);
      setVariationDraftId(null);
      setMode('empty');
    }
  }, [selectedProductId, editingProduct]);

  // createTrigger increments when user clicks "New Product" in the tree
  const createTriggerSeen = useRef(createTrigger);
  useEffect(() => {
    if (createTrigger > 0 && createTrigger !== createTriggerSeen.current) {
      createTriggerSeen.current = createTrigger;
      syncedProductId.current = null;
      openNewProductForm();
    }
  }, [createTrigger, openNewProductForm]);

  const backToEmpty = () => {
    setMode('empty');
    setEditingProduct(null);
    setVariationDraftId(null);
    syncedProductId.current = null;
    onProductDeleted?.(); // signal to clear selection if needed — parent already cleared
  };

  const handleSaveProduct = async () => {
    const errs: Record<string, string[]> = {};
    if (!productForm.name.trim()) errs.name = ['Product name is required'];
    if (!productForm.category_id) errs.category_id = ['Category is required'];
    if (!productForm.brand_id) errs.brand_id = ['Brand is required'];
    if (!effectiveBtId) errs.business_type = ['Business type is required'];
    if (Object.keys(errs).length > 0) {
      setProductErrors(errs);
      notify.error('Please fill in all required fields');
      return;
    }
    setSavingProduct(true);
    try {
      const payload: any = {
        name: productForm.name.trim(),
        category_id: productForm.category_id,
        brand_id: productForm.brand_id,
        unit_id: productForm.unit_id || undefined,
        type: productForm.type,
        status: productForm.status,
        business_type_id: effectiveBtId,
      };
      const wasNew = !editingProduct;
      let saved: Product;
      if (editingProduct) {
        saved = await productService.updateProduct(editingProduct.id, payload);
        notify.success('Product updated');
      } else {
        saved = await productService.createProduct(payload);
        notify.success('Product created');
      }
      setEditingProduct(saved);
      syncedProductId.current = String(saved.id);
      setProductErrors({});
      onProductSaved?.(saved);
      if (wasNew) {
        // New product: refresh the tree list and prime this product's cache entries.
        await globalMutate(key => Array.isArray(key) && key[0] === 'products');
      } else {
        await globalMutate(['product', String(saved.id)]);
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (err?.response?.data?.errors) setProductErrors(err.response.data.errors);
      notify.error(err?.response?.data?.message || 'Failed to save product');
    } finally {
      setSavingProduct(false);
    }
  };

  const productFieldError = (field: string) => productErrors[field]?.[0] || null;

  const openAddVariation = async () => {
    if (!editingProduct) return;
    setVariationForm(emptyVariationForm());
    setVariationDraftId('new');
    setGeneratingSku(true);
    try {
      const sku = await productVariationService.generateSku(String(editingProduct.id), editingProduct.name);
      setVariationForm(prev => ({ ...prev, sku: sku || '' }));
    } catch {
      /* SKU can still be typed manually if generation fails */
    } finally {
      setGeneratingSku(false);
    }
  };

  const openEditVariation = (v: ProductVariation) => {
    setVariationDraftId(String(v.id));
    // Backend may include the variation's stock rows (one per warehouse) on the
    // list/show payload. Populate the stock/warehouse fields from the first row.
    const stocks = (v as ProductVariation & { stocks?: Array<{ quantity?: number; warehouse_id?: string | number }>; stock?: { quantity?: number; warehouse_id?: string | number } }).stocks
      ?? ((v as ProductVariation & { stock?: { quantity?: number; warehouse_id?: string | number } }).stock
        ? [(v as ProductVariation & { stock?: { quantity?: number; warehouse_id?: string | number } }).stock as { quantity?: number; warehouse_id?: string | number }]
        : []);
    const existing = stocks[0] ?? null;
    setVariationForm({
      name: v.name || '',
      sku: v.sku,
      product_code: v.product_code || '',
      cost_price: String(v.cost_price ?? 0),
      selling_price: String(v.selling_price ?? 0),
      dp: String(v.dp ?? 0),
      mrp: String(v.mrp ?? 0),
      is_active: v.is_active,
      quantity: existing ? String(existing.quantity ?? 0) : '0',
      warehouse_id: existing?.warehouse_id ? String(existing.warehouse_id) : '',
      bin_id: '',
    });
  };

  const cancelVariationDraft = () => {
    setVariationDraftId(null);
    setVariationForm(emptyVariationForm());
  };

  const handleSaveVariation = async () => {
    if (!editingProduct) return;
    if (!variationForm.sku.trim()) {
      notify.error('SKU is required');
      return;
    }
    if (!variationForm.warehouse_id) {
      notify.error('Warehouse is required to add stock for this variation');
      return;
    }
    setSavingVariation(true);
    try {
      const payload = {
        product_id: String(editingProduct.id),
        sku: variationForm.sku.trim(),
        product_code: variationForm.product_code.trim() || null,
        name: variationForm.name.trim() || undefined,
        cost_price: parseFloat(variationForm.cost_price) || 0,
        selling_price: parseFloat(variationForm.selling_price) || 0,
        dp: parseFloat(variationForm.dp) || 0,
        mrp: parseFloat(variationForm.mrp) || 0,
        is_active: variationForm.is_active,
      };
      let savedVariation: ProductVariation;
      if (variationDraftId && variationDraftId !== 'new') {
        savedVariation = await productVariationService.updateVariation({ id: variationDraftId, ...payload });
        notify.success('Variation updated');
      } else {
        savedVariation = await productVariationService.createVariation(payload);
        notify.success('Variation added');
      }

      // Persist stock for the (created/updated) variation in the chosen warehouse.
      // Backend adds `quantity` to the existing stock row (old + new).
      const qty = parseFloat(variationForm.quantity);
      if (qty > 0) {
        // Super admin must send the tenant they picked; tenant users are scoped to their own.
        const scopedTenantId = tenantId ?? user?.tenant_id ?? user?.tenant?.id;
        await stockService.storeStocks({
          warehouse_id: variationForm.warehouse_id,
          product_id: String(editingProduct.id),
          tenant_id: scopedTenantId || undefined,
          stocks: [{
            variation_id: String(savedVariation.id),
            product_id: String(editingProduct.id),
            warehouse_id: variationForm.warehouse_id,
            quantity: qty,
          }],
        });
      }

      cancelVariationDraft();
      // Single invalidation on the shared ['variations', id] key refreshes both
      // this panel's table and any expanded tree row (Issue 2: was two fetches).
      await mutateVariations();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      notify.error(err?.response?.data?.message || 'Failed to save variation');
    } finally {
      setSavingVariation(false);
    }
  };

  const handleDeleteVariation = async (v: ProductVariation) => {
    const r = await confirm({ title: 'Delete variation', html: `Delete <b>${v.sku}</b>?`, confirmButtonText: 'Delete', cancelButtonText: 'Cancel' });
    if (!r.isConfirmed) return;
    try {
      await productVariationService.deleteVariation(String(v.id));
      notify.success('Variation deleted');
      if (editingProduct) {
        await mutateVariations();
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      notify.error(err?.response?.data?.message || 'Delete failed');
    }
  };

  const inputCls = (hasError?: boolean) =>
    `w-full px-2.5 py-1 text-xs bg-white dark:bg-gray-700 border ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500`;

  // ── Render: EMPTY ──
  if (mode === 'empty') {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-indigo-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">No product selected</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
            Select a product from the tree on the left to view and manage its variations, images and barcodes — or create a new product.
          </p>
          {canCreateProduct && (
            <button onClick={openNewProductForm} className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded">
              <Plus className="w-3.5 h-3.5" /> New Product
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Render: FORM MODE (product + variations) ──
  // SWR serves the selected product from cache instantly when the tree already
  // expanded it; only a true first load shows the spinner.
  if (loadingProduct && !loadedProduct && selectedProductId) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex-1 flex items-center justify-center gap-2 text-xs text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading product...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <button onClick={backToEmpty} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Back">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {editingProduct ? `Editing: ${editingProduct.name}` : 'New Product'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Product form card — dense .NET/WinForms-style "Label: [Input]" rows */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-indigo-600" /> Product
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <FormRow label="Name" required labelWidth="w-16" className="md:col-span-2" error={productFieldError('name')}>
              <input
                type="text"
                value={productForm.name}
                onChange={e => { setProductForm(p => ({ ...p, name: e.target.value })); setProductErrors(p => ({ ...p, name: [] })); }}
                className={inputCls(!!productFieldError('name'))}
                placeholder="Product name"
              />
            </FormRow>
            <FormRow label="Category" required labelWidth="w-16" error={productFieldError('category_id')}>
              <CustomSelect
                value={selectedCategoryOpt}
                onChange={opt => { setSelectedCategoryOpt(opt); setProductForm(p => ({ ...p, category_id: opt?.value || '' })); setProductErrors(p => ({ ...p, category_id: [] })); }}
                options={categoryOptions}
                placeholder="Select"
                isInvalid={!!productFieldError('category_id')}
                isDisabled={!effectiveBtId}
                compact
              />
            </FormRow>
            <FormRow label="Brand" required labelWidth="w-16" error={productFieldError('brand_id')}>
              <CustomSelect
                value={selectedBrandOpt}
                onChange={opt => { setSelectedBrandOpt(opt); setProductForm(p => ({ ...p, brand_id: opt?.value || '' })); setProductErrors(p => ({ ...p, brand_id: [] })); }}
                options={brandOptions}
                isLoading={loadingFormOptions}
                placeholder="Select"
                isInvalid={!!productFieldError('brand_id')}
                isDisabled={!effectiveBtId}
                compact
              />
            </FormRow>
            <FormRow label="Unit" labelWidth="w-16">
              <CustomSelect
                value={selectedUnitOpt}
                onChange={opt => { setSelectedUnitOpt(opt); setProductForm(p => ({ ...p, unit_id: opt?.value || '' })); }}
                loadOptions={loadUnitOptions}
                defaultOptions={unitOptions.length > 0 ? unitOptions : true}
                placeholder="Select"
                isClearable
                compact
              />
            </FormRow>
            <FormRow label="Type" labelWidth="w-16">
              <select value={productForm.type} onChange={e => setProductForm(p => ({ ...p, type: e.target.value as ProductFormState['type'] }))} className={inputCls()}>
                <option value="simple">Simple</option>
                <option value="variable">Variable</option>
                <option value="composite">Composite</option>
                <option value="digital">Digital</option>
                <option value="service">Service</option>
              </select>
            </FormRow>
            <FormRow label="Status" labelWidth="w-16">
              <select value={productForm.status} onChange={e => setProductForm(p => ({ ...p, status: e.target.value as ProductFormState['status'] }))} className={inputCls()}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
                <option value="archived">Archived</option>
              </select>
            </FormRow>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button onClick={backToEmpty} className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={handleSaveProduct} disabled={savingProduct} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded">
              {savingProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Product
            </button>
          </div>
          {editingProduct && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-500">
              <button onClick={() => router.push(`/products/images?product_id=${editingProduct.id}`)} className="inline-flex items-center gap-1 hover:text-gray-700"><ImageIcon className="w-3 h-3" /> Images</button>
              <span className="text-gray-300">·</span>
              <button onClick={() => router.push(`/product-barcodes?product_id=${editingProduct.id}`)} className="inline-flex items-center gap-1 hover:text-gray-700"><Barcode className="w-3 h-3" /> Barcodes</button>
            </div>
          )}
        </div>

        {/* Variations — inline, same page, only after product exists */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-600" /> Variations
            </h3>
            {canCreateVariation && (
              <button
                onClick={openAddVariation}
                disabled={!editingProduct || variationDraftId !== null}
                title={!editingProduct ? 'Save the product first' : 'Add variation'}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              >
                <Plus className="w-3.5 h-3.5" /> Add Variation
              </button>
            )}
          </div>

          {!editingProduct ? (
            <p className="text-xs text-gray-500 py-4 text-center">Save the product first to add variations.</p>
          ) : loadingVariations ? (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 py-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading variations...</div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium text-gray-600 dark:text-gray-400">Name</th>
                    <th className="px-2 py-1.5 text-left font-medium text-gray-600 dark:text-gray-400">SKU</th>
                    <th className="px-2 py-1.5 text-left font-medium text-gray-600 dark:text-gray-400">Code</th>
                    <th className="px-2 py-1.5 text-right font-medium text-gray-600 dark:text-gray-400">Cost</th>
                    <th className="px-2 py-1.5 text-right font-medium text-gray-600 dark:text-gray-400">Sale</th>
                    <th className="px-2 py-1.5 text-center font-medium text-gray-600 dark:text-gray-400">Active</th>
                    <th className="px-2 py-1.5 text-right font-medium text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {variations.length === 0 && variationDraftId !== 'new' && (
                    <tr><td colSpan={7} className="px-2 py-4 text-center text-gray-500">No variations yet.</td></tr>
                  )}
                  {variations.map(v => (
                    variationDraftId === String(v.id) ? (
                      <VariationEditRow
                        key={String(v.id)}
                        form={variationForm}
                        setForm={setVariationForm}
                        onSave={handleSaveVariation}
                        onCancel={cancelVariationDraft}
                        saving={savingVariation}
                        warehouseOptions={warehouseOptions}
                        loadingWarehouses={loadingWarehouses}
                        loadWarehouseOptions={loadWarehouseOptions}
                        binOptions={binOptions}
                        setBinOptions={setBinOptions}
                        loadingBins={loadingBins}
                        loadBinOptions={loadBinOptions}
                        isNew={false}
                      />
                    ) : (
                      <tr key={String(v.id)} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{v.name || '—'}</td>
                        <td className="px-2 py-1.5 font-mono text-gray-900 dark:text-gray-100">{v.sku}</td>
                        <td className="px-2 py-1.5 text-gray-500">{v.product_code || '—'}</td>
                        <td className="px-2 py-1.5 text-right text-gray-600 dark:text-gray-400">{Number(v.cost_price ?? 0).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right">{Number(v.selling_price).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{v.is_active ? 'Yes' : 'No'}</span></td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center justify-end gap-1">
                            {canEditVariation && <button onClick={() => openEditVariation(v)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-blue-600"><Edit2 className="w-3 h-3" /></button>}
                            {canDeleteVariation && <button onClick={() => handleDeleteVariation(v)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-red-600"><Trash2 className="w-3 h-3" /></button>}
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                  {variationDraftId === 'new' && (
                    <VariationEditRow
                      form={variationForm}
                      setForm={setVariationForm}
                      onSave={handleSaveVariation}
                      onCancel={cancelVariationDraft}
                      saving={savingVariation}
                      skuLoading={generatingSku}
                      warehouseOptions={warehouseOptions}
                      loadingWarehouses={loadingWarehouses}
                      loadWarehouseOptions={loadWarehouseOptions}
                      binOptions={binOptions}
                      setBinOptions={setBinOptions}
                      loadingBins={loadingBins}
                      loadBinOptions={loadBinOptions}
                      isNew
                    />
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormRow({
  label,
  required,
  error,
  children,
  labelWidth = 'w-16',
  className = '',
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
  labelWidth?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <label className={`${labelWidth} shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-right`}>
          {label}{required && <span className="text-red-500">*</span>}:
        </label>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      {error && <p className={`text-[10px] text-red-500 mt-0.5 ${labelWidth === 'w-16' ? 'ml-[4.375rem]' : 'ml-[4.875rem]'}`}>{error}</p>}
    </div>
  );
}

function VariationEditRow({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  skuLoading,
  warehouseOptions,
  loadingWarehouses,
  loadWarehouseOptions,
  binOptions,
  loadingBins,
  loadBinOptions,
  setBinOptions,
  isNew,
}: {
  form: VariationFormState;
  setForm: React.Dispatch<React.SetStateAction<VariationFormState>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  skuLoading?: boolean;
  warehouseOptions: SelectOption[];
  loadingWarehouses: boolean;
  loadWarehouseOptions: (input: string) => Promise<SelectOption[]>;
  binOptions: SelectOption[];
  loadingBins: boolean;
  loadBinOptions: (warehouseId: string, input: string) => Promise<SelectOption[]>;
  setBinOptions: React.Dispatch<React.SetStateAction<SelectOption[]>>;
  /** true for the brand-new draft row (label "Save") vs editing an existing variation */
  isNew: boolean;
}) {
  const cellInputCls = 'w-full px-1.5 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500';
  const selectedWarehouseOpt = warehouseOptions.find(o => o.value === form.warehouse_id) || null;
  const selectedBinOpt = binOptions.find(o => o.value === form.bin_id) || null;
  // Server-search loader for bins, scoped to the currently selected warehouse.
  const scopedBinLoader = useCallback(
    (input: string) => loadBinOptions(form.warehouse_id, input),
    [loadBinOptions, form.warehouse_id]
  );

  return (
    <tr className="bg-indigo-50/40 dark:bg-indigo-900/10">
      <td colSpan={7} className="px-2 py-2">
        <div className="bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800/60 rounded-md px-2.5 py-2 space-y-2">
          {/* Variation basics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
            <StackLabel label="Name">
              <input className={cellInputCls} placeholder="e.g. Red - L" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </StackLabel>
            <StackLabel label="SKU">
              <input className={cellInputCls} placeholder={skuLoading ? 'Generating…' : 'SKU'} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
            </StackLabel>
            <StackLabel label="Code">
              <input className={cellInputCls} placeholder="Product code" value={form.product_code} onChange={e => setForm(f => ({ ...f, product_code: e.target.value }))} />
            </StackLabel>
            <StackLabel label="Active" inline>
              <label className="flex items-center h-full">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-3.5 h-3.5 accent-indigo-600" />
              </label>
            </StackLabel>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
            <StackLabel label="Cost Price">
              <div className="relative">
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">$</span>
                <input className={cellInputCls + ' pl-4 text-right'} type="number" step="0.01" min="0" placeholder="0.00" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} onFocus={e => e.currentTarget.select()} />
              </div>
            </StackLabel>
            <StackLabel label="Sale Price">
              <div className="relative">
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">$</span>
                <input className={cellInputCls + ' pl-4 text-right'} type="number" step="0.01" min="0" placeholder="0.00" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} onFocus={e => e.currentTarget.select()} />
              </div>
            </StackLabel>
          </div>

          {/* Stock entry — warehouse required, bin optional */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Stock</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">— added to existing quantity on save</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
              <StackLabel label="Quantity">
                <input className={cellInputCls + ' text-right'} type="number" step="1" min="0" placeholder="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} onFocus={e => e.currentTarget.select()} />
              </StackLabel>
              <StackLabel label="Warehouse" required>
                <CustomSelect
                  value={selectedWarehouseOpt}
                  onChange={opt => {
                    const wid = opt?.value || '';
                    setForm(f => ({ ...f, warehouse_id: wid, bin_id: '' }));
                    setBinOptions([]);
                  }}
                  loadOptions={loadWarehouseOptions}
                  defaultOptions={warehouseOptions.length > 0 ? warehouseOptions : true}
                  isLoading={loadingWarehouses}
                  placeholder="Select warehouse"
                  isClearable
                  compact
                />
              </StackLabel>
              <StackLabel label="Bin (Optional)">
                <CustomSelect
                  value={selectedBinOpt}
                  onChange={opt => setForm(f => ({ ...f, bin_id: opt?.value || '' }))}
                  loadOptions={scopedBinLoader}
                  defaultOptions={binOptions.length > 0 ? binOptions : true}
                  isLoading={loadingBins}
                  isDisabled={!form.warehouse_id}
                  placeholder={form.warehouse_id ? 'Select bin' : 'Select warehouse first'}
                  isClearable
                  compact
                />
              </StackLabel>
              <div className="hidden md:block" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-1.5 pt-1">
            {!form.warehouse_id && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 mr-auto">Warehouse is required to save stock</span>
            )}
            <button onClick={onCancel} className="px-2.5 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600">
              Reset
            </button>
            <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} {isNew ? 'Save' : 'Update'}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function StackLabel({
  label,
  required,
  inline,
  children,
}: {
  label: string;
  required?: boolean;
  inline?: boolean;
  children: React.ReactNode;
}) {
  if (inline) return children;
  return (
    <div className="flex items-center gap-1.5">
      <label className="w-16 shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-right">
        {label}{required && <span className="text-red-500">*</span>}:
      </label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
