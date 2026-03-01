'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package2, Save, ArrowLeft } from 'lucide-react';
import { notify } from '@/lib/notifications';
import { productService } from '@/services';
import { Brand, Category, Unit } from '@/types/api.types';

interface ProductFormData {
  name: string;
  description: string;
  short_description: string;
  sku: string;
  gtin: string;
  ean: string;
  upc: string;
  isbn: string;
  mpn: string;
  manufacturer: string;
  manufacturer_sku: string;
  category_id: string;
  brand_id: string;
  unit_id: string;
  type: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
  status: 'draft' | 'active' | 'inactive' | 'discontinued' | 'archived';
  cost_price: number;
  base_price: number;
  mrp: number;
  compare_at_price: number;
  tax_rate: number;
  is_taxable: boolean;
  weight: number;
  length: number;
  width: number;
  height: number;
  track_inventory: boolean;
  manage_stock: boolean;
  allow_backorder: boolean;
  low_stock_threshold: number;
  reorder_point: number;
  reorder_quantity: number;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  is_on_sale: boolean;
  available_from: string;
  available_until: string;
  display_order: number;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  custom_fields?: Record<string, any>;
}

export default function AddProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    short_description: '',
    sku: '',
    gtin: '',
    ean: '',
    upc: '',
    isbn: '',
    mpn: '',
    manufacturer: '',
    manufacturer_sku: '',
    category_id: '',
    brand_id: '',
    unit_id: '',
    type: 'simple',
    status: 'draft',
    cost_price: 0,
    base_price: 0,
    mrp: 0,
    compare_at_price: 0,
    tax_rate: 0,
    is_taxable: true,
    weight: 0,
    length: 0,
    width: 0,
    height: 0,
    track_inventory: true,
    manage_stock: true,
    allow_backorder: false,
    low_stock_threshold: 0,
    reorder_point: 0,
    reorder_quantity: 0,
    is_featured: false,
    is_new: false,
    is_bestseller: false,
    is_on_sale: false,
    available_from: '',
    available_until: '',
    display_order: 0,
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    custom_fields: {},
  });

  // Load dropdown data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [brandsData, categoriesData, unitsData] = await Promise.all([
          productService.getBrands({ per_page: 100 }),
          productService.getCategories({ per_page: 100 }),
          productService.getUnits({ per_page: 100 }),
        ]);
        setBrands(brandsData.data);
        setCategories(categoriesData.data);
        setUnits(unitsData.data);
      } catch (error) {
        notify.error('Failed to load form data');
      }
    };
    loadData();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
             type === 'number' ? (value === '' ? 0 : parseFloat(value) || 0) : value,
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

  const getFieldError = (fieldName: string) => {
    return errors[fieldName]?.[0] || null;
  };

  const getInputClassName = (fieldName: string, baseClassName: string) => {
    const hasError = !!errors[fieldName];
    return hasError
      ? baseClassName.replace('border-gray-300 dark:border-gray-600', 'border-red-500').replace('focus:border-indigo-500 dark:focus:border-indigo-400', 'focus:border-red-500')
      : baseClassName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({}); // Clear previous errors

    try {
      await productService.createProduct(formData);
      notify.success('Product created successfully!');
      router.push('/products');
    } catch (error: any) {
      console.error('Error creating product:', error);

      // Handle validation errors
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        notify.error(error.response?.data?.message || 'Failed to create product');
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
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Package2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Add New Product
            </h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-1">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={getInputClassName("name", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="Enter product name"
                />
                {getFieldError("name") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("name")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SKU
                </label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  className={getInputClassName("sku", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="Enter SKU"
                />
                {getFieldError("sku") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("sku")}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GTIN
                </label>
                <input
                  type="text"
                  name="gtin"
                  value={formData.gtin}
                  onChange={handleInputChange}
                  className={getInputClassName("gtin", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="Enter GTIN"
                />
                {getFieldError("gtin") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("gtin")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit
                </label>
                <select
                  name="unit_id"
                  value={formData.unit_id}
                  onChange={handleInputChange}
                  className={getInputClassName("unit_id", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                >
                  <option value="">Select Unit</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                    </option>
                  ))}
                </select>
                {getFieldError("unit_id") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("unit_id")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className={getInputClassName("description", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                placeholder="Enter product description"
              />
              {getFieldError("description") && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {getFieldError("description")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pricing & Inventory */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Pricing & Inventory
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="base_price"
                  value={formData.base_price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className={getInputClassName("base_price", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="0.00"
                />
                {getFieldError("base_price") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("base_price")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cost Price
                </label>
                <input
                  type="number"
                  name="cost_price"
                  value={formData.cost_price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className={getInputClassName("cost_price", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="0.00"
                />
                {getFieldError("cost_price") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("cost_price")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Compare At Price
                </label>
                <input
                  type="number"
                  name="compare_at_price"
                  value={formData.compare_at_price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className={getInputClassName("compare_at_price", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="0.00"
                />
                {getFieldError("compare_at_price") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("compare_at_price")}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  name="low_stock_threshold"
                  value={formData.low_stock_threshold}
                  onChange={handleInputChange}
                  min="0"
                  className={getInputClassName("low_stock_threshold", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="0"
                />
                {getFieldError("low_stock_threshold") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("low_stock_threshold")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reorder Point
                </label>
                <input
                  type="number"
                  name="reorder_point"
                  value={formData.reorder_point}
                  onChange={handleInputChange}
                  min="0"
                  className={getInputClassName("reorder_point", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="0"
                />
                {getFieldError("reorder_point") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("reorder_point")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reorder Quantity
                </label>
                <input
                  type="number"
                  name="reorder_quantity"
                  value={formData.reorder_quantity}
                  onChange={handleInputChange}
                  min="0"
                  className={getInputClassName("reorder_quantity", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="0"
                />
                {getFieldError("reorder_quantity") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("reorder_quantity")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  name="tax_rate"
                  value={formData.tax_rate}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className={getInputClassName("tax_rate", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="0.00"
                />
                {getFieldError("tax_rate") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("tax_rate")}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="track_inventory"
                  checked={formData.track_inventory}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Track Inventory
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="manage_stock"
                  checked={formData.manage_stock}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Manage Stock
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_taxable"
                  checked={formData.is_taxable}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Taxable
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="allow_backorder"
                  checked={formData.allow_backorder}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Allow Backorder
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Categories & Brands */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Categories & Brands
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Brand
                </label>
                <select
                  name="brand_id"
                  value={formData.brand_id}
                  onChange={handleInputChange}
                  className={getInputClassName("brand_id", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                >
                  <option value="">Select Brand</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                {getFieldError("brand_id") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("brand_id")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className={getInputClassName("category_id", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {getFieldError("category_id") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("category_id")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Physical Properties */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Physical Properties
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className={getInputClassName("weight", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="0.00"
                />
                {getFieldError("weight") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("weight")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Length (cm)
                </label>
                <input
                  type="number"
                  name="length"
                  value={formData.length}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className={getInputClassName("length", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="0.00"
                />
                {getFieldError("length") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("length")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Width (cm)
                </label>
                <input
                  type="number"
                  name="width"
                  value={formData.width}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className={getInputClassName("width", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="0.00"
                />
                {getFieldError("width") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("width")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className={getInputClassName("height", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="0.00"
                />
                {getFieldError("height") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("height")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Product Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className={getInputClassName("type", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                >
                  <option value="simple">Simple</option>
                  <option value="variable">Variable</option>
                  <option value="composite">Composite</option>
                  <option value="digital">Digital</option>
                  <option value="service">Service</option>
                </select>
                {getFieldError("type") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("type")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={getInputClassName("status", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="discontinued">Discontinued</option>
                  <option value="archived">Archived</option>
                </select>
                {getFieldError("status") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("status")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Short Description
              </label>
              <textarea
                name="short_description"
                value={formData.short_description}
                onChange={handleInputChange}
                rows={2}
                className={getInputClassName("short_description", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                placeholder="Brief product description"
              />
              {getFieldError("short_description") && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {getFieldError("short_description")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Marketing & Display */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Marketing & Display
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={formData.is_featured}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Featured</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_new"
                  checked={formData.is_new}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">New</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_bestseller"
                  checked={formData.is_bestseller}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Bestseller</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_on_sale"
                  checked={formData.is_on_sale}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">On Sale</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available From
                </label>
                <input
                  type="date"
                  name="available_from"
                  value={formData.available_from}
                  onChange={handleInputChange}
                  className={getInputClassName("available_from", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                />
                {getFieldError("available_from") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("available_from")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available Until
                </label>
                <input
                  type="date"
                  name="available_until"
                  value={formData.available_until}
                  onChange={handleInputChange}
                  className={getInputClassName("available_until", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                />
                {getFieldError("available_until") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("available_until")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  name="display_order"
                  value={formData.display_order}
                  onChange={handleInputChange}
                  min="0"
                  className={getInputClassName("display_order", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="0"
                />
                {getFieldError("display_order") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("display_order")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SEO & Meta */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              SEO & Meta Information
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meta Title
                </label>
                <input
                  type="text"
                  name="meta_title"
                  value={formData.meta_title}
                  onChange={handleInputChange}
                  className={getInputClassName("meta_title", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="SEO title"
                />
                {getFieldError("meta_title") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("meta_title")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meta Description
                </label>
                <textarea
                  name="meta_description"
                  value={formData.meta_description}
                  onChange={handleInputChange}
                  rows={2}
                  className={getInputClassName("meta_description", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="SEO description"
                />
                {getFieldError("meta_description") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("meta_description")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meta Keywords
                </label>
                <input
                  type="text"
                  name="meta_keywords"
                  value={formData.meta_keywords}
                  onChange={handleInputChange}
                  className={getInputClassName("meta_keywords", "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400")}
                  placeholder="keyword1, keyword2, keyword3"
                />
                {getFieldError("meta_keywords") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {getFieldError("meta_keywords")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-start">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}