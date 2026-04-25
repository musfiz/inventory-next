'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon, Upload, Trash2, Star, X } from 'lucide-react';
import { notify, confirm } from '@/lib/notifications';
import { productService } from '@/services';
import { ProductImage } from '@/types/api.types';

export default function ProductImagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('product_id');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      notify.error('Product ID is required');
      router.push('/products');
      return;
    }
    fetchImages();
  }, [productId, router]);

  const fetchImages = async () => {
    if (!productId) return;
    
    try {
      setLoading(true);
      const response = await productService.getProductImages(productId);
      setImages(response.data || []);
    } catch (error: any) {
      notify.error(error?.response?.data?.message || 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      notify.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notify.error('Image size must be less than 5MB');
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

  const handleUpload = async () => {
    if (!selectedFile || !productId) return;

    try {
      setUploading(true);
      await productService.uploadProductImage(productId, {
        product_id: productId,
        image: selectedFile,
        is_primary: images.length === 0, // Set as primary if it's the first image
      });
      
      notify.success('Image uploaded successfully');
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchImages();
    } catch (error: any) {
      notify.error(error?.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: string, imagePath: string) => {
    if (!productId) return;

    const result = await confirm({
      title: 'Delete Image',
      html: 'Are you sure you want to delete this image?<br><br>This action cannot be undone.',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      try {
        await productService.deleteProductImage(productId, imageId);
        notify.success('Image deleted successfully');
        fetchImages();
      } catch (error: any) {
        notify.error(error?.response?.data?.message || 'Failed to delete image');
      }
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    if (!productId) return;

    try {
      await productService.setPrimaryImage(productId, imageId);
      notify.success('Primary image updated');
      fetchImages();
    } catch (error: any) {
      notify.error(error?.response?.data?.message || 'Failed to set primary image');
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Product Images
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage product images
            </p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Upload New Image
        </h2>
        
        <div className="space-y-4">
          {/* File Input */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
            >
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click to select an image (Max 5MB)
                </p>
              </div>
            </label>
          </div>

          {/* Preview & Upload */}
          {previewUrl && (
            <div className="flex items-start gap-4">
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                />
                <button
                  onClick={clearSelection}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {selectedFile?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Size: {((selectedFile?.size || 0) / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Images Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Uploaded Images ({images.length})
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading images...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No images uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Image */}
                <div className="aspect-square bg-gray-100 dark:bg-gray-900">
                  <img
                    src={image.image_url}
                    alt={image.alt_text || 'Product image'}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Primary Badge */}
                {image.is_primary && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Primary
                  </div>
                )}

                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {!image.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(image.id)}
                      className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                      title="Set as Primary"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(image.id, image.image_path)}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Alt Text */}
                {image.alt_text && (
                  <div className="p-2 bg-white dark:bg-gray-800">
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {image.alt_text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
