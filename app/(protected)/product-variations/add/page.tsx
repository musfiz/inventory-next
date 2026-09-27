'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Package2, RefreshCw, Loader2 } from 'lucide-react';
import { notify } from '@/lib/notifications';
import productVariationService from '@/services/productVariationService';
import CustomSelect, { SelectOption } from '@/components/ui/custom-select';
import type { Product } from '@/types/api.types';
import commonService from '@/services/commonService';
import { GiSave } from 'react-icons/gi';

interface VariationFormData {
  product_id: string;
  brand_id: string;
  sku: string;
  product_code: string;
  name: string;
  cost_price: string;
  selling_price: string;
  dp: string;
  mrp: string;
  is_active: boolean;
  is_default: boolean;
  display_order: string;
}

type PriceMode = 'dp' | 'mrp';

export default function AddProductVariationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [selectedProduct, setSelectedProduct] = useState<SelectOption | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<SelectOption | null>(null);
  const [generatingSku, setGeneratingSku] = useState(false);
  const [defaultProductOptions, setDefaultProductOptions] = useState<SelectOption[]>([]);
  const [defaultBrandOptions, setDefaultBrandOptions] = useState<SelectOption[]>([]);
  const [priceMode, setPriceMode] = useState<PriceMode>('dp');

  const [formData, setFormData] = useState<VariationFormData>({
    product_id: '',
    brand_id: '',
    sku: '',
    product_code: '',
    name: '',
    cost_price: '',
    selling_price: '',
    dp: '',
    mrp: '',
    is_active: true,
    is_default: false,
    display_order: '0', // Will be set automatically by backend
  });

  const [statusValue, setStatusValue] = useState<string>('1'); // 1 = Active, 0 = Inactive

  // Load products for async select with search
  const loadProductOptions = useCallback(async (inputValue: string): Promise<SelectOption[]> => {
    try {
      const params: { search?: string } = {};

      // Add search parameter only if inputValue is provided
      if (inputValue && inputValue.trim()) {
        params.search = inputValue.trim();
      }

      const productsData = await commonService.getProductsForDropdown(params);

      const options = productsData.map((product: Product) => ({
        value: product.id,
        label: product.name,
      }));

      return options;
    } catch (error) {
      console.error('Failed to load products:', error);
      return [];
    }
  }, []);

  const loadBrandOptions = useCallback(async (inputValue: string): Promise<SelectOption[]> => {
    try {
      const params: { search?: string } = {};
      if (inputValue && inputValue.trim()) {
        params.search = inputValue.trim();
      }
      const brandsData = await commonService.getBrandsForDropdown(params);
      return brandsData.map((brand: any) => ({
        value: String(brand.id),
        label: brand.name,
      }));
    } catch (error) {
      console.error('Failed to load brands:', error);
      return [];
    }
  }, []);

  // Load default product options on mount
  useEffect(() => {
    const loadDefaultProducts = async () => {
      const options = await loadProductOptions('');
      setDefaultProductOptions(options);
    };

    loadDefaultProducts();
  }, [loadProductOptions]);

  // Load default brand options on mount
  useEffect(() => {
    const loadDefaultBrands = async () => {
      const options = await loadBrandOptions('');
      setDefaultBrandOptions(options);
    };

    loadDefaultBrands();
  }, [loadBrandOptions]);

  const handleProductChange = (option: SelectOption | null) => {
    setSelectedProduct(option);
    setFormData(prev => ({
      ...prev,
      product_id: option?.value || '',
    }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors['product_id'];
      return newErrors;
    });
  };

  const handleBrandChange = (option: SelectOption | null) => {
    setSelectedBrand(option);
    setFormData(prev => ({
      ...prev,
      brand_id: option?.value || '',
    }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors['brand_id'];
      return newErrors;
    });
  };

  /**
   * Generate SKU based on the product name and the free-text attribute name.
   * Format: PRODUCT-INITIALS-ATTRIBUTE-SEQ
   * Example: Ceiling Fan + Royal Blue -> CFAN-RB-001
   */
  const handleGenerateSku = useCallback(async () => {
    if (!formData.product_id) {
      notify.error('Please select a product first');
      return;
    }

    setGeneratingSku(true);
    try {
      const productName = selectedProduct?.label || '';
      const attributeName = formData.name.trim();

      const sku = await productVariationService.generateSku(
        formData.product_id,
        productName,
        attributeName ? [attributeName] : undefined
      );

      setFormData(prev => ({ ...prev, sku }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors['sku'];
        return newErrors;
      });
    } catch (error: any) {
      notify.error(error.response?.data?.message || 'Failed to generate SKU');
    } finally {
      setGeneratingSku(false);
    }
  }, [formData.product_id, formData.name, selectedProduct]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

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

  const inputCls = (hasError?: boolean) =>
    `w-full px-2.5 py-1 text-xs bg-white dark:bg-gray-700 border ${
      hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
    } rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const submitData = {
        product_id: formData.product_id,
        brand_id: formData.brand_id || undefined,
        sku: formData.sku,
        product_code: formData.product_code?.trim() || undefined,
        name: formData.name.trim(),
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        // Only the active price tier is submitted; the other is left untouched.
        dp: priceMode === 'dp' && formData.dp !== '' ? parseFloat(formData.dp) : undefined,
        mrp: priceMode === 'mrp' && formData.mrp !== '' ? parseFloat(formData.mrp) : undefined,
        price_mode: priceMode,
        is_active: statusValue === '1',
        is_default: formData.is_default,
        // display_order will be set automatically by backend (last row + 1)
      };

      await productVariationService.createVariation(submitData);
      notify.success('Product variation created successfully!');
      // Clear the form instead of navigating away
      clearForm();
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        notify.error(error.response?.data?.message || 'Failed to create variation');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      product_id: '',
      brand_id: '',
      sku: '',
      product_code: '',
      name: '',
      cost_price: '',
      selling_price: '',
      dp: '',
      mrp: '',
      is_active: true,
      is_default: false,
      display_order: '0',
    });

    setSelectedProduct(null);
    setSelectedBrand(null);
    setGeneratingSku(false);
    setPriceMode('dp');
    setStatusValue('1');
    setErrors({});
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Package2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Add Product Variation
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
            Product → Variation
          </span>
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
        {/* Product Information */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Product Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <FormRow label="Product" required error={getFieldError('product_id')} labelWidth="w-32">
              <CustomSelect
                value={selectedProduct}
                onChange={handleProductChange}
                loadOptions={loadProductOptions}
                defaultOptions={defaultProductOptions.length > 0 ? defaultProductOptions : true}
                placeholder="Search product..."
                isInvalid={hasFieldError('product_id')}
                compact
              />
            </FormRow>

            <FormRow label="Brand" labelWidth="w-32" error={getFieldError('brand_id')}>
              <CustomSelect
                value={selectedBrand}
                onChange={handleBrandChange}
                loadOptions={loadBrandOptions}
                defaultOptions={defaultBrandOptions.length > 0 ? defaultBrandOptions : true}
                placeholder="Search brand..."
                isInvalid={hasFieldError('brand_id')}
                compact
              />
            </FormRow>

            <FormRow label="Status" required labelWidth="w-32" error={getFieldError('is_active')}>
              <select
                name="status"
                value={statusValue}
                onChange={e => setStatusValue(e.target.value)}
                className={inputCls(hasFieldError('is_active'))}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </FormRow>

            <FormRow label="Options" labelWidth="w-32">
              <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-full px-2.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <input
                  type="checkbox"
                  name="is_default"
                  checked={formData.is_default}
                  onChange={handleInputChange}
                  className="h-3.5 w-3.5 accent-indigo-600"
                />
                <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Set as Default
                </span>
              </label>
            </FormRow>
          </div>
        </div>

        {/* Variation Attribute */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Variation Attribute
          </h3>
          <div className="grid grid-cols-1 gap-y-2">
            <FormRow label="Attribute Name" labelWidth="w-32" error={getFieldError('name')}>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                onBlur={() => {
                  if (formData.product_id && !generatingSku) {
                    handleGenerateSku();
                  }
                }}
                className={inputCls(hasFieldError('name'))}
                placeholder="e.g. Color: Red or Royal Blue"
              />
            </FormRow>
          </div>
          <p className="mt-2 ml-[8.5rem] text-[11px] text-gray-500 dark:text-gray-400">
            Enter the variation attribute directly (e.g. <span className="font-medium">Color: Red</span>).
            The SKU is generated automatically when you leave this field.
          </p>
        </div>

        {/* Codes */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Codes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <FormRow label="SKU" required error={getFieldError('sku')} labelWidth="w-32">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  className={inputCls(hasFieldError('sku'))}
                  placeholder="Enter SKU or generate one"
                />
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  disabled={generatingSku}
                  className="shrink-0 inline-flex items-center justify-center h-8 w-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Generate SKU"
                >
                  {generatingSku ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </FormRow>

            <FormRow label="Product Code" labelWidth="w-32" error={getFieldError('product_code')}>
              <input
                type="text"
                name="product_code"
                value={formData.product_code}
                onChange={handleInputChange}
                className={`${inputCls(hasFieldError('product_code'))} font-mono`}
                placeholder="Scan or enter company barcode"
              />
            </FormRow>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <FormRow label="Cost Price" required error={getFieldError('cost_price')} labelWidth="w-32">
              <input
                type="number"
                name="cost_price"
                value={formData.cost_price}
                onChange={handleInputChange}
                step="0.01"
                min="0.01"
                className={inputCls(hasFieldError('cost_price'))}
                placeholder="0.00"
              />
            </FormRow>

            <FormRow label="Selling Price" required error={getFieldError('selling_price')} labelWidth="w-32">
              <input
                type="number"
                name="selling_price"
                value={formData.selling_price}
                onChange={handleInputChange}
                step="0.01"
                min="0.01"
                className={inputCls(hasFieldError('selling_price'))}
                placeholder="0.00"
              />
            </FormRow>
          </div>

          {/* Price tier switcher — DP or MRP is active at a time */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
              <FormRow label="Price Type" labelWidth="w-32">
                <div className="inline-flex rounded border border-gray-300 dark:border-gray-600 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPriceMode('dp')}
                    className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      priceMode === 'dp'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    DP Price
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceMode('mrp')}
                    className={`px-3 py-1 text-xs font-medium border-l border-gray-300 dark:border-gray-600 transition-colors cursor-pointer ${
                      priceMode === 'mrp'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    MRP Price
                  </button>
                </div>
              </FormRow>

              {priceMode === 'dp' ? (
                <FormRow label="DP Price" error={getFieldError('dp')} labelWidth="w-32">
                  <input
                    type="number"
                    name="dp"
                    value={formData.dp}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className={inputCls(hasFieldError('dp'))}
                    placeholder="0.00"
                  />
                </FormRow>
              ) : (
                <FormRow label="MRP Price" error={getFieldError('mrp')} labelWidth="w-32">
                  <input
                    type="number"
                    name="mrp"
                    value={formData.mrp}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className={inputCls(hasFieldError('mrp'))}
                    placeholder="0.00"
                  />
                </FormRow>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded transition-colors cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GiSave className="w-3.5 h-3.5" />}
            {isLoading ? 'Saving...' : 'Save Variation'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormRow({
  label,
  required,
  error,
  children,
  labelWidth = 'w-20',
  className = '',
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
  labelWidth?: string;
  className?: string;
}) {
  const errorMl =
    labelWidth === 'w-32' ? 'ml-[8.5rem]' : labelWidth === 'w-20' ? 'ml-[5.5rem]' : 'ml-[4.375rem]';
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <label className={`${labelWidth} shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-right`}>
          {label}
          {required && <span className="text-red-500">*</span>}:
        </label>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      {error && <p className={`text-[10px] text-red-500 mt-0.5 ${errorMl}`}>{error}</p>}
    </div>
  );
}
