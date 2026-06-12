'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package2 } from 'lucide-react';
import { notify } from '@/lib/notifications';
import { productService } from '@/services';
import { Brand, Category, Unit } from '@/types/api.types';
import CustomSelect, { SelectOption } from '@/components/ui/custom-select';
import commonService from '@/services/commonService';
import { useAuthStore } from '@/stores/auth-store';
import { usePermissions } from '@/hooks/use-permissions';
import { BUSINESS_TYPES } from '@/lib/constants';
import { GiSave } from 'react-icons/gi';

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

export default function AddProductPageWrapper() {
  return (
    <Suspense fallback={<div className="p-4 text-sm">Loading…</div>}>
      <AddProductPage />
    </Suspense>
  );
}

function AddProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit');
  const user = useAuthStore(state => state.user);
  const { hasPermission, isHydrated } = usePermissions();

  useEffect(() => {
    if (isHydrated && !hasPermission(editId ? 'edit-product' : 'create-product')) {
      router.push('/access-denied');
    }
  }, [hasPermission, isHydrated, router, editId]);
  const isSuperAdmin = user?.user_type === 'super_admin';
  const tenantBusinessType =
    (user as any)?.tenant?.business_type ||
    (user as any)?.business_type ||
    '';

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<SelectOption | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<SelectOption | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<SelectOption | null>(null);
  const [defaultCategoryOptions, setDefaultCategoryOptions] = useState<SelectOption[]>([]);
  const [defaultBrandOptions, setDefaultBrandOptions] = useState<SelectOption[]>([]);
  const [defaultUnitOptions, setDefaultUnitOptions] = useState<SelectOption[]>([]);

  // Business type state — for non-super-admin, locked to their tenant's business_type
  const [businessType, setBusinessType] = useState<string>(isSuperAdmin ? '' : tenantBusinessType);
  const [selectedBusinessType, setSelectedBusinessType] = useState<SelectOption | null>(
    isSuperAdmin
      ? null
      : BUSINESS_TYPES.find((bt) => bt.value === tenantBusinessType) || null
  );

  // Edit-mode state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Track if initial data has been loaded to prevent duplicate API calls
  const hasLoadedData = useRef(false);
  const isLoadingData = useRef(false);

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

  // Load categories for async select with search
  const loadCategoryOptions = useCallback(
    async (inputValue: string): Promise<SelectOption[]> => {
      try {
        const params: { search?: string; business_type?: string } = {};

        // Add search parameter only if inputValue is provided
        if (inputValue && inputValue.trim()) {
          params.search = inputValue.trim();
        }

        // Add business_type filter if set (for tenant users, use their business type)
        if (businessType) {
          params.business_type = businessType;
        }

        console.log('📦 Loading categories with params:', params);
        const categoriesData = await commonService.getCategoriesForDropdown(params);
        console.log('📦 Categories loaded:', categoriesData.length);

        const options = categoriesData.map((category: Category) => ({
          value: category.id.toString(),
          label: category.name,
        }));

        // Store default options for initial load
        if (!inputValue && defaultCategoryOptions.length === 0) {
          setDefaultCategoryOptions(options);
        }

        return options;
      } catch (error) {
        console.error('❌ Failed to load categories:', error);
        return [];
      }
    },
    [businessType]
  );

  // Load brands for async select with search
  const loadBrandOptions = useCallback(
    async (inputValue: string): Promise<SelectOption[]> => {
      try {
        const params: { search?: string; business_type?: string } = {};

        // Add search parameter only if inputValue is provided
        if (inputValue && inputValue.trim()) {
          params.search = inputValue.trim();
        }

        // Add business_type filter if set (for tenant users, use their business type)
        if (businessType) {
          params.business_type = businessType;
        }

        console.log('🏷️ Loading brands with params:', params);
        const brandsData = await commonService.getBrandsForDropdown(params);
        console.log('🏷️ Brands loaded:', brandsData.length);

        const options = brandsData.map((brand: Brand) => ({
          value: brand.id.toString(),
          label: brand.name,
        }));

        // Store default options for initial load
        if (!inputValue && defaultBrandOptions.length === 0) {
          setDefaultBrandOptions(options);
        }

        return options;
      } catch (error) {
        console.error('Failed to load brands:', error);
        return [];
      }
    },
    [businessType]
  );

  // Load units for async select with search
  const loadUnitOptions = useCallback(async (inputValue: string): Promise<SelectOption[]> => {
    try {
      const params: { search?: string } = {};

      // Add search parameter only if inputValue is provided
      if (inputValue && inputValue.trim()) {
        params.search = inputValue.trim();
      }

      const unitsData = await commonService.getUnitsForDropdown(params);

      const options = unitsData.map((unit: Unit) => ({
        value: unit.id.toString(),
        label: `${unit.name} (${unit.short_name})`,
      }));

      // Store default options for initial load
      if (!inputValue && defaultUnitOptions.length === 0) {
        setDefaultUnitOptions(options);
      }

      return options;
    } catch (error) {
      console.error('Failed to load units:', error);
      return [];
    }
  }, []);

  // Load dropdown data when business type is set
  useEffect(() => {
    // Only load when business type is available (either selected by super admin or set from tenant data)
    const shouldLoad = businessType !== '';

    // Prevent duplicate calls
    if (shouldLoad && !hasLoadedData.current && !isLoadingData.current) {
      const loadData = async () => {
        isLoadingData.current = true;
        try {
          await Promise.all([loadCategoryOptions(''), loadBrandOptions(''), loadUnitOptions('')]);
          hasLoadedData.current = true;
        } catch (error) {
          notify.error('Failed to load form data');
        } finally {
          isLoadingData.current = false;
        }
      };
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessType]);

  // Edit mode: load existing product and prefill the form
  useEffect(() => {
    if (!editId) return;
    let mounted = true;
    (async () => {
      try {
        setLoadingEdit(true);
        const res: any = await productService.getProduct(editId!);
        const p = res?.data?.product || res?.product || res;
        if (!mounted || !p) return;
        setEditingId(p.id);
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
        // Reflect business_type in the selector (locked either way)
        if (p.business_type) {
          setBusinessType(p.business_type);
          setSelectedBusinessType(
            BUSINESS_TYPES.find((bt) => bt.value === p.business_type) || null
          );
        }
        // Pre-populate the visible CustomSelect labels
        if (p.category) {
          setSelectedCategory({ value: String(p.category.id), label: p.category.name });
        }
        if (p.brand) {
          setSelectedBrand({ value: String(p.brand.id), label: p.brand.name });
        }
        if (p.unit) {
          setSelectedUnit({
            value: String(p.unit.id),
            label: `${p.unit.name} (${p.unit.short_name})`,
          });
        }
      } catch (err: any) {
        notify.error(err?.response?.data?.message || 'Failed to load product');
      } finally {
        if (mounted) setLoadingEdit(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const handleCategoryChange = (option: SelectOption | null) => {
    setSelectedCategory(option);
    setFormData(prev => ({
      ...prev,
      category_id: option?.value || '',
    }));

    // Clear error for category field
    if (errors['category_id']) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors['category_id'];
        return newErrors;
      });
    }
  };

  const handleBrandChange = (option: SelectOption | null) => {
    setSelectedBrand(option);
    setFormData(prev => ({
      ...prev,
      brand_id: option?.value || '',
    }));

    // Clear error for brand field
    if (errors['brand_id']) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors['brand_id'];
        return newErrors;
      });
    }
  };

  const handleUnitChange = (option: SelectOption | null) => {
    setSelectedUnit(option);
    setFormData(prev => ({
      ...prev,
      unit_id: option?.value || '',
    }));

    // Clear error for unit field
    if (errors['unit_id']) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors['unit_id'];
        return newErrors;
      });
    }
  };

  const handleBusinessTypeChange = (option: SelectOption | null) => {
    setSelectedBusinessType(option);
    setBusinessType(option?.value || '');

    // Reset category and brand selections when business type changes
    setSelectedCategory(null);
    setSelectedBrand(null);
    setFormData(prev => ({
      ...prev,
      category_id: '',
      brand_id: '',
    }));

    // Clear cached options to force reload with new business type
    setDefaultCategoryOptions([]);
    setDefaultBrandOptions([]);

    // Reset loaded state to allow reloading with new business type
    hasLoadedData.current = false;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const getFieldError = (fieldName: string): string | null => {
    return errors[fieldName]?.[0] || null;
  };

  const hasFieldError = (fieldName: string): boolean => {
    return !!errors[fieldName];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Client-side validation
    const validationErrors: Record<string, string[]> = {};

    if (!businessType) {
      validationErrors.business_type = ['Business type is required'];
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
      notify.error('Please fill in all required fields');
      return;
    }

    try {
      // Prepare data for submission
      const submitData = {
        ...formData,
        business_type: businessType, // Add business type
        tax_rate: formData.tax_rate ? parseFloat(formData.tax_rate) : 0,
        low_stock_threshold: formData.low_stock_threshold
          ? parseInt(formData.low_stock_threshold)
          : 10,
        reorder_point: formData.reorder_point ? parseInt(formData.reorder_point) : undefined,
        display_order: formData.display_order ? parseInt(formData.display_order) : 0,
      };

      if (editingId) {
        await productService.updateProduct(editingId, submitData);
        notify.success('Product updated successfully!');
        router.push('/products');
      } else {
        await productService.createProduct(submitData);
        notify.success('Product created successfully!');
        router.push('/products');
      }
    } catch (error: any) {
      console.error('Error saving product:', error);

      // Handle validation errors
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        notify.error(error.response?.data?.message || 'Failed to save product');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Package2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {editingId ? 'Edit Product' : 'Add Product'}
              {loadingEdit && <span className="text-xs text-gray-500 ml-2">Loading…</span>}
            </h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-1" autoComplete="off">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border ${hasFieldError('name')
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400'
                    } rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                  placeholder="Enter product name"
                />
                {hasFieldError('name') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('name')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Type <span className="text-red-500">*</span>
                </label>
                {isSuperAdmin ? (
                  <CustomSelect
                    value={selectedBusinessType}
                    onChange={handleBusinessTypeChange}
                    options={BUSINESS_TYPES.map(bt => ({ value: bt.value, label: bt.label }))}
                    placeholder="Select business type..."
                    isInvalid={hasFieldError('business_type')}
                  />
                ) : (
                  <input
                    type="text"
                    value={selectedBusinessType?.label || tenantBusinessType || '—'}
                    disabled
                    className="w-full px-2.5 py-1 text-sm bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                )}
                {hasFieldError('business_type') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('business_type')}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={2}
                className={`w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border ${hasFieldError('description')
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400'
                  } rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                placeholder="Enter product description"
              />
              {hasFieldError('description') && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {getFieldError('description')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Categorization */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Categorization
            </h3>

            {/* Show message if super admin hasn't selected business type */}
            {isSuperAdmin && !businessType && (
              <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-700 dark:text-yellow-300">
                Please select a business type to see available categories and brands
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  loadOptions={loadCategoryOptions}
                  defaultOptions={defaultCategoryOptions.length > 0 ? defaultCategoryOptions : true}
                  placeholder="Search category..."
                  isInvalid={hasFieldError('category_id')}
                />
                {hasFieldError('category_id') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('category_id')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Brand <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={selectedBrand}
                  onChange={handleBrandChange}
                  loadOptions={loadBrandOptions}
                  defaultOptions={defaultBrandOptions.length > 0 ? defaultBrandOptions : true}
                  placeholder="Search brand..."
                  isInvalid={hasFieldError('brand_id')}
                />
                {hasFieldError('brand_id') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('brand_id')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit
                </label>
                <CustomSelect
                  value={selectedUnit}
                  onChange={handleUnitChange}
                  loadOptions={loadUnitOptions}
                  defaultOptions={defaultUnitOptions.length > 0 ? defaultUnitOptions : true}
                  placeholder="Search unit..."
                  isInvalid={hasFieldError('unit_id')}
                />
                {hasFieldError('unit_id') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('unit_id')}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className={`w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border ${hasFieldError('type')
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400'
                    } rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                >
                  <option value="simple">Simple Product</option>
                  <option value="variable">Variable Product</option>
                </select>
                {hasFieldError('type') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('type')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={`w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border ${hasFieldError('status')
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400'
                    } rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {hasFieldError('status') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('status')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing & Tax */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Pricing & Tax
            </h3>
            {/* Product-level pricing removed; prices managed on product variations */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  name="tax_rate"
                  value={formData.tax_rate}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className={`w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border ${hasFieldError('tax_rate')
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400'
                    } rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                  placeholder="0.00"
                />
                {hasFieldError('tax_rate') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('tax_rate')}
                  </p>
                )}
              </div>

              <div className="flex items-center mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_taxable"
                    checked={formData.is_taxable}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Is Taxable</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory & Display Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Inventory & Display Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  name="low_stock_threshold"
                  value={formData.low_stock_threshold}
                  onChange={handleInputChange}
                  min="0"
                  className={`w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border ${hasFieldError('low_stock_threshold')
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400'
                    } rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                  placeholder="10"
                />
                {hasFieldError('low_stock_threshold') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('low_stock_threshold')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reorder Point
                </label>
                <input
                  type="number"
                  name="reorder_point"
                  value={formData.reorder_point}
                  onChange={handleInputChange}
                  min="0"
                  className={`w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border ${hasFieldError('reorder_point')
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400'
                    } rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                  placeholder="Reorder point"
                />
                {hasFieldError('reorder_point') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('reorder_point')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  name="display_order"
                  value={formData.display_order}
                  onChange={handleInputChange}
                  min="0"
                  className={`w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border ${hasFieldError('display_order')
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400'
                    } rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                  placeholder="Display order"
                />
                {hasFieldError('display_order') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('display_order')}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-3">
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="track_inventory"
                    checked={formData.track_inventory}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Track Inventory</span>
                </label>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="allow_backorder"
                    checked={formData.allow_backorder}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Allow Backorder</span>
                </label>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="has_expiry"
                    checked={formData.has_expiry}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Has Expiry</span>
                </label>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="has_batch"
                    checked={formData.has_batch}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Has Batch</span>
                </label>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="has_serial"
                    checked={formData.has_serial}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Has Serial</span>
                </label>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Featured Product</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-start">
          {hasPermission(editingId ? 'update-products' : 'create-products') && (
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GiSave className="w-4 h-4" />
              {isLoading
                ? (editingId ? 'Updating...' : 'Creating...')
                : (editingId ? 'Update Product' : 'Create Product')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
