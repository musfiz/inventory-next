'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Save, Plus, X, RefreshCw } from 'lucide-react';
import { notify } from '@/lib/notifications';
import productVariationService from '@/services/productVariationService';
import CustomSelect, { SelectOption } from '@/components/ui/custom-select';
import type { Product, Attribute, AttributeValue, VariationAttributeInput } from '@/types/api.types';
import commonService from "@/services/commonService";

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
  const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>([]);
  const [selectedAttributeForAdd, setSelectedAttributeForAdd] = useState<SelectOption | null>(null);
  const [selectedValueForAdd, setSelectedValueForAdd] = useState<SelectOption | null>(null);
  const [generatingSku, setGeneratingSku] = useState(false);
  const [defaultProductOptions, setDefaultProductOptions] = useState<SelectOption[]>([]);

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
    display_order: '0',
  });

  // Update available attributes when selected attributes change
  useEffect(() => {
    const usedAttributeIds = selectedAttributes.map(sa => sa.attribute.id);
    setAvailableAttributes(attributes.filter(attr => !usedAttributeIds.includes(attr.id)));
  }, [selectedAttributes, attributes]);

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

  const loadAttributes = useCallback(async (businessType: string) => {
    try {
      const attributesData = await productVariationService.getAttributes(businessType);
      setAttributes(attributesData);
    } catch (error) {
      console.error('Error loading attributes:', error);
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
        loadAttributes(product.business_type);
      }
    } catch (error) {
      console.error('Error loading product details:', error);
    }
  }, [selectedProduct, loadAttributes]);

  // Load attributes when product is selected
  useEffect(() => {
    if (selectedProduct) {
      loadProductAndAttributes();
    }
  }, [selectedProduct, loadProductAndAttributes]);

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

      // Store default options for initial load
      if (!inputValue && defaultProductOptions.length === 0) {
        setDefaultProductOptions(options);
      }

      return options;
    } catch (error) {
      console.error('Failed to load products:', error);
      return [];
    }
  }, [defaultProductOptions.length]);

  // Load initial product options on mount
  useEffect(() => {
    loadProductOptions('');
  }, [loadProductOptions]);

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

  const handleGenerateSku = async () => {
    setGeneratingSku(true);
    try {
      const sku = await productVariationService.generateSku(formData.product_id || undefined);
      setFormData(prev => ({ ...prev, sku }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors['sku'];
        return newErrors;
      });
    } catch (error) {
      notify.error('Failed to generate SKU');
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

    // Reset selection
    setSelectedAttributeForAdd(null);
    setSelectedValueForAdd(null);
  };

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
        is_active: formData.is_active,
        is_default: formData.is_default,
        display_order: parseInt(formData.display_order) || 0,
        attributes: attributes.length > 0 ? attributes : undefined,
      };

      await productVariationService.createVariation(submitData);
      notify.success('Product variation created successfully!');
      router.push('/product-variations');
    } catch (error: any) {
      console.error('Error creating variation:', error);

      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        notify.error(error.response?.data?.message || 'Failed to create variation');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const attributeOptions: SelectOption[] = availableAttributes.map(a => ({
    value: a.id,
    label: a.name,
  }));

  const selectedAttribute = attributes.find(a => a.id === selectedAttributeForAdd?.value);
  const valueOptions: SelectOption[] = selectedAttribute?.values?.map(v => ({
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
                  SKU <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    className={`flex-1 px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border ${hasFieldError('sku')
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400'
                      } rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                    placeholder="SKU"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateSku}
                    disabled={generatingSku}
                    className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-sm transition-colors disabled:opacity-50 text-sm"
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

        {/* Attributes Section */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Variation Attributes
            </h3>

            {/* Add Attribute Controls */}
            {selectedProduct && availableAttributes.length > 0 && (
              <div className="mb-3 p-2.5 bg-gray-50 dark:bg-gray-900 rounded-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Attribute
                    </label>
                    <CustomSelect
                      value={selectedAttributeForAdd}
                      onChange={setSelectedAttributeForAdd}
                      options={attributeOptions}
                      placeholder="Select attribute..."
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
                      placeholder="Select value..."
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
                selectedAttributes.map((sa) => (
                  <div
                    key={sa.attribute.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 rounded-full text-sm font-medium"
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
                    min="0"
                    className={`w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border ${hasFieldError('cost_price')
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
                    min="0"
                    className={`w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border ${hasFieldError('selling_price')
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

          {/* Status & Options */}
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <div className="mb-2">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Status & Options
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label className="ml-2 text-xs text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                </div>

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
                    className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {isLoading ? 'Saving...' : 'Save Variation'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
