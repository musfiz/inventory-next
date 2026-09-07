'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Package, Edit2, Trash2, Tag, Image as ImageIcon, Barcode, Loader2, Plus, ArrowLeft, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import productService from '@/services/productService';
import productVariationService from '@/services/productVariationService';
import commonService from '@/services/commonService';
import { confirm, notify } from '@/lib/notifications';
import type { Product, ProductVariation, Category } from '@/types/api.types';
import CustomSelect, { SelectOption } from '@/components/ui/custom-select';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';

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
});

export function ProductDetailPanel({
  selectedProductId,
  categories,
  businessTypeId,
  createTrigger = 0,
  onProductSaved,
  onProductDeleted,
}: {
  selectedProductId: string | null;
  categories: Category[];
  businessTypeId: number | null;
  createTrigger?: number;
  onProductSaved?: (p: Product) => void;
  onProductDeleted?: () => void;
}) {
  const router = useRouter();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const user = useAuthStore(s => s.user);
  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;
  const effectiveBtId = isSuperAdmin ? businessTypeId : tenantBusinessTypeId;

  const [mode, setMode] = useState<PanelMode>('empty');

  const canCreateProduct = hasPermission('create-product');
  const canEditProduct = hasPermission('edit-product') || hasPermission('update-product');
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
  const [loadingProduct, setLoadingProduct] = useState(false);

  const [brandOptions, setBrandOptions] = useState<SelectOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<SelectOption[]>([]);
  const [loadingFormOptions, setLoadingFormOptions] = useState(false);

  const categoryOptions = useMemo(
    () => categories.filter(c => c.is_active !== false).map(c => ({ value: String(c.id), label: c.name })),
    [categories]
  );

  useEffect(() => {
    if (mode !== 'form') return;
    let mounted = true;
    (async () => {
      setLoadingFormOptions(true);
      try {
        const [brands, units] = await Promise.all([
          commonService.getBrandsForDropdown(effectiveBtId ? { business_type_id: effectiveBtId } : {}),
          commonService.getUnitsForDropdown({}),
        ]);
        if (!mounted) return;
        setBrandOptions(brands.map(b => ({ value: String(b.id), label: b.name })));
        setUnitOptions(units.map(u => ({ value: String(u.id), label: `${u.name} (${u.symbol})` })));
      } catch {
        /* dropdown load failure is non-fatal, form still usable */
      } finally {
        if (mounted) setLoadingFormOptions(false);
      }
    })();
    return () => { mounted = false; };
  }, [mode, effectiveBtId]);

  // Variations of the currently open product
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [variationDraftId, setVariationDraftId] = useState<string | null>(null); // 'new' | variation id | null
  const [variationForm, setVariationForm] = useState<VariationFormState>(emptyVariationForm());
  const [savingVariation, setSavingVariation] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);

  const fetchVariations = useCallback(async (productId: string) => {
    setLoadingVariations(true);
    try {
      const res: any = await productVariationService.getVariations({ product_id: productId, per_page: 100 } as any);
      setVariations(res?.data ?? res?.variations ?? []);
    } catch (e: any) {
      notify.error(e?.response?.data?.message || 'Failed to load variations');
    } finally { setLoadingVariations(false); }
  }, []);

  const openNewProductForm = useCallback(() => {
    setEditingProduct(null);
    setProductForm(emptyProductForm());
    setSelectedCategoryOpt(null);
    setSelectedBrandOpt(null);
    setSelectedUnitOpt(null);
    setProductErrors({});
    setVariations([]);
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
      type: (p.type as any) || 'simple',
      status: (p.status as any) || 'active',
    });
    setSelectedCategoryOpt(p.category ? { value: String(p.category.id), label: p.category.name } : (categoryOptions.find(o => o.value === String(p.category_id)) || null));
    setSelectedBrandOpt(p.brand ? { value: String(p.brand.id), label: p.brand.name } : null);
    setSelectedUnitOpt(p.unit ? { value: String(p.unit.id), label: `${p.unit.name} (${(p.unit as any).symbol ?? ''})` } : null);
    setProductErrors({});
    setVariationDraftId(null);
    setMode('form');
    fetchVariations(String(p.id));
  }, [categoryOptions, fetchVariations]);

  // When a product is selected in the left tree, load it into the form
  useEffect(() => {
    if (selectedProductId) {
      setLoadingProduct(true);
      productService.getProduct(selectedProductId)
        .then(p => {
          openEditProductForm(p);
        })
        .catch((e: any) => {
          notify.error(e?.response?.data?.message || 'Failed to load product');
        })
        .finally(() => setLoadingProduct(false));
    } else if (createTrigger === 0) {
      // no selection and not a create trigger — show empty placeholder
      // keep current mode unless we were showing a product
      // if we were in form for a product, go empty
      setMode(prev => prev === 'form' && editingProduct ? 'empty' : prev);
      if (editingProduct) setEditingProduct(null);
    }
  }, [selectedProductId]); // eslint-disable-line react-hooks/exhaustive-deps

  // createTrigger increments when user clicks "New Product" in the tree
  useEffect(() => {
    if (createTrigger > 0) {
      openNewProductForm();
    }
  }, [createTrigger, openNewProductForm]);

  const backToEmpty = () => {
    setMode('empty');
    setEditingProduct(null);
    setVariationDraftId(null);
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
      let saved: Product;
      if (editingProduct) {
        saved = await productService.updateProduct(editingProduct.id, payload);
        notify.success('Product updated');
      } else {
        saved = await productService.createProduct(payload);
        notify.success('Product created');
      }
      setEditingProduct(saved);
      setProductErrors({});
      onProductSaved?.(saved);
      if (!editingProduct) fetchVariations(String(saved.id));
    } catch (e: any) {
      if (e?.response?.data?.errors) setProductErrors(e.response.data.errors);
      notify.error(e?.response?.data?.message || 'Failed to save product');
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
    setVariationForm({
      name: v.name || '',
      sku: v.sku,
      product_code: v.product_code || '',
      cost_price: String(v.cost_price ?? 0),
      selling_price: String(v.selling_price ?? 0),
      dp: String(v.dp ?? 0),
      mrp: String(v.mrp ?? 0),
      is_active: v.is_active,
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
    setSavingVariation(true);
    try {
      const payload: any = {
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
      if (variationDraftId && variationDraftId !== 'new') {
        await productVariationService.updateVariation({ id: variationDraftId, ...payload });
        notify.success('Variation updated');
      } else {
        await productVariationService.createVariation(payload);
        notify.success('Variation added');
      }
      cancelVariationDraft();
      fetchVariations(String(editingProduct.id));
    } catch (e: any) {
      notify.error(e?.response?.data?.message || 'Failed to save variation');
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
      if (editingProduct) fetchVariations(String(editingProduct.id));
    } catch (e: any) {
      notify.error(e?.response?.data?.message || 'Delete failed');
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
  if (loadingProduct) {
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
              />
            </FormRow>
            <FormRow label="Unit" labelWidth="w-16">
              <CustomSelect
                value={selectedUnitOpt}
                onChange={opt => { setSelectedUnitOpt(opt); setProductForm(p => ({ ...p, unit_id: opt?.value || '' })); }}
                options={unitOptions}
                isLoading={loadingFormOptions}
                placeholder="Select"
                isClearable
              />
            </FormRow>
            <FormRow label="Type" labelWidth="w-16">
              <select value={productForm.type} onChange={e => setProductForm(p => ({ ...p, type: e.target.value as any }))} className={inputCls()}>
                <option value="simple">Simple</option>
                <option value="variable">Variable</option>
                <option value="composite">Composite</option>
                <option value="digital">Digital</option>
                <option value="service">Service</option>
              </select>
            </FormRow>
            <FormRow label="Status" labelWidth="w-16">
              <select value={productForm.status} onChange={e => setProductForm(p => ({ ...p, status: e.target.value as any }))} className={inputCls()}>
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
                    <th className="px-2 py-1.5 text-right font-medium text-gray-600 dark:text-gray-400">Price</th>
                    <th className="px-2 py-1.5 text-center font-medium text-gray-600 dark:text-gray-400">Active</th>
                    <th className="px-2 py-1.5 text-right font-medium text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {variations.length === 0 && variationDraftId !== 'new' && (
                    <tr><td colSpan={6} className="px-2 py-4 text-center text-gray-500">No variations yet.</td></tr>
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
                      />
                    ) : (
                      <tr key={String(v.id)} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{v.name || '—'}</td>
                        <td className="px-2 py-1.5 font-mono text-gray-900 dark:text-gray-100">{v.sku}</td>
                        <td className="px-2 py-1.5 text-gray-500">{v.product_code || '—'}</td>
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
}: {
  form: VariationFormState;
  setForm: React.Dispatch<React.SetStateAction<VariationFormState>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  skuLoading?: boolean;
}) {
  const cellInputCls = 'w-full px-1.5 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500';
  return (
    <tr className="bg-indigo-50/40 dark:bg-indigo-900/10">
      <td className="px-1.5 py-1.5"><input className={cellInputCls} placeholder="Name (e.g. Red - L)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></td>
      <td className="px-1.5 py-1.5"><input className={cellInputCls} placeholder={skuLoading ? 'Generating…' : 'SKU'} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></td>
      <td className="px-1.5 py-1.5"><input className={cellInputCls} placeholder="Code" value={form.product_code} onChange={e => setForm(f => ({ ...f, product_code: e.target.value }))} /></td>
      <td className="px-1.5 py-1.5"><input className={cellInputCls + ' text-right'} type="number" step="0.01" placeholder="0.00" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} /></td>
      <td className="px-1.5 py-1.5 text-center">
        <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
      </td>
      <td className="px-1.5 py-1.5">
        <div className="flex items-center justify-end gap-1">
          <button onClick={onSave} disabled={saving} className="p-1 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white" title="Save">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          </button>
          <button onClick={onCancel} className="p-1 rounded border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600" title="Cancel">
            <X className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}
