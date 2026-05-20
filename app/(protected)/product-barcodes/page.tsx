'use client';

import { useState } from 'react';
import { Barcode as BarcodeIcon, Plus, Trash2, X } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import { barcodeService } from '@/services';
import commonService from '@/services/commonService';
import { ProductBarcode } from '@/services/barcodeService';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';

const BARCODE_TYPES = [
  { value: 'EAN13', label: 'EAN-13' },
  { value: 'CODE128', label: 'CODE 128' },
  { value: 'QR', label: 'QR Code' },
];

export default function ProductBarcodesPage() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '' as string | undefined,
    type: 'EAN13' as 'EAN13' | 'CODE128' | 'QR',
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const [defaultProductOptions, setDefaultProductOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadProductOptions = async (
    inputValue: string
  ): Promise<{ value: string; label: string }[]> => {
    try {
      const params: { search?: string } = {};
      if (inputValue && inputValue.trim()) {
        params.search = inputValue.trim();
      }

      const products = await commonService.getProductsForDropdown(params);

      const options = products.map((prod: any) => ({
        value: prod.id,
        label: prod.name,
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
  };

  const handleAddBarcode = () => {
    setFormData({
      product_id: undefined,
      type: 'EAN13',
    });
    setFormErrors({});
    setSelectedProduct(null);
    // Load default product options
    loadProductOptions('');
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.product_id) {
      errors.product_id = 'Product must be selected';
    }
    if (!formData.type) {
      errors.type = 'Barcode type is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerateBarcodes = async () => {
    if (!validateForm()) return;

    const result = await confirm({
      title: 'Generate Barcodes',
      html: `Are you sure you want to generate barcodes for <strong>all variations</strong> of this product?<br><br>
            <em style="color: #6b7280; font-size: 12px;">This will create barcodes for each product variation.</em>`,
      confirmButtonText: 'Generate',
      cancelButtonText: 'Cancel',
      icon: 'question',
    });

    if (!result.isConfirmed) return;

    setIsGenerating(true);
    try {
      const submitData = {
        product_id: formData.product_id!,
        type: formData.type,
      };

      await barcodeService.generateBulkBarcodes(submitData);
      notify.success('Barcodes generated successfully');
      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { errors?: Record<string, string[]>; message?: string } };
      };
      if (axiosError.response?.data?.errors) {
        const transformedErrors: { [key: string]: string } = {};
        Object.entries(axiosError.response.data.errors).forEach(([key, messages]) => {
          transformedErrors[key] = Array.isArray(messages) ? messages.join(', ') : messages;
        });
        setFormErrors(transformedErrors);
      } else {
        notify.error(axiosError.response?.data?.message || 'Failed to generate barcodes');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (barcode: ProductBarcode) => {
    const result = await confirm({
      title: 'Delete Barcode',
      html: `Are you sure you want to delete barcode <strong>${barcode.barcode}</strong>?<br><br>
            <div style="color: #6b7280; font-size: 13px; line-height: 1.5;">
              <strong>Product:</strong> ${barcode.product?.name || 'N/A'}<br>
              <strong>Variation:</strong> ${barcode.variation?.name || 'N/A'}<br>
              <strong>Type:</strong> ${barcode.type}
            </div><br>
            <em style="color: #dc2626; font-size: 12px;">This action cannot be undone.</em>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });

    if (!result.isConfirmed) return;

    try {
      await barcodeService.deleteBarcode(barcode.id);
      notify.success('Barcode deleted successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      notify.error(axiosError.response?.data?.message || 'Failed to delete barcode');
    }
  };

  const columns: ColumnDef<ProductBarcode>[] = [
    {
      id: 'serial',
      header: 'SL',
      cell: ({ row, table }) => (
        <span className="text-gray-600 dark:text-gray-400">
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
            row.index +
            1}
        </span>
      ),
    },
    {
      accessorKey: 'barcode',
      header: 'Barcode',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <BarcodeIcon className="w-4 h-4 text-blue-500" />
          <span className="font-medium font-mono">{row.original.barcode}</span>
        </div>
      ),
    },
    {
      id: 'product',
      header: 'Product',
      cell: ({ row }) => (
        <span className="text-gray-900 dark:text-gray-100">
          {row.original.product?.name || '-'}
        </span>
      ),
    },
    {
      id: 'variation',
      header: 'Variation',
      cell: ({ row }) => (
        <div className="flex flex-col">
          {row.original.variation ? (
            <>
              <span className="text-gray-900 dark:text-gray-100">
                {row.original.variation.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                SKU: {row.original.variation.sku}
              </span>
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
          {row.original.type}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDelete(row.original)}
            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Build API endpoint with filters
  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    const queryString = params.toString();
    return `product-barcodes${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BarcodeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Product Barcodes
          </h1>
        </div>
        <button
          onClick={handleAddBarcode}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Generate Barcodes
        </button>
      </div>

      {/* Add/Edit Barcode Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
            Generate Barcodes for Product Variations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Product *
                </label>
                <CustomSelect
                  value={selectedProduct}
                  onChange={option => {
                    setFormData({
                      ...formData,
                      product_id: option?.value || undefined,
                    });
                    setSelectedProduct(option);
                  }}
                  loadOptions={loadProductOptions}
                  defaultOptions={defaultProductOptions}
                  placeholder="Select product"
                  className="text-sm"
                  isInvalid={!!formErrors.product_id}
                />
                {formErrors.product_id && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.product_id}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Barcode Type *
                </label>
                <CustomSelect
                  value={BARCODE_TYPES.find(type => type.value === formData.type) || null}
                  onChange={option =>
                    setFormData({
                      ...formData,
                      type: (option?.value as typeof formData.type) || 'EAN13',
                    })
                  }
                  options={[...BARCODE_TYPES]}
                  placeholder="Select barcode type"
                  className="text-sm"
                  isInvalid={!!formErrors.type}
                />
                {formErrors.type && <p className="text-red-600 text-xs mt-1">{formErrors.type}</p>}
              </div>
            </div>
            <div className="flex gap-2 md:col-span-2 mt-1.5">
              <button
                type="button"
                onClick={handleGenerateBarcodes}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GiSave className="w-4 h-4" />
                {isGenerating ? 'Generating...' : 'Generate Barcodes'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DataTable */}
      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by barcode, product name, or SKU..."
      />
    </div>
  );
}
