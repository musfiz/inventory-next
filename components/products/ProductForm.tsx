'use client';

import { Package2, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { GiSave } from 'react-icons/gi';
import { useSWRConfig } from 'swr';
import BusinessTypeSelect from '@/components/ui/business-type-select';
import CustomSelect, { SelectOption } from '@/components/ui/custom-select';
import Spinner from '@/components/ui/spinner';
import { usePermissions } from '@/hooks/use-permissions';
import { notify } from '@/lib/notifications';
import { productService } from '@/services';
import commonService from '@/services/commonService';
import { useBrandsDropdown } from '@/services/queries/useBrandsDropdown';
import { useCategories } from '@/services/queries/useCategories';
import { useProduct } from '@/services/queries/useProduct';
import { useUnitsDropdown } from '@/services/queries/useUnitsDropdown';
import { useAuthStore } from '@/stores/auth-store';

interface ProductFormData {
  name: string;
  description: string;
  category_id: string;
  brand_id: string;
  unit_id: string;
  type: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
  status: 'active' | 'inactive' | 'discontinued' | 'archived';
  is_taxable: boolean;
  tax_rate: string;
  track_inventory: boolean;
  allow_backorder: boolean;
  low_stock_threshold: string;
  reorder_point: string;
  has_expiry: boolean;
  has_batch: boolean;
  has_serial: boolean;
  is_featured: boolean;
  display_order: string;
  image: string;
}

export function ProductForm({ editRef }: { editRef?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = editRef || searchParams?.get('id') || searchParams?.get('edit') || searchParams?.get('uuid');
  const isEditMode = Boolean(editId);
  const user = useAuthStore(state => state.user);
  const { hasPermission, isHydrated } = usePermissions();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (isHydrated && !hasPermission(isEditMode ? 'edit-product' : 'create-product')) {
      router.push('/access-denied');
    }
  }, [hasPermission, isHydrated, router, isEditMode]);
  const isSuperAdmin = user?.user_type === 'super_admin';
  const tenantBusinessType =
    (user as any)?.tenant?.business_type ||
    (user as any)?.business_type ||
    '';
  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<SelectOption | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<SelectOption | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<SelectOption | null>(null);

  const [businessType, setBusinessType] = useState<string>(isSuperAdmin ? '' : tenantBusinessType);
  const [businessTypeId, setBusinessTypeId] = useState<string | number | null>(null);
  const effectiveBtId = (isSuperAdmin ? businessTypeId : tenantBusinessTypeId) as string | number | null;

  const { data: loadedProduct, isLoading: loadingEdit } = useProduct(editId && isHydrated ? String(editId) : null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: categoriesData } = useCategories(effectiveBtId, isHydrated && !!effectiveBtId);
  const { data: preloadedBrands } = useBrandsDropdown(effectiveBtId, !!effectiveBtId);
  const { data: preloadedUnits, isLoading: loadingUnits } = useUnitsDropdown(isHydrated);

  const categoryOptions = useMemo(
    () =>
      (categoriesData || [])
        .filter((c: any) => c.is_active !== false)
        .map((c: any) => ({
          value: String(c.id),
          label: c.parent_id ? `${c.name} (Subcategory)` : c.name,
        })),
    [categoriesData]
  );

  const brandOptions = useMemo(
    () => (preloadedBrands || []).map((b: any) => ({ value: String(b.id), label: b.name })),
    [preloadedBrands]
  );

  const unitOptions = useMemo(
    () => (preloadedUnits || []).map((u: any) => ({ value: String(u.id), label: `${u.name} (${u.short_name})` })),
    [preloadedUnits]
  );

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    category_id: '',
    brand_id: '',
    unit_id: '',
    type: 'simple',
    status: 'active',
    is_taxable: false,
    tax_rate: '0',
    track_inventory: true,
    allow_backorder: false,
    low_stock_threshold: '10',
    reorder_point: '',
    has_expiry: false,
    has_batch: false,
    has_serial: false,
    is_featured: false,
    display_order: '1',
    image: '',
  });

  const [syncedId, setSyncedId] = useState<string | null>(null);
  useEffect(() => {
    if (!editId || !loadedProduct) return;
    const pid = String((loadedProduct as any).id);
    if (syncedId === pid) return;
    setSyncedId(pid);
    const p: any = loadedProduct as any;
    setEditingId(String(p.uuid || p.id));
    setFormData({
      name: p.name || '',
      description: p.description || '',
      category_id: p.category_id ? String(p.category_id) : '',
      brand_id: p.brand_id ? String(p.brand_id) : '',
      unit_id: p.unit_id ? String(p.unit_id) : '',
      type: p.type || 'simple',
      status: p.status || 'active',
      is_taxable: !!p.is_taxable,
      tax_rate: String(p.tax_rate ?? 0),
      track_inventory: p.track_inventory !== false,
      allow_backorder: !!p.allow_backorder,
      low_stock_threshold: String(p.low_stock_threshold ?? 10),
      reorder_point: p.reorder_point ? String(p.reorder_point) : '',
      has_expiry: !!p.has_expiry,
      has_batch: !!p.has_batch,
      has_serial: !!p.has_serial,
      is_featured: !!p.is_featured,
      display_order: String(p.display_order ?? 1),
      image: '',
    });
    if (p.business_type) {
      if (typeof p.business_type === 'object' && p.business_type?.name) setBusinessType(p.business_type.name);
      else setBusinessType(String(p.business_type));
    }
    const resolvedBusinessTypeId = (p as any).business_type_id ?? (p as any).business_type?.id;
    if (resolvedBusinessTypeId) setBusinessTypeId(String(resolvedBusinessTypeId));
    if (p.category) setSelectedCategory({ value: String(p.category.id), label: p.category.name });
    if (p.brand) setSelectedBrand({ value: String(p.brand.id), label: p.brand.name });
    else if (p.brand_id) setSelectedBrand({ value: String(p.brand_id), label: `Brand #${p.brand_id}` });
    if (p.unit) setSelectedUnit({ value: String(p.unit.id), label: `${p.unit.name} (${p.unit.short_name})` });
  }, [editId, loadedProduct, syncedId]);

  useEffect(() => {
    if (!formData.category_id) return;
    if (categoryOptions.length === 0) return;
    const matched = categoryOptions.find(o => o.value === formData.category_id);
    if (!matched) return;
    if (!selectedCategory || selectedCategory.value !== matched.value) setSelectedCategory(matched);
  }, [formData.category_id, categoryOptions, selectedCategory]);

  useEffect(() => {
    if (!formData.brand_id) {
      if (selectedBrand) setSelectedBrand(null);
      return;
    }
    if (brandOptions.length === 0) return;
    const matched = brandOptions.find(o => o.value === formData.brand_id);
    if (!matched) return;
    if (!selectedBrand || selectedBrand.value !== matched.value || selectedBrand.label !== matched.label) setSelectedBrand(matched);
  }, [formData.brand_id, brandOptions, selectedBrand]);

  useEffect(() => {
    if (!formData.unit_id) {
      if (selectedUnit) setSelectedUnit(null);
      return;
    }
    if (unitOptions.length === 0) return;
    const matched = unitOptions.find(o => o.value === formData.unit_id);
    if (!matched) return;
    if (!selectedUnit || selectedUnit.value !== matched.value) setSelectedUnit(matched);
  }, [formData.unit_id, unitOptions, selectedUnit]);

  const loadCategoryOptions = async (inputValue: string): Promise<SelectOption[]> => {
    const q = inputValue.trim();
    if (!q) return categoryOptions;
    try {
      const btId = effectiveBtId;
      const data = await commonService.getCategoriesForDropdown({ search: q, business_type_id: btId || undefined });
      return data.map((c: any) => ({ value: String(c.id), label: c.name }));
    } catch {
      return [];
    }
  };

  const loadBrandOptions = async (inputValue: string): Promise<SelectOption[]> => {
    const q = inputValue.trim();
    if (!q) return brandOptions;
    try {
      const btId = effectiveBtId;
      const data = await commonService.getBrandsForDropdown({ search: q, business_type_id: btId || undefined });
      return data.map((b: any) => ({ value: String(b.id), label: b.name }));
    } catch {
      return [];
    }
  };

  const loadUnitOptions = async (inputValue: string): Promise<SelectOption[]> => {
    const q = inputValue.trim();
    if (!q) return unitOptions;
    try {
      const data = await commonService.getUnitsForDropdown({ search: q });
      return data.map((u: any) => ({ value: String(u.id), label: `${u.name} (${u.short_name})` }));
    } catch {
      return [];
    }
  };

  const handleCategoryChange = (option: SelectOption | null) => {
    setSelectedCategory(option);
    setFormData(prev => ({ ...prev, category_id: option?.value || '' }));
    if (errors['category_id']) setErrors(prev => { const n = { ...prev }; delete n['category_id']; return n; });
  };

  const handleBrandChange = (option: SelectOption | null) => {
    setSelectedBrand(option);
    setFormData(prev => ({ ...prev, brand_id: option?.value || '' }));
    if (errors['brand_id']) setErrors(prev => { const n = { ...prev }; delete n['brand_id']; return n; });
  };

  const handleUnitChange = (option: SelectOption | null) => {
    setSelectedUnit(option);
    setFormData(prev => ({ ...prev, unit_id: option?.value || '' }));
    if (errors['unit_id']) setErrors(prev => { const n = { ...prev }; delete n['unit_id']; return n; });
  };

  const handleBusinessTypeChange = (id: string | number | null) => {
    setBusinessTypeId(id ? String(id) : null);
    if (!id) setBusinessType('');
    setSelectedCategory(null);
    setSelectedBrand(null);
    setFormData(prev => ({ ...prev, category_id: '', brand_id: '' }));
    if (errors['business_type']) setErrors(prev => { const n = { ...prev }; delete n['business_type']; return n; });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const getFieldError = (fieldName: string): string | null => errors[fieldName]?.[0] || null;
  const hasFieldError = (fieldName: string): boolean => !!errors[fieldName];

  const inputCls = (hasError?: boolean) =>
    `w-full px-2.5 py-1 text-xs bg-white dark:bg-gray-700 border ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    const effectiveBtIdSubmit = isSuperAdmin ? businessTypeId : tenantBusinessTypeId;
    const validationErrors: Record<string, string[]> = {};
    if (!effectiveBtIdSubmit) validationErrors.business_type = ['Business type is required'];
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
      notify.error('Please fill in all required fields');
      return;
    }
    try {
      const submitData: any = {
        ...formData,
        business_type: businessType,
        business_type_id: effectiveBtIdSubmit,
        tax_rate: formData.tax_rate ? parseFloat(formData.tax_rate) : 0,
        low_stock_threshold: formData.low_stock_threshold ? parseInt(formData.low_stock_threshold) : 10,
        reorder_point: formData.reorder_point ? parseInt(formData.reorder_point) : undefined,
        display_order: formData.display_order ? parseInt(formData.display_order) : 0,
      };
      if (isEditMode) {
        if (!editingId) { notify.error('Product is still loading. Please try again.'); setIsLoading(false); return; }
        await productService.updateProduct(editingId, submitData);
        notify.success('Product updated successfully!');
        await mutate(key => Array.isArray(key) && (key[0] === 'products' || key[0] === 'product'));
        router.push('/products');
      } else {
        await productService.createProduct(submitData);
        notify.success('Product created successfully!');
        await mutate(key => Array.isArray(key) && key[0] === 'products');
        router.push('/products');
      }
    } catch (error: any) {
      if (error.response?.data?.errors) setErrors(error.response.data.errors);
      else notify.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditMode && loadingEdit && !loadedProduct) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 py-12">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Package2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          {isEditMode ? 'Edit Product' : 'Add Product'}
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">Product → Variations (with brand)</span>
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <FormRow label="Name" required error={getFieldError('name')} labelWidth="w-32">
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className={inputCls(hasFieldError('name'))} placeholder="Product name" />
            </FormRow>

            <FormRow label="Business Type" required error={getFieldError('business_type')} labelWidth="w-32">
              {isSuperAdmin ? (
                <BusinessTypeSelect value={businessTypeId} onChange={handleBusinessTypeChange} onChangeDetail={({ name }) => setBusinessType(name || '')} placeholder="Select business type" isInvalid={hasFieldError('business_type')} compact />
              ) : (
                <input type="text" value={typeof tenantBusinessType === 'object' ? (tenantBusinessType as any)?.name || '—' : tenantBusinessType || '—'} disabled className="w-full px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed" />
              )}
            </FormRow>

            <FormRow label="Description" labelWidth="w-32" className="md:col-span-2" error={getFieldError('description')}>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows={2} className={inputCls(hasFieldError('description'))} placeholder="Product description" />
            </FormRow>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Categorization</h3>
          {isSuperAdmin && !businessTypeId && (
            <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-700 dark:text-yellow-300">
              Please select a business type to see available categories and brands
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <FormRow label="Category" required labelWidth="w-20" error={getFieldError('category_id')}>
              <CustomSelect value={selectedCategory} onChange={handleCategoryChange} loadOptions={loadCategoryOptions} defaultOptions={categoryOptions.length > 0 ? categoryOptions : true} placeholder="Search category..." isInvalid={hasFieldError('category_id')} isDisabled={!effectiveBtId} compact />
            </FormRow>

            <FormRow label="Brand" required labelWidth="w-20" error={getFieldError('brand_id')}>
              <CustomSelect value={selectedBrand} onChange={handleBrandChange} loadOptions={loadBrandOptions} defaultOptions={brandOptions.length > 0 ? brandOptions : true} placeholder="Search brand..." isInvalid={hasFieldError('brand_id')} isDisabled={!effectiveBtId} compact />
            </FormRow>

            <FormRow label="Unit" labelWidth="w-20" error={getFieldError('unit_id')}>
              <CustomSelect value={selectedUnit} onChange={handleUnitChange} loadOptions={loadUnitOptions} defaultOptions={unitOptions.length > 0 ? unitOptions : true} placeholder="Search unit..." isInvalid={hasFieldError('unit_id')} isLoading={loadingUnits} compact />
            </FormRow>

            <FormRow label="Type" labelWidth="w-20" error={getFieldError('type')}>
              <select name="type" value={formData.type} onChange={handleInputChange} className={inputCls(hasFieldError('type'))}>
                <option value="simple">Simple Product</option>
                <option value="variable">Variable Product</option>
                <option value="composite">Composite</option>
                <option value="digital">Digital</option>
                <option value="service">Service</option>
              </select>
            </FormRow>

            <FormRow label="Status" labelWidth="w-20" error={getFieldError('status')}>
              <select name="status" value={formData.status} onChange={handleInputChange} className={inputCls(hasFieldError('status'))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
                <option value="archived">Archived</option>
              </select>
            </FormRow>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Inventory & Display Settings</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1 — all inputs label + input wise */}
            <div className="space-y-2">
              <FormRow label="Low Stock Threshold" labelWidth="w-32" error={getFieldError('low_stock_threshold')}>
                <input type="number" name="low_stock_threshold" value={formData.low_stock_threshold} onChange={handleInputChange} min="0" className={inputCls(hasFieldError('low_stock_threshold'))} placeholder="10" />
              </FormRow>
              <FormRow label="Reorder Point" labelWidth="w-32" error={getFieldError('reorder_point')}>
                <input type="number" name="reorder_point" value={formData.reorder_point} onChange={handleInputChange} min="0" className={inputCls(hasFieldError('reorder_point'))} placeholder="Reorder point" />
              </FormRow>
              <FormRow label="Display Order" labelWidth="w-32" error={getFieldError('display_order')}>
                <input type="number" name="display_order" value={formData.display_order} onChange={handleInputChange} min="0" className={inputCls(hasFieldError('display_order'))} placeholder="Display order" />
              </FormRow>
            </div>

            {/* Column 2 — all checkboxes side-by-side (not stacked rows) */}
            <div className="space-y-2.5 lg:pl-4 lg:border-l lg:border-gray-200 lg:dark:border-gray-700">
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Flags</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'track_inventory', label: 'Track Inventory' },
                  { name: 'allow_backorder', label: 'Allow Backorder' },
                  { name: 'has_expiry', label: 'Has Expiry' },
                  { name: 'has_batch', label: 'Has Batch' },
                  { name: 'has_serial', label: 'Has Serial' },
                  { name: 'is_featured', label: 'Featured' },
                ].map(f => (
                  <label key={f.name} className="inline-flex items-center gap-1.5 cursor-pointer rounded-full px-2.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <input type="checkbox" name={f.name} checked={(formData as any)[f.name]} onChange={handleInputChange} className="h-3.5 w-3.5 accent-indigo-600" />
                    <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => router.push('/products')} className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
          {hasPermission(isEditMode ? 'update-product' : 'create-product') && (
            <button type="submit" disabled={isLoading} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded">
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GiSave className="w-3.5 h-3.5" />}
              {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Product' : 'Create Product')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function FormRow({ label, required, error, children, labelWidth = 'w-20', className = '' }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode; labelWidth?: string; className?: string }) {
  const errorMl =
    labelWidth === 'w-32' ? 'ml-[8.5rem]' : labelWidth === 'w-20' ? 'ml-[5.5rem]' : 'ml-[4.375rem]';
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <label className={`${labelWidth} shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-right`}>
          {label}{required && <span className="text-red-500">*</span>}:
        </label>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      {error && <p className={`text-[10px] text-red-500 mt-0.5 ${errorMl}`}>{error}</p>}
    </div>
  );
}
