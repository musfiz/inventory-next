'use client';

import { useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Image as ImageIcon, Upload, Trash2, Star, X, Plus } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import { productVariationService, commonService, productImageService } from '@/services';
import CustomSelect, { SelectOption } from '@/components/ui/custom-select';
import DataTable from '@/components/ui/datatable';
import { ProductImage, Product } from '@/types/api.types';

export default function ProductImagesPage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('product_id');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [defaultProductOptions, setDefaultProductOptions] = useState<SelectOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<SelectOption | null>(null);
  const [variationOptions, setVariationOptions] = useState<SelectOption[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<SelectOption | null>(null);
  const [altText, setAltText] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const loadProductOptions = async (inputValue: string): Promise<SelectOption[]> => {
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
    } catch (err) {
      console.error('Failed to load products:', err);
      return [];
    }
  };

  const fetchVariations = async (productIdParam: string) => {
    try {
      const res: any = await productVariationService.getVariations({ per_page: 50, product_id: productIdParam });
      const list = res?.data || res || [];
      const items = Array.isArray(list) ? list : (list.data || []);
      const opts = (items || []).map((v: any) => ({ value: v.id || v.uuid, label: v.name || v.sku || v.id }));
      setVariationOptions(opts);
    } catch (err) {
      setVariationOptions([]);
    }
  };

  const validateAndSetFile = (file: File | null) => {
    if (!file) return;

    // Reset previous error
    setFileError(null);

    // Validate file type (jpeg/png only)
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setFileError('Please select a JPEG or PNG image');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setFileError('Image size must be less than 2MB');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    validateAndSetFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0] || null;
    validateAndSetFile(file);
  };

  const handleUpload = async () => {
    const pid = productId || selectedProduct?.value;
    if (!selectedFile || !pid) {
      notify.error('Please select a product and an image');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      await productImageService.uploadProductImage(
        pid,
        {
          product_id: pid,
          image: selectedFile,
          variation_id: selectedVariation?.value,
          alt_text: altText,
          is_primary: isPrimary,
        },
        {
          onUploadProgress: (progressEvent: any) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          },
        }
      );

      notify.success('Image uploaded successfully');
      setSelectedFile(null);
      setPreviewUrl(null);
      setAltText('');
      setIsPrimary(false);
      setSelectedVariation(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowAddForm(false); // Close form after upload

      // refresh images
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      notify.error(error?.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (image: any) => {
    const pid = productId || selectedProduct?.value || image.product_id;
    if (!pid) {
      notify.error('Cannot determine product ID');
      return;
    }

    const result = await confirm({
      title: 'Delete Image',
      html: 'Are you sure you want to delete this image?<br><br>This action cannot be undone.',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      try {
        await productImageService.deleteProductImage(pid, image.id);
        notify.success('Image deleted successfully');
        setRefreshKey(prev => prev + 1);
      } catch (error: any) {
        notify.error(error?.response?.data?.message || 'Failed to delete image');
      }
    }
  };

  const handleSetPrimary = async (image: any) => {
    const pid = productId || selectedProduct?.value || image.product_id;
    if (!pid) {
      notify.error('Cannot determine product ID');
      return;
    }

    try {
      await productImageService.setPrimaryImage(pid, image.id);
      notify.success('Primary image updated');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      notify.error(error?.response?.data?.message || 'Failed to set primary image');
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAltText('');
    setIsPrimary(false);
    setSelectedVariation(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Column definitions
  const columns: ColumnDef<ProductImage>[] = [
    {
      id: 'serial',
      header: 'SL',
      cell: ({ row, table }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
            row.index +
            1}
        </span>
      ),
    },
    {
      id: 'image',
      header: 'Image',
      cell: ({ row }) => (
        <img
          src={row.original.file_url}
          alt={row.original.alt_text || 'Product image'}
          className="h-16 w-16 rounded-sm object-cover border border-gray-200 dark:border-gray-600"
        />
      ),
    },
    {
      accessorKey: 'product',
      header: 'Product Name',
      cell: ({ row }) => (
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {row.original.product?.name || 'Unknown Product'}
        </div>
      ),
    },
    {
      accessorKey: 'variation',
      header: 'Variation',
      cell: ({ row }) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {row.original.variation ? (
            <span>{row.original.variation.name || row.original.variation.sku}</span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 italic">-</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'alt_text',
      header: 'Alt Text',
      cell: ({ row }) => (
        <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
          {row.original.alt_text || <span className="text-gray-400 dark:text-gray-500 italic">-</span>}
        </div>
      ),
    },
    {
      id: 'is_primary',
      header: 'Primary',
      cell: ({ row }) => (
        row.original.is_primary ? (
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Star className="w-3 h-3 mr-1 fill-current" />
            Primary
          </span>
        ) : (
          <button
            onClick={() => handleSetPrimary(row.original)}
            className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-green-100 hover:text-green-800 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors cursor-pointer"
            title="Set as Primary"
          >
            <Star className="w-3 h-3 mr-1" />
            Set Primary
          </button>
        )
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={() => handleDelete(row.original)}
          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  // Build API endpoint
  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    const queryString = params.toString();
    return `products/images${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Product Images
          </h1>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            clearSelection();
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Image
        </button>
      </div>

      {/* Add/Edit Image Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
            Add Product Image
          </h2>
          <div className="space-y-3">
            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {/* Product Select (only show if no product_id in URL) */}
              {!productId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    Product <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    value={selectedProduct}
                    onChange={(option) => {
                      setSelectedProduct(option);
                      setSelectedVariation(null);
                      setVariationOptions([]);
                    }}
                    loadOptions={loadProductOptions}
                    defaultOptions={defaultProductOptions}
                    placeholder="Select Product"
                    className="text-sm"
                  />
                </div>
              )}

              {/* Variation Select (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Variation (Optional)
                </label>
                <CustomSelect
                  value={selectedVariation}
                  onChange={setSelectedVariation}
                  options={variationOptions}
                  placeholder="Select Variation"
                  isDisabled={!selectedProduct && !productId}
                  className="text-sm"
                />
              </div>

              {/* Alt Text Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Alt Text (Optional)
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Enter image description"
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>

            {/* File Upload Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {/* File Dropzone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Image File <span className="text-red-500">*</span>
                </label>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex items-center justify-between px-4 py-3 rounded-sm transition-colors cursor-pointer ${dragActive ? 'border-2 border-blue-400 bg-blue-50' : 'border-2 border-dashed border-gray-300 dark:border-gray-600 bg-transparent'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    id="image-upload"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div className="flex items-center gap-3">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {selectedFile?.name || 'Drag & drop an image here or click to choose'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        JPEG/PNG · Max 2MB · Recommended 800×800
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedFile && (
                      <button
                        onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                        className="px-2 py-1 text-sm border rounded-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700"
                      >
                        Remove
                      </button>
                    )}
                    <label htmlFor="image-upload" className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm cursor-pointer">
                      Choose
                    </label>
                  </div>
                </div>

                {fileError && <p className="text-xs text-red-600 mt-1">{fileError}</p>}
              </div>

              {/* Is Primary Checkbox */}
              <div className="flex items-center pt-2">
                <input
                  type="checkbox"
                  id="is-primary"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 cursor-pointer"
                />
                <label htmlFor="is-primary" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Set as Primary Image
                </label>
              </div>
            </div>

            {/* Preview and Progress */}
            {previewUrl && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded-sm border border-gray-300 dark:border-gray-600"
                    />
                    <button
                      onClick={clearSelection}
                      className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedFile?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Size: {((selectedFile?.size || 0) / 1024).toFixed(2)} KB
                    </p>
                    {/* Upload Progress Bar */}
                    {uploading && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Uploading... {uploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !selectedFile || (!selectedProduct && !productId)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Image'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  clearSelection();
                }}
                disabled={uploading}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 cursor-pointer"
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
        searchPlaceholder="Search by product name, variation, alt text..."
      />
    </div>
  );
}
