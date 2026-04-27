'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Image as ImageIcon, Plus } from 'lucide-react';
import DataTable from '@/components/ui/datatable';
import { useProductImages, useProductSelection } from './hooks';
import { ImageUploadForm } from './components';
import { createProductImageColumns } from './columns';
import { TABLE_CONFIG } from './constants';

/**
 * Product Images Management Page
 * 
 * Features:
 * - Upload product images with drag-and-drop support
 * - Set primary image for products
 * - Delete product images
 * - Filter images by product and variation
 * - Search and pagination
 */
export default function ProductImagesPage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('product_id');
  const [showAddForm, setShowAddForm] = useState(false);

  // Custom hooks for managing product images
  const {
    uploadState,
    handleFileSelect,
    handleUpload,
    handleDelete,
    handleSetPrimary,
    clearSelection,
    refreshImages,
    refreshKey,
  } = useProductImages();

  const { selectedProduct } = useProductSelection(productId);

  // Memoize table columns to prevent unnecessary re-renders
  const columns = useMemo(
    () => createProductImageColumns(handleDelete, handleSetPrimary),
    [handleDelete, handleSetPrimary]
  );

  /**
   * Handle upload form submission
   */
  const handleFormUpload = async (formData: { alt_text?: string; is_primary?: boolean; variation_id?: string }) => {
    const pid = productId || selectedProduct?.value;
    if (!pid) return;

    await handleUpload({
      product_id: pid,
      ...formData,
    });
    setShowAddForm(false);
  };

  /**
   * Handle form cancellation
   */
  const handleFormCancel = () => {
    setShowAddForm(false);
    clearSelection();
  };

  /**
   * Build API endpoint for DataTable
   */
  const apiEndpoint = 'products/images';

  return (
    <div className="space-y-1">
      {/* Page Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Product Images
          </h1>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer shadow-sm"
          type="button"
        >
          <Plus className="w-4 h-4" />
          Add Image
        </button>
      </header>

      {/* Upload Form */}
      {showAddForm && (
        <ImageUploadForm
          productId={productId}
          uploadState={uploadState}
          onFileSelect={handleFileSelect}
          onUpload={handleFormUpload}
          onClear={clearSelection}
          onCancel={handleFormCancel}
          onSuccess={refreshImages}
        />
      )}

      {/* Images DataTable */}
      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={apiEndpoint}
        pageSize={TABLE_CONFIG.DEFAULT_PAGE_SIZE}
        enableSearch={true}
        searchPlaceholder={TABLE_CONFIG.SEARCH_PLACEHOLDER}
      />
    </div>
  );
}
