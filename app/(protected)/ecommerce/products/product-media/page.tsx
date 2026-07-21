'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ImageIcon, Upload, Loader2, Trash2, Star, X, Check, Search, Package } from 'lucide-react';
import { notify } from '@/lib/notifications';
import { imageUrl } from '@/lib/image-url';
import productMediaService from '@/services/productMediaService';
import commonService from '@/services/commonService';
import CustomSelect from '@/components/ui/custom-select';
import { useAuthStore } from '@/stores/auth-store';
import type { ProductMediaItem } from '@/types/api.types';
import type { SelectOption } from '@/components/ui/custom-select';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_SIZE_MB = 5;

export default function ProductMediaPage() {
  const user = useAuthStore(state => state.user);
  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProductData, setSelectedProductData] = useState<any>(null);
  const [images, setImages] = useState<ProductMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<SelectOption | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<any[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [searchingProduct, setSearchingProduct] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<SelectOption | null>(null);
  const [loadingVariants, setLoadingVariants] = useState(false);

  const loadCategoryOptions = useCallback(
    async (inputValue: string): Promise<SelectOption[]> => {
      try {
        const params: { search?: string; business_type_id?: number } = {};
        if (inputValue) params.search = inputValue;
        if (tenantBusinessTypeId) params.business_type_id = tenantBusinessTypeId;
        const data = await commonService.getCategoriesForDropdown(params);
        return data.map(c => ({ value: String(c.id), label: c.name }));
      } catch {
        return [];
      }
    },
    [tenantBusinessTypeId]
  );

  const searchProducts = useCallback(async (query: string, categoryId: number | null) => {
    if (!query.trim() && !categoryId) {
      setProductSearchResults([]);
      setShowProductDropdown(false);
      return;
    }
    setSearchingProduct(true);
    try {
      const params: any = { search: query };
      if (tenantBusinessTypeId) params.business_type_id = tenantBusinessTypeId;
      if (categoryId) params.category_id = categoryId;
      const data = await commonService.getProductsForDropdown(params);
      setProductSearchResults(data || []);
      setShowProductDropdown(data?.length > 0);
    } catch {
      setProductSearchResults([]);
    } finally {
      setSearchingProduct(false);
    }
  }, [tenantBusinessTypeId]);

  const handleCategorySearch = useCallback(() => {
    const catId = selectedCategory ? Number(selectedCategory.value) : null;
    setActiveCategoryId(catId);
    if (selectedProductId) {
      setSelectedProductId(null);
      setSelectedProductData(null);
      setImages([]);
      setUploadFiles([]);
    }
    searchProducts(productSearchQuery, catId);
  }, [selectedCategory, selectedProductId, productSearchQuery, searchProducts]);

  const handleClearAll = useCallback(() => {
    setSelectedCategory(null);
    setActiveCategoryId(null);
    setSelectedProductId(null);
    setSelectedProductData(null);
    setSelectedVariant(null);
    setVariants([]);
    setProductSearchQuery('');
    setProductSearchResults([]);
    setShowProductDropdown(false);
    setImages([]);
    setUploadFiles([]);
  }, []);

  const loadImages = useCallback(async (productId: number, variationId?: number | null) => {
    setLoading(true);
    try {
      const data = await productMediaService.getImages(productId, variationId);
      setImages(data);
    } catch {
      notify.error('Failed to load product images');
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVariantChange = useCallback((option: SelectOption | null) => {
    setSelectedVariant(option);
    if (selectedProductId) {
      loadImages(selectedProductId, option ? Number(option.value) : null);
    }
  }, [selectedProductId, loadImages]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProduct = useCallback((product: any) => {
    setSelectedProductId(product.id);
    setSelectedProductData(product);
    setSelectedVariant(null);
    setVariants([]);
    setProductSearchQuery('');
    setProductSearchResults([]);
    setShowProductDropdown(false);
    setImages([]);

    loadImages(product.id);

    commonService.getVariationsByProduct(String(product.id)).then(v => {
      setVariants(v || []);
    }).catch(() => {});
  }, [loadImages]);

  const handleClearProduct = useCallback(() => {
    setSelectedProductId(null);
    setSelectedProductData(null);
    setSelectedVariant(null);
    setVariants([]);
    setImages([]);
    setUploadFiles([]);
    searchInputRef.current?.focus();
  }, []);

  const handleFilesSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => {
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        notify.error(`${f.name} is too large. Max ${MAX_SIZE_MB}MB.`);
        return false;
      }
      if (!ACCEPT.split(',').includes(f.type)) {
        notify.error(`${f.name}: invalid file type. Use JPG, PNG, or WebP.`);
        return false;
      }
      return true;
    });
    setUploadFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeUploadFile = useCallback((index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedProductId || uploadFiles.length === 0) return;

    const variationId = selectedVariant ? Number(selectedVariant.value) : null;

    setUploading(true);
    const hasPrimary = images.some(img => img.is_primary);
    let successCount = 0;

    for (let i = 0; i < uploadFiles.length; i++) {
      const formData = new FormData();
      formData.append('product_id', String(selectedProductId));
      formData.append('image', uploadFiles[i]);
      if (variationId) formData.append('variation_id', String(variationId));
      if (!hasPrimary && i === 0) {
        formData.append('is_primary', '1');
      }
      try {
        await productMediaService.uploadImage(formData);
        successCount++;
      } catch {
        notify.error(`Failed to upload ${uploadFiles[i].name}`);
      }
    }

    setUploadFiles([]);
    if (successCount > 0) {
      notify.success(`${successCount} image(s) uploaded successfully`);
      loadImages(selectedProductId, variationId);
    }
    setUploading(false);
  }, [selectedProductId, uploadFiles, images, selectedVariant, loadImages]);

  const handleDelete = useCallback(
    async (image: ProductMediaItem) => {
      if (!selectedProductId) return;
      const variationId = selectedVariant ? Number(selectedVariant.value) : null;
      try {
        await productMediaService.deleteImage(image.id);
        notify.success('Image deleted');
        loadImages(selectedProductId, variationId);
      } catch {
        notify.error('Failed to delete image');
      }
    },
    [selectedProductId, selectedVariant, loadImages]
  );

  const handleSetPrimary = useCallback(
    async (image: ProductMediaItem) => {
      if (!selectedProductId) return;
      const variationId = selectedVariant ? Number(selectedVariant.value) : null;
      try {
        await productMediaService.setPrimary(image.id);
        notify.success('Primary image updated');
        loadImages(selectedProductId, variationId);
      } catch {
        notify.error('Failed to set primary image');
      }
    },
    [selectedProductId, selectedVariant, loadImages]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Product Media
        </h1>
      </div>

      {/* Category row */}
      <div className="flex items-end gap-2">
        <div className="flex-1 max-w-md">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Category
          </label>
          <CustomSelect
            value={selectedCategory}
            onChange={setSelectedCategory}
            loadOptions={loadCategoryOptions}
            placeholder="Select category..."
            defaultOptions
            isClearable
          />
        </div>
        <button
          type="button"
          onClick={handleCategorySearch}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-sm hover:bg-indigo-700 h-[32px]"
        >
          <Search className="w-3.5 h-3.5" />
          Search
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600 h-[32px]"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {/* Product search */}
      <div ref={searchRef} className="relative max-w-md">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Search Product
        </label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={productSearchQuery}
            onChange={e => setProductSearchQuery(e.target.value)}

            placeholder="Type to search products..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {searchingProduct && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
          )}
        </div>

        {showProductDropdown && productSearchResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm shadow-lg max-h-60 overflow-y-auto">
            {productSearchResults.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectProduct(p)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                <div className="flex gap-2 mt-0.5">
                  {p.category && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                      {p.category.name}
                    </span>
                  )}
                  {p.brand && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                      {p.brand.name}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {showProductDropdown && productSearchResults.length === 0 && !searchingProduct && productSearchQuery && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm shadow-lg p-3 text-center text-sm text-gray-500">
            No products found
          </div>
        )}
      </div>

      {/* Selected product info card */}
      {selectedProductData && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-sm">
              <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {selectedProductData.name}
              </p>
              <div className="flex gap-2 mt-0.5">
                {selectedProductData.category && (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {selectedProductData.category.name}
                  </span>
                )}
                {selectedProductData.brand && (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    &middot; {selectedProductData.brand.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearProduct}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Change
          </button>
        </div>
      )}

      {/* Variant selector */}
      {selectedProductData && variants.length > 0 && (
        <div className="max-w-md">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Variant
          </label>
          <CustomSelect
            value={selectedVariant}
            onChange={handleVariantChange}
            options={variants.map(v => ({ value: String(v.id), label: v.name || v.sku || `Variant #${v.id}` }))}
            placeholder="Select variant..."
            isClearable={false}
          />
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading images...
        </div>
      )}

      {!loading && selectedProductData && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-6">
          {/* Existing images grid */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Existing Images ({images.length})
            </h3>
            {images.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No images yet. Upload below.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {images.map(img => {
                  return (
                    <div
                      key={img.id}
                      className={`relative group rounded-md border overflow-hidden bg-gray-50 dark:bg-gray-900/50 ${
                        img.is_primary
                          ? 'border-yellow-400 dark:border-yellow-500 ring-2 ring-yellow-400/30'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="aspect-square">
                        <img
                          src={imageUrl(img.file_url_thumb) ?? ''}
                          alt={img.alt_text || ''}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {img.is_primary && (
                        <div className="absolute top-1 left-1 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5" /> Primary
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                        {!img.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(img)}
                            className="p-1.5 bg-white/90 rounded-sm hover:bg-white text-gray-700"
                            title="Set as primary"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(img)}
                          className="p-1.5 bg-red-500/90 rounded-sm hover:bg-red-600 text-white"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upload new images */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Upload New Images
            </h3>

            {uploadFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-3">
                {uploadFiles.map((file, i) => (
                  <div key={i} className="relative rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900/50">
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="w-full aspect-square object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeUploadFile(i)}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Upload className="w-4 h-4" />
                Select Images
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT}
                className="hidden"
                onChange={handleFilesSelected}
              />
              {uploadFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {uploading ? 'Uploading...' : `Upload ${uploadFiles.length} image(s)`}
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              JPG, PNG, WebP &middot; max {MAX_SIZE_MB}MB each &middot; generates 350&times;350, 650&times;650, 1024&times;1024 WebP variants
            </p>
          </div>
        </div>
      )}

      {!selectedProductData && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Search and select a product to manage its media.
        </div>
      )}
    </div>
  );
}
