'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Image as ImageIcon, Plus } from 'lucide-react';
import DataTable from '@/components/ui/datatable';
import { ImageUploadForm } from './components';
import { createProductImageColumns } from './columns';
import { TABLE_CONFIG } from './constants';
import { productImageService } from '@/services';
import { notify, confirm } from '@/lib/notifications';
import { ProductImage } from '@/types/api.types';

/**
 * Product Images Management Page
 * Simple page for managing product images with upload form
 */
export default function ProductImagesPage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('product_id');
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh table
  const refreshImages = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Handle delete
  const handleDelete = async (image: ProductImage) => {
    if (!image.product_id) {
      notify.error('Invalid product ID');
      return;
    }

    const result = await confirm({
      title: 'Delete Image',
      text: 'Are you sure you want to delete this image?',
      icon: 'warning',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        await productImageService.deleteProductImage(image.id);
        notify.success('Image deleted successfully');
        refreshImages();
      } catch (error: any) {
        notify.error(error?.response?.data?.message || 'Failed to delete image');
      }
    }
  };

  // Handle set primary
  const handleSetPrimary = async (image: ProductImage) => {
    if (!image.product_id) {
      notify.error('Invalid product ID');
      return;
    }

    try {
      await productImageService.setPrimaryImage(image.id);
      notify.success('Primary image updated successfully');
      refreshImages();
    } catch (error: any) {
      notify.error(error?.response?.data?.message || 'Failed to set primary image');
    }
  };

  // Memoize table columns
  const columns = useMemo(
    () => createProductImageColumns(handleDelete, handleSetPrimary),
    []
  );

  // Handle upload success
  const handleUploadSuccess = () => {
    setShowAddForm(false);
    refreshImages();
  };

  // Handle cancel
  const handleCancel = () => {
    setShowAddForm(false);
  };

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
          onSuccess={handleUploadSuccess}
          onCancel={handleCancel}
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
