'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Save, Plus, X, RefreshCw } from 'lucide-react';
import { notify } from '@/lib/notifications';
import productVariationService from '@/services/productVariationService';
import attributeService from '@/services/attributeService';
import attributeValueService from '@/services/attributeValueService';
import CustomSelect, { SelectOption } from '@/components/ui/custom-select';
import type {
  Product,
  Attribute,
  AttributeValue,
  VariationAttributeInput,
} from '@/types/api.types';
import commonService from '@/services/commonService';

interface VariationFormData {
  product_id: string;
  sku: string;
  name: string;
  cost_price: string;
  selling_price: string;
  dp: string;
  mrp: string;
  is_active: boolean;
  is_default: boolean;
  display_order: string;
}

interface SelectedAttribute {
  attribute: Attribute;
  value: AttributeValue;
  display_order: number;
}

export default function AddProductVariationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<SelectOption | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<SelectedAttribute[]>([]);
  const [selectedAttributeForAdd, setSelectedAttributeForAdd] = useState<SelectOption | null>(null);
  const [selectedValueForAdd, setSelectedValueForAdd] = useState<SelectOption | null>(null);
  const [generatingSku, setGeneratingSku] = useState(false);
  const [defaultProductOptions, setDefaultProductOptions] = useState<SelectOption[]>([]);
  const [businessType, setBusinessType] = useState<string>('');

  const [formData, setFormData] = useState<VariationFormData>({
    product_id: '',
    sku: '',
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

  // Auto-generate variation name from attributes
  useEffect(() => {
    if (selectedAttributes.length > 0) {
      const name = selectedAttributes
        .sort((a, b) => a.display_order - b.display_order)
        .map(sa => sa.value.display_value || sa.value.value)
        .join(' - ');
      setFormData(prev => ({ ...prev, name }));
    }
  }, [selectedAttributes]);

  const loadAttributes = useCallback(async () => {
    try {
      const attributesData = await productVariationService.getAttributes();
      setAttributes(attributesData);
    } catch (error) {
      notify.error('Failed to load attributes');
    }
  }, []);

  const loadProductAndAttributes = useCallback(async () => {
    if (!selectedProduct?.value) return;

    try {
      // Fetch the product details to get business_type
      const params = { search: selectedProduct.label };
      const productsData: Product[] = await commonService.getProductsForDropdown(params);
      const product = productsData.find((p: Product) => p.id === selectedProduct.value);

      if (product?.business_type) {
        setBusinessType(product.business_type);
        await loadAttributes();
      }
    } catch (error) {
      console.error('Error loading product details:', error);
    }
  }, [selectedProduct, loadAttributes]);

  // Load attributes for async select with search
  const loadAttributeOptions = useCallback(
    async (inputValue: string): Promise<SelectOption[]> => {
      try {
        const attributesData = await attributeService.searchAttributes(inputValue || undefined, 10);

        // Filter out already selected attributes
        const usedAttributeIds = selectedAttributes.map(sa => sa.attribute.id);
        const availableAttrs = attributesData.filter(attr => !usedAttributeIds.includes(attr.id));

        const options = availableAttrs.map((attribute: Attribute) => ({
          value: attribute.id,
          label: attribute.name,
        }));

        return options;
      } catch (error) {
        console.error('Failed to load attributes:', error);
        return [];
      }
    },
    [businessType, selectedAttributes]
  );

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

  // Load default product options on mount
  useEffect(() => {
    const loadDefaultProducts = async () => {
      const options = await loadProductOptions('');
      setDefaultProductOptions(options);
    };

    loadDefaultProducts();
  }, [loadProductOptions]);

  // Load product details and attributes when product is selected
  useEffect(() => {
    if (selectedProduct) {
      loadProductAndAttributes();
    }
  }, [selectedProduct, loadProductAndAttributes]);

  const handleProductChange = (option: SelectOption | null) => {
    setSelectedProduct(option);
    setFormData(prev => ({
      ...prev,
      product_id: option?.value || '',
    }));
    // Reset attributes when product changes
    setSelectedAttributes([]);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors['product_id'];
      return newErrors;
    });
  };

  /**
   * Generate SKU based on product name and selected attributes
   * Format: PRODUCT-INITIALS-ATTRIBUTE1-INITIALS-NUMBERS
   * Example: Ceiling Fan with Royal Blue and 48 Inch -> CF-RB-48
   */
  const handleGenerateSku = async () => {
    if (!formData.product_id) {
      notify.error('Please select a product first');
      return;
    }

    setGeneratingSku(true);
    try {
      // Get product name from selected product
      const productName = selectedProduct?.label || '';

      // Get attribute values as text array (display_value or value)
      // Filter out any undefined/empty values to ensure string[]
      const attributeValues = selectedAttributes
        .map(sa => sa.value.value || sa.value.display_value || '')
        .filter(val => val.trim() !== '');

      // Generate SKU with product name and attribute values as text
      const sku = await productVariationService.generateSku(
        formData.product_id,
        productName,
        attributeValues.length > 0 ? attributeValues : undefined
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
  };

  const handleAddAttribute = () => {
    if (!selectedAttributeForAdd || !selectedValueForAdd) {
      notify.error('Please select both attribute and value');
      return;
    }

    const attribute = attributes.find(a => a.id === selectedAttributeForAdd.value);
    const value = attribute?.values?.find(v => v.id === selectedValueForAdd.value);

    if (!attribute || !value) return;

    // Check if attribute already added
    if (selectedAttributes.some(sa => sa.attribute.id === attribute.id)) {
      notify.error('This attribute is already added');
      return;
    }

    setSelectedAttributes(prev => [
      ...prev,
      {
        attribute,
        value,
        display_order: prev.length,
      },
    ]);

    // Reset selections to blank state
    setSelectedValueForAdd(null);
    setSelectedAttributeForAdd(null);
  };

  // Handle attribute selection change: reset value and load attribute values
  useEffect(() => {
    // Reset value when attribute changes
    setSelectedValueForAdd(null);

    // Load attribute values if an attribute is selected
    const loadAttributeValues = async () => {
      if (!selectedAttributeForAdd?.value) return;

      try {
        // Fetch attribute values
        const attributeValues = await attributeValueService.getAttributeValues(
          selectedAttributeForAdd.value
        );

        // Update or create attribute in state with values
        setAttributes(prev => {
          // Check if we already have this attribute with values
          const existingIndex = prev.findIndex(a => a.id === selectedAttributeForAdd.value);

          if (existingIndex >= 0) {
            // Skip if already has values
            if (prev[existingIndex].values && prev[existingIndex].values!.length > 0) {
              return prev;
            }
            // Update existing attribute with values
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              values: attributeValues,
            };
            return updated;
          } else {
            // Create minimal attribute object with values
            return [
              ...prev,
              {
                id: selectedAttributeForAdd.value,
                name: selectedAttributeForAdd.label,
                values: attributeValues,
              } as Attribute,
            ];
          }
        });
      } catch (error) {
        console.error('Error loading attribute values:', error);
        notify.error('Failed to load attribute values');
      }
    };

    loadAttributeValues();
  }, [selectedAttributeForAdd]);

  const handleRemoveAttribute = (attributeId: string) => {
    setSelectedAttributes(prev =>
      prev
        .filter(sa => sa.attribute.id !== attributeId)
        .map((sa, index) => ({ ...sa, display_order: index }))
    );
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Prepare attributes data
      const attributes: VariationAttributeInput[] = selectedAttributes.map(sa => ({
        attribute_id: sa.attribute.id,
        attribute_value_id: sa.value.id,
        display_order: sa.display_order,
      }));

      const submitData = {
        product_id: formData.product_id,
        sku: formData.sku,
        name: formData.name,
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        dp: formData.dp ? parseFloat(formData.dp) : undefined,
        mrp: formData.mrp ? parseFloat(formData.mrp) : undefined,
        is_active: statusValue === '1',
        is_default: formData.is_default,
        // display_order will be set automatically by backend (last row + 1)
        attributes: attributes.length > 0 ? attributes : undefined,
      };

      await productVariationService.createVariation(submitData);
      notify.success('Product variation created successfully!');
      router.push('/product-variations');
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

  // Find selected attribute from both loaded attributes and the selectedAttributeForAdd
  const getSelectedAttribute = (): Attribute | undefined => {
    if (!selectedAttributeForAdd?.value) return undefined;

    // First try to find in already loaded attributes
    let attr = attributes.find(a => a.id === selectedAttributeForAdd.value);

    // If not found, check in selected attributes
    if (!attr) {
      attr = selectedAttributes.find(
        sa => sa.attribute.id === selectedAttributeForAdd.value
      )?.attribute;
    }

    return attr;
  };

  const selectedAttribute = getSelectedAttribute();

  const valueOptions: SelectOption[] =
    selectedAttribute?.values?.map(v => ({
      value: v.id,
      label: v.display_value || v.value,
    })) || [];

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Add Product Variation
            </h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-1" autoComplete="off">
        {/* Product Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Product Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={selectedProduct}
                  onChange={handleProductChange}
                  loadOptions={loadProductOptions}
                  defaultOptions={defaultProductOptions.length > 0 ? defaultProductOptions : true}
                  placeholder="Search product..."
                  isInvalid={hasFieldError('product_id')}
                />
                {hasFieldError('product_id') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('product_id')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={statusValue}
                  onChange={e => setStatusValue(e.target.value)}
                  className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none"
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </div>

            {/* Status & Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_default"
                  checked={formData.is_default}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label className="ml-2 text-xs text-gray-700 dark:text-gray-300">
                  Set as Default
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Attributes Section */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Variation Attributes
            </h3>

            {/* Add Attribute Controls */}
            {selectedProduct && (
              <div className="mb-3 p-2.5 bg-gray-50 dark:bg-gray-900 rounded-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Attribute
                    </label>
                    <CustomSelect
                      value={selectedAttributeForAdd}
                      onChange={setSelectedAttributeForAdd}
                      loadOptions={loadAttributeOptions}
                      defaultOptions={true}
                      placeholder="Search attributes..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Value
                    </label>
                    <CustomSelect
                      value={selectedValueForAdd}
                      onChange={setSelectedValueForAdd}
                      options={valueOptions}
                      placeholder={
                        !selectedAttributeForAdd
                          ? 'Select attribute first...'
                          : valueOptions.length === 0
                            ? 'Loading values...'
                            : 'Select value...'
                      }
                      isDisabled={!selectedAttributeForAdd}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddAttribute}
                      disabled={!selectedAttributeForAdd || !selectedValueForAdd}
                      className="px-2.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-5" />
                      Add Attribute
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Attributes (Pills) */}
            <div className="flex flex-wrap gap-2">
              {selectedAttributes.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  No attributes added yet
                </p>
              ) : (
                selectedAttributes.map(sa => (
                  <div
                    key={sa.attribute.id}
                    className="inline-flex items-center gap-2 px-2 py-1 bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 rounded-full text-xs font-medium"
                  >
                    <span>
                      {sa.attribute.name}: {sa.value.display_value || sa.value.value}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttribute(sa.attribute.id)}
                      className="hover:text-indigo-900 dark:hover:text-indigo-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Auto-generated Name */}
            {formData.name && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-sm">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Attribute Name:</strong> {formData.name}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SKU Section - Moved after Attributes */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              SKU Information
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SKU <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    className={`flex-1 px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border ${
                      hasFieldError('sku')
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400'
                    } rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                    placeholder="Enter SKU or generate one"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateSku}
                    disabled={generatingSku}
                    className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-sm transition-colors disabled:opacity-50 text-sm  cursor-pointer"
                    title="Generate SKU"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${generatingSku ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {hasFieldError('sku') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('sku')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Pricing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cost Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="cost_price"
                  value={formData.cost_price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0.01"
                  className={`w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border ${
                    hasFieldError('cost_price')
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400'
                  } rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                  placeholder="0.00"
                />
                {hasFieldError('cost_price') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('cost_price')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selling Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="selling_price"
                  value={formData.selling_price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0.01"
                  className={`w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border ${
                    hasFieldError('selling_price')
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400'
                  } rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                  placeholder="0.00"
                />
                {hasFieldError('selling_price') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('selling_price')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  DP
                </label>
                <input
                  type="number"
                  name="dp"
                  value={formData.dp}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  MRP
                </label>
                <input
                  type="number"
                  name="mrp"
                  value={formData.mrp}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-start gap-2 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {isLoading ? 'Saving...' : 'Save Variation'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
