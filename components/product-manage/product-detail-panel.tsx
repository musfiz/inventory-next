'use client';

import { Package, Edit2, Trash2, Tag, Image as ImageIcon, Barcode, Loader2, Plus, ArrowLeft, Save, Copy } from 'lucide-react';
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
import { useBinsDropdown } from '@/services/queries/useBinsDropdown';
import { useBrandsDropdown } from '@/services/queries/useBrandsDropdown';
import { useProduct } from '@/services/queries/useProduct';
import { useProductVariations } from '@/services/queries/useProductVariations';
import { useUnitsDropdown } from '@/services/queries/useUnitsDropdown';
import { useWarehousesDropdown } from '@/services/queries/useWarehousesDropdown';
import stockService from '@/services/stockService';
import { useAuthStore } from '@/stores/auth-store';
import type { Product, ProductVariation, Category } from '@/types/api.types';

type PanelMode = 'empty' | 'form';

interface ProductFormState {
  name: string;
  category_id: string;
  unit_id: string;
  type: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
  status: 'active' | 'inactive' | 'discontinued' | 'archived';
}

interface VariationFormState {
  name: string;
  sku: string;
  product_code: string;
  brand_id: string;
  brand_name: string;
  cost_price: string;
  selling_price: string;
  dp: string;
  mrp: string;
  is_active: boolean;
  quantity: string;
  warehouse_id: string;
  warehouse_name: string;
  bin_id: string;
}

const emptyProductForm = (): ProductFormState => ({
  name: '',
  category_id: '',
  unit_id: '',
  type: 'simple',
  status: 'active',
});

const emptyVariationForm = (): VariationFormState => ({
  name: '',
  sku: '',
  product_code: '',
  brand_id: '',
  brand_name: '',
  cost_price: '0',
  selling_price: '0',
  dp: '0',
  mrp: '0',
  is_active: true,
  quantity: '0',
  warehouse_id: '',
  warehouse_name: '',
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
  const [selectedUnitOpt, setSelectedUnitOpt] = useState<SelectOption | null>(null);
  const [productErrors, setProductErrors] = useState<Record<string, string[]>>({});
  const [savingProduct, setSavingProduct] = useState(false);

  // Variations of the currently open product ('new' | variation id | null).
  // Declared before the brand preload below, which keys off the draft state.
  const [variationDraftId, setVariationDraftId] = useState<string | null>(null);
  const [variationForm, setVariationForm] = useState<VariationFormState>(emptyVariationForm());
  const [savingVariation, setSavingVariation] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);
  const [lastSkuInfo, setLastSkuInfo] = useState<{ last_sku: string | null; next_sku: string | null; variation_name: string | null } | null>(null);
  const [variationErrors, setVariationErrors] = useState<Record<string, string[]>>({});

  // Cache-backed preloads (same Issue 5 rationale as tenant/business-type):
  // SWR dedupes StrictMode remounts and form open/close cycles, so the form
  // no longer fires a fresh GET /api/v1/dropdown/brand (and /unit, on first
  // focus) every time it opens. NOTE: no `= []` defaults — fresh [] literals
  // would retrigger the mapping effects below in a loop.
  const { data: preloadedBrands, isLoading: loadingBrands } = useBrandsDropdown(
    effectiveBtId,
    mode === 'form' || variationDraftId !== null
  );
  const { data: preloadedUnits } = useUnitsDropdown(mode === 'form');

  const [brandOptions, setBrandOptions] = useState<SelectOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<SelectOption[]>([]);
  const loadingFormOptions = loadingBrands;

  // Warehouse + bin options for the variation's optional stock entry.
  // SWR-cached preloads (same Issue 5 rationale as brands/units) so StrictMode
  // remounts and variation-to-variation switches hit the cache instead of
  // firing a fresh fetch every time a draft opens.
  const scopedTenantId = tenantId ?? user?.tenant_id ?? user?.tenant?.id ?? null;
  const stockFormOpen = mode === 'form' && !!editingProduct && variationDraftId !== null;
  const { data: preloadedWarehouses, isLoading: loadingWarehouses } = useWarehousesDropdown(
    scopedTenantId,
    stockFormOpen
  );
  const { data: preloadedBins, isLoading: loadingBins } = useBinsDropdown(
    variationForm.warehouse_id || null,
    scopedTenantId,
    stockFormOpen && !!variationForm.warehouse_id
  );

  const [warehouseOptions, setWarehouseOptions] = useState<SelectOption[]>([]);
  const [binOptions, setBinOptions] = useState<SelectOption[]>([]);
  // Last-used warehouse per product — variation-to-variation switches keep it
  // sticky until the user changes it manually.
  const [stickyWarehouseByProduct, setStickyWarehouseByProduct] = useState<Record<string, string>>({});

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
    () => categories.filter(c => c.is_active !== false).map(c => ({
      value: String(c.id),
      label: c.parent_id ? `${c.name} (Subcategory)` : c.name,
    })),
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

  // Map the cached warehouse + bin preloads into select options.
  // The draft's warehouse is always preserved: if it isn't in the list yet
  // (sticky id restored before list loads, or a search-scoped list), resolve
  // the option async — same single-fetch fallback pattern as BusinessTypeSelect.
  const resolvedWarehouseIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!preloadedWarehouses) return;
    setWarehouseOptions(prev => {
      const mapped = preloadedWarehouses.map((w: any) => ({
        value: String(w.id),
        label: `${w.name}${w.code ? ` (${w.code})` : ''}`,
      }));
      const current = variationForm.warehouse_id;
      if (current && !mapped.some(o => o.value === current)) {
        const kept = prev.find(o => o.value === current);
        if (kept) return [kept, ...mapped];
        // Fallback: resolve the sticky/current warehouse label once, rather
        // than firing a whole-list GET /api/v1/tenant/{id}/warehouse.
        if (!resolvedWarehouseIds.current.has(current)) {
          resolvedWarehouseIds.current.add(current);
          const tenant = scopedTenantId;
          if (tenant) {
            commonService
              .getWarehousesByTenant({ search: undefined, tenant_id: tenant })
              .then(list => {
                const match = (list || []).find((w: any) => String(w.id) === current);
                if (match) {
                  setWarehouseOptions(p =>
                    p.some(o => o.value === current)
                      ? p
                      : [...p, { value: current, label: `${match.name}${match.code ? ` (${match.code})` : ''}` }]
                  );
                }
              })
              .catch(() => { /* non-fatal — select stays usable via search */ });
          }
        }
      }
      return mapped;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedWarehouses]);

  useEffect(() => {
    if (!variationForm.warehouse_id) {
      setBinOptions([]);
      return;
    }
    if (!preloadedBins) return;
    setBinOptions(preloadedBins.map((b: any) => ({
      value: String(b.id),
      label: b.name || `Bin #${b.id}`,
    })));
  }, [preloadedBins, variationForm.warehouse_id]);

  const openNewProductForm = useCallback(() => {
    setEditingProduct(null);
    setProductForm(emptyProductForm());
    setSelectedCategoryOpt(null);
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
      unit_id: p.unit_id ? String(p.unit_id) : '',
      type: (p.type as ProductFormState['type']) || 'simple',
      status: (p.status as ProductFormState['status']) || 'active',
    });
    setSelectedCategoryOpt(p.category ? { value: String(p.category.id), label: p.category.name } : (categoryOptions.find(o => o.value === String(p.category_id)) || null));
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

  // Save as New — creates a new product with same data (except name which user can change)
  // Then opens variation add form for rapid entry
  const handleSaveAsNew = async () => {
    const errs: Record<string, string[]> = {};
    if (!productForm.name.trim()) errs.name = ['Product name is required'];
    if (!productForm.category_id) errs.category_id = ['Category is required'];
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
        unit_id: productForm.unit_id || undefined,
        type: productForm.type,
        status: productForm.status,
        business_type_id: effectiveBtId,
      };
      // Always create new
      const saved = await productService.createProduct(payload);
      notify.success('Product created as new');
      // Select the new product
      setEditingProduct(saved);
      syncedProductId.current = String(saved.id);
      setProductErrors({});
      // Open variation add form for rapid entry — pass saved product directly
      // so it doesn't rely on state that hasn't updated yet
      await openAddVariation(saved);
      onProductSaved?.(saved);
      // Refresh the tree list
      await globalMutate(key => Array.isArray(key) && key[0] === 'products');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (err?.response?.data?.errors) setProductErrors(err.response.data.errors);
      notify.error(err?.response?.data?.message || 'Failed to create product');
    } finally {
      setSavingProduct(false);
    }
  };

  const productFieldError = (field: string) => productErrors[field]?.[0] || null;

  const openAddVariation = async (product?: Product, seed?: ProductVariation) => {
    const targetProduct = product || editingProduct;
    if (!targetProduct) return;
    // Sticky warehouse: pre-fill the last-used warehouse for this product so
    // similar back-to-back variations don't need to re-select it. Cleared only
    // by switching product or changing the select manually.
    const sticky = stickyWarehouseByProduct[String(targetProduct.id)] || '';
    setVariationForm({
      ...emptyVariationForm(),
      warehouse_id: seed
        ? ((seed as ProductVariation & { stocks?: Array<{ warehouse_id?: string | number }> }).stocks?.[0]?.warehouse_id
          ? String((seed as ProductVariation & { stocks?: Array<{ warehouse_id?: string | number }> }).stocks![0].warehouse_id)
          : sticky)
        : sticky,
      bin_id: '',
      // Duplicate: keep name/prices/brand/status, drop identity (sku/code).
      ...(seed
        ? {
            name: seed.name || '',
            brand_id: seed.brand_id ? String(seed.brand_id) : '',
            brand_name: seed.brand?.name || '',
            cost_price: String(seed.cost_price ?? 0),
            selling_price: String(seed.selling_price ?? 0),
            dp: String(seed.dp ?? 0),
            mrp: String(seed.mrp ?? 0),
            is_active: seed.is_active,
          }
        : {}),
    });
    setVariationDraftId('new');
    setVariationErrors({});
    // Show last + next SKU so the user can sanity-check the sequence.
    setLastSkuInfo(null);
    productVariationService
      .getLastSku(String(targetProduct.id))
      .then(info => setLastSkuInfo({ last_sku: info.last_sku, next_sku: info.next_sku, variation_name: info.variation_name }))
      .catch(() => { /* non-fatal — SKU hint simply stays hidden */ });
    setGeneratingSku(true);
    try {
      const sku = await productVariationService.generateSku(String(targetProduct.id), targetProduct.name);
      setVariationForm(prev => ({ ...prev, sku: sku || '' }));
    } catch {
      /* SKU can still be typed manually if generation fails */
    } finally {
      setGeneratingSku(false);
    }
  };

  // Duplicate a variation: open the add draft pre-filled from the source row.
  const openDuplicateVariation = (v: ProductVariation) => {
    if (variationDraftId !== null) return;
    void openAddVariation(undefined, v);
  };

  const openEditVariation = (v: ProductVariation) => {
    setLastSkuInfo(null);
    setVariationDraftId(String(v.id));
    // Backend may include the variation's stock rows (one per warehouse) on the
    // list/show payload. Populate the stock/warehouse fields from the first row.
    const stocks = (v as ProductVariation & { stocks?: Array<{ quantity?: number; warehouse_id?: string | number }>; stock?: { quantity?: number; warehouse_id?: string | number } }).stocks
      ?? ((v as ProductVariation & { stock?: { quantity?: number; warehouse_id?: string | number } }).stock
        ? [(v as ProductVariation & { stock?: { quantity?: number; warehouse_id?: string | number } }).stock as { quantity?: number; warehouse_id?: string | number }]
        : []);
    const existing = stocks[0] ?? null;
    // Editing an existing variation keeps that variation's own warehouse; if
    // it has no stock row yet, fall back to the sticky (last-used) warehouse
    // for this product.
    const pid = editingProduct ? String(editingProduct.id) : null;
    setVariationForm({
      name: v.name || '',
      sku: v.sku,
      product_code: v.product_code || '',
      brand_id: v.brand_id ? String(v.brand_id) : '',
      brand_name: v.brand?.name || '',
      cost_price: String(v.cost_price ?? 0),
      selling_price: String(v.selling_price ?? 0),
      dp: String(v.dp ?? 0),
      mrp: String(v.mrp ?? 0),
      is_active: v.is_active,
      quantity: existing ? String(existing.quantity ?? 0) : '0',
      warehouse_id: existing?.warehouse_id
        ? String(existing.warehouse_id)
        : (pid ? stickyWarehouseByProduct[pid] || '' : ''),
      warehouse_name: '',
      bin_id: '',
    });
  };

  // Closing the draft keeps the warehouse sticky for the next similar
  // variation of this product; switching product resets (no sticky there).
  const cancelVariationDraft = () => {
    const pid = editingProduct ? String(editingProduct.id) : null;
    const sticky = pid ? (variationForm.warehouse_id || stickyWarehouseByProduct[pid] || '') : '';
    if (pid && sticky) setStickyWarehouseByProduct(prev => ({ ...prev, [pid]: sticky }));
    setVariationDraftId(null);
    setLastSkuInfo(null);
    setVariationForm({ ...emptyVariationForm(), warehouse_id: sticky, bin_id: '' });
  };

  const clearVariationError = (field: string) => {
    setVariationErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSaveVariation = async () => {
    if (!editingProduct) return;
    const errs: Record<string, string[]> = {};
    if (!variationForm.sku.trim()) errs.sku = ['SKU is required'];
    if (!variationForm.warehouse_id) errs.warehouse_id = ['Warehouse is required'];
    if (!variationForm.name?.trim()) errs.name = ['Variation name is required'];
    if (!variationForm.brand_id) errs.brand_id = ['Brand is required'];
    const cost = parseFloat(variationForm.cost_price);
    const sale = parseFloat(variationForm.selling_price);
    if (variationForm.cost_price && (isNaN(cost) || cost < 0)) errs.cost_price = ['Cost price must be >= 0'];
    if (variationForm.selling_price && (isNaN(sale) || sale < 0)) errs.selling_price = ['Selling price must be >= 0'];
    if (Object.keys(errs).length > 0) {
      setVariationErrors(errs);
      return;
    }
    setSavingVariation(true);
    try {
      const payload = {
        product_id: String(editingProduct.id),
        sku: variationForm.sku.trim(),
        product_code: variationForm.product_code.trim() || null,
        name: variationForm.name.trim() || undefined,
        brand_id: variationForm.brand_id || undefined,
        cost_price: cost || 0,
        selling_price: sale || 0,
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

      // Remember the warehouse for the next similar variation of this product.
      const pid = String(editingProduct.id);
      setStickyWarehouseByProduct(prev => ({ ...prev, [pid]: variationForm.warehouse_id }));

      setVariationErrors({});
      cancelVariationDraft();
      // Single invalidation on the shared ['variations', id] key refreshes both
      // this panel's table and any expanded tree row (Issue 2: was two fetches).
      await mutateVariations();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (err?.response?.data?.errors) setVariationErrors(err.response.data.errors);
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
          <div className="flex items-center justify-between gap-2 mt-3">
            <div>
              {editingProduct && (
                <button onClick={handleSaveAsNew} disabled={savingProduct} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded" title="Create new product with same data (change name to create another)">
                  {savingProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Save as New
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={backToEmpty} className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleSaveProduct} disabled={savingProduct} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded">
                {savingProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {editingProduct ? 'Update' : 'Save'} Product
              </button>
            </div>
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
                onClick={() => openAddVariation()}
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
            <>
              {/* Variation add/edit form — outside and above the table */}
              {variationDraftId !== null && (
                <div className="mb-3">
                  <VariationEditRow
                    key={variationDraftId === 'new' ? 'draft-new' : `draft-${variationDraftId}`}
                    form={variationForm}
                    setForm={setVariationForm}
                    onSave={handleSaveVariation}
                    onCancel={cancelVariationDraft}
                    saving={savingVariation}
                    skuLoading={variationDraftId === 'new' ? generatingSku : undefined}
                    lastSku={variationDraftId === 'new' ? lastSkuInfo?.last_sku ?? null : null}
                    nextSku={variationDraftId === 'new' ? lastSkuInfo?.next_sku ?? null : null}
                    lastSkuName={variationDraftId === 'new' ? lastSkuInfo?.variation_name ?? null : null}
                    brandOptions={brandOptions}
                    loadingBrands={loadingBrands}
                    warehouseOptions={warehouseOptions}
                    loadingWarehouses={loadingWarehouses}
                    loadWarehouseOptions={loadWarehouseOptions}
                    binOptions={binOptions}
                    setBinOptions={setBinOptions}
                    loadingBins={loadingBins}
                    loadBinOptions={loadBinOptions}
                    isNew={variationDraftId === 'new'}
                    variationErrors={variationErrors}
                    clearVariationError={clearVariationError}
                  />
                </div>
              )}

              {/* Variation list table */}
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-bold text-gray-700 dark:text-gray-300">Name</th>
                      <th className="px-2 py-1.5 text-left font-bold text-gray-700 dark:text-gray-300">Brand</th>
                      <th className="px-2 py-1.5 text-left font-bold text-gray-700 dark:text-gray-300">SKU</th>
                      <th className="px-2 py-1.5 text-left font-bold text-gray-700 dark:text-gray-300">Code</th>
                      <th className="px-2 py-1.5 text-right font-bold text-gray-700 dark:text-gray-300">Cost</th>
                      <th className="px-2 py-1.5 text-right font-bold text-gray-700 dark:text-gray-300">Sale</th>
                      <th className="px-2 py-1.5 text-center font-bold text-gray-700 dark:text-gray-300">Active</th>
                      <th className="px-2 py-1.5 text-right font-bold text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {variations.length === 0 && variationDraftId === null && (
                      <tr><td colSpan={8} className="px-2 py-4 text-center text-gray-500">No variations yet.</td></tr>
                    )}
                    {variations.map(v => {
                      const isBeingEdited = variationDraftId !== null && variationDraftId !== 'new' && variationDraftId === String(v.id);
                      return (
                        <tr key={String(v.id)} className={isBeingEdited ? 'bg-indigo-50/60 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}>
                          <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{v.name || '—'}</td>
                          <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{v.brand?.name || '—'}</td>
                          <td className="px-2 py-1.5 font-mono text-gray-900 dark:text-gray-100">{v.sku}</td>
                          <td className="px-2 py-1.5 text-gray-500">{v.product_code || '—'}</td>
                          <td className="px-2 py-1.5 text-right text-gray-600 dark:text-gray-400">{Number(v.cost_price ?? 0).toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right">{Number(v.selling_price).toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{v.is_active ? 'Yes' : 'No'}</span></td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center justify-end gap-1">
                              {canCreateVariation && <button onClick={() => openDuplicateVariation(v)} disabled={variationDraftId !== null} title={variationDraftId !== null ? 'Finish the open draft first' : 'Duplicate variation'} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 text-emerald-600"><Copy className="w-3 h-3" /></button>}
                              {canEditVariation && <button onClick={() => openEditVariation(v)} title="Edit variation" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-blue-600"><Edit2 className="w-3 h-3" /></button>}
                              {canDeleteVariation && <button onClick={() => handleDeleteVariation(v)} title="Delete variation" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-red-600"><Trash2 className="w-3 h-3" /></button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
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
  lastSku,
  nextSku,
  lastSkuName,
  brandOptions,
  loadingBrands,
  warehouseOptions,
  loadingWarehouses,
  loadWarehouseOptions,
  binOptions,
  loadingBins,
  loadBinOptions,
  setBinOptions,
  isNew,
  variationErrors,
  clearVariationError,
}: {
  form: VariationFormState;
  setForm: React.Dispatch<React.SetStateAction<VariationFormState>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  skuLoading?: boolean;
  /** Last entry's SKU for this product, shown as a sequence hint on new drafts. */
  lastSku?: string | null;
  /** Last SKU + 1, derived from the latest variation row. */
  nextSku?: string | null;
  lastSkuName?: string | null;
  brandOptions: SelectOption[];
  loadingBrands: boolean;
  warehouseOptions: SelectOption[];
  loadingWarehouses: boolean;
  loadWarehouseOptions: (input: string) => Promise<SelectOption[]>;
  binOptions: SelectOption[];
  loadingBins: boolean;
  loadBinOptions: (warehouseId: string, input: string) => Promise<SelectOption[]>;
  setBinOptions: React.Dispatch<React.SetStateAction<SelectOption[]>>;
  /** true for the brand-new draft row (label "Save") vs editing an existing variation */
  isNew: boolean;
  variationErrors?: Record<string, string[]>;
  clearVariationError: (field: string) => void;
}) {
  const getFieldError = (field: string): string | null => variationErrors?.[field]?.[0] || null;
  const hasError = (field: string): boolean => !!variationErrors?.[field];

  const cellInputCls = (field: string) =>
    `w-full px-1.5 py-1 text-xs bg-white dark:bg-gray-700 border ${hasError(field) ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500`;

  const brandError = getFieldError('brand_id') || getFieldError('brand_name');

  const selectedWarehouseOpt = warehouseOptions.find(o => o.value === form.warehouse_id) || null;
  const selectedBinOpt = binOptions.find(o => o.value === form.bin_id) || null;
  // Server-search loader for bins, scoped to the currently selected warehouse.
  const scopedBinLoader = useCallback(
    (input: string) => loadBinOptions(form.warehouse_id, input),
    [loadBinOptions, form.warehouse_id]
  );

  return (
    <div className="bg-indigo-50/40 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/60 rounded-md px-2.5 py-2 space-y-2">
      <h4 className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
        {isNew ? 'Add New Variation' : 'Edit Variation'}
      </h4>
      {/* Variation basics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
        <StackLabel label="Name" error={getFieldError('name')}>
          <input className={cellInputCls('name')} placeholder="e.g. Red - L" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); clearVariationError?.('name'); }} />
        </StackLabel>
        <StackLabel label="SKU" error={getFieldError('sku')}>
          <input className={cellInputCls('sku')} placeholder={skuLoading ? 'Generating…' : 'SKU'} value={form.sku} onChange={e => { setForm(f => ({ ...f, sku: e.target.value })); clearVariationError?.('sku'); }} />
          {lastSku && (
            <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
              Last entry: <span className="font-mono text-gray-500 dark:text-gray-400">{lastSku}</span>
              {lastSkuName ? ` (${lastSkuName})` : ''}
              {nextSku && (
                <> → Next: <span className="font-mono font-semibold text-indigo-500 dark:text-indigo-400">{nextSku}</span></>
              )}
            </p>
          )}
        </StackLabel>
        <StackLabel label="Code" error={getFieldError('product_code')}>
          <input className={cellInputCls('product_code')} placeholder="Product code" value={form.product_code} onChange={e => { setForm(f => ({ ...f, product_code: e.target.value })); clearVariationError?.('product_code'); }} />
        </StackLabel>
        <StackLabel label="Active" inline>
          <label className="flex items-center h-full">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-3.5 h-3.5 accent-indigo-600" />
          </label>
        </StackLabel>
      </div>

      {/* Brand select */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2">
        <StackLabel label="Brand" error={brandError}>
          <CustomSelect
            value={brandOptions.find(o => o.value === form.brand_id) || null}
            onChange={opt => { setForm(f => ({ ...f, brand_id: opt?.value || '', brand_name: opt?.label || '' })); clearVariationError?.('brand_id'); clearVariationError?.('brand_name'); }}
            options={brandOptions}
            isLoading={loadingBrands}
            placeholder="Select brand"
            isClearable
            compact
            isInvalid={!!brandError}
          />
        </StackLabel>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
        <StackLabel label="Cost Price" error={getFieldError('cost_price')}>
          <div className="relative">
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">$</span>
            <input className={cellInputCls('cost_price') + ' pl-4 text-right'} type="number" step="0.01" min="0" placeholder="0.00" value={form.cost_price} onChange={e => { setForm(f => ({ ...f, cost_price: e.target.value })); clearVariationError?.('cost_price'); }} onFocus={e => e.currentTarget.select()} />
          </div>
        </StackLabel>
        <StackLabel label="Sale Price" error={getFieldError('selling_price')}>
          <div className="relative">
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">$</span>
            <input className={cellInputCls('selling_price') + ' pl-4 text-right'} type="number" step="0.01" min="0" placeholder="0.00" value={form.selling_price} onChange={e => { setForm(f => ({ ...f, selling_price: e.target.value })); clearVariationError?.('selling_price'); }} onFocus={e => e.currentTarget.select()} />
          </div>
        </StackLabel>
      </div>

      {/* Stock entry — quantity on top, warehouse + bin below (fixed 320px each, stacked on small screens). Warehouse required, bin optional */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Stock</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">— added to existing quantity on save</span>
        </div>
        <div className="w-[260px]">
          <StackLabel label="Quantity" error={getFieldError('quantity')}>
            <input className={cellInputCls('quantity') + ' text-right'} type="number" step="1" min="0" placeholder="0" value={form.quantity} onChange={e => { setForm(f => ({ ...f, quantity: e.target.value })); clearVariationError?.('quantity'); }} onFocus={e => e.currentTarget.select()} />
          </StackLabel>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[320px_320px] gap-x-3 gap-y-2 mt-2 max-w-[652px]">
          <div className="min-w-0">
            <StackLabel label="Warehouse" required error={getFieldError('warehouse_id')}>
              <CustomSelect
                value={selectedWarehouseOpt}
                onChange={opt => {
                  const wid = opt?.value || '';
                  setForm(f => ({ ...f, warehouse_id: wid, bin_id: '' }));
                  setBinOptions([]);
                  clearVariationError?.('warehouse_id');
                }}
                loadOptions={loadWarehouseOptions}
                defaultOptions={warehouseOptions.length > 0 ? warehouseOptions : true}
                isLoading={loadingWarehouses}
                placeholder="Select warehouse"
                isClearable
                compact
                isInvalid={hasError('warehouse_id')}
              />
            </StackLabel>
          </div>
          <div className="min-w-0">
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
          </div>
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
  );
}

function StackLabel({
  label,
  required,
  inline,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  inline?: boolean;
  error?: string | null;
  children: React.ReactNode;
}) {
  if (inline) return children;
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <label className="w-16 shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-right">
          {label}{required && <span className="text-red-500">*</span>}:
        </label>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      {error && <p className="ml-[4.375rem] mt-0.5 text-[10px] text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
