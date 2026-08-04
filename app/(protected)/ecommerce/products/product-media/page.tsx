'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ImageIcon,
  UploadCloud,
  Loader2,
  Trash2,
  Star,
  X,
  Check,
  Package,
  Eye,
  ZoomIn,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  FileImage,
} from 'lucide-react';
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

/** Best available thumbnail / large URL for a media item. */
const bestUrl = (img: ProductMediaItem, kind: 'thumb' | 'full') => {
  if (kind === 'thumb') {
    return img.file_url_thumb || img.file_url_medium || img.file_url_large;
  }
  return img.file_url_large || img.file_url_zoom || img.file_url_medium || img.file_url_thumb;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ProductMediaPage() {
  const user = useAuthStore(state => state.user);
  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;

  const [selectedCategory, setSelectedCategory] = useState<SelectOption | null>(null);
  const [selectedProductOption, setSelectedProductOption] = useState<SelectOption | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProductData, setSelectedProductData] = useState<any>(null);

  // Holds full product objects keyed by option value so we can recover
  // category/brand details after an AsyncSelect selection.
  const productOptionsRef = useRef<Record<string, any>>({});

  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<SelectOption | null>(null);

  const [images, setImages] = useState<ProductMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox preview state
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewSource, setPreviewSource] = useState<'zoom' | 'large'>('zoom');

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

  /** Search products by name (optionally narrowed by the selected category). */
  const loadProductOptions = useCallback(
    async (inputValue: string): Promise<SelectOption[]> => {
      try {
        const params: any = { search: inputValue };
        if (tenantBusinessTypeId) params.business_type_id = tenantBusinessTypeId;
        const catId = selectedCategory ? Number(selectedCategory.value) : null;
        if (catId) params.category_id = catId;
        const data = await commonService.getProductsForDropdown(params);
        return (data || []).map(p => {
          productOptionsRef.current[String(p.id)] = p;
          return { value: String(p.id), label: p.name };
        });
      } catch {
        return [];
      }
    },
    [tenantBusinessTypeId, selectedCategory]
  );

  const formatProductOption = useCallback((option: SelectOption) => {
    const p = productOptionsRef.current[option.value];
    return (
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {p?.name || option.label}
        </span>
        {(p?.category || p?.brand) && (
          <span className="text-[10px] text-gray-500">
            {p?.category?.name}
            {p?.category?.name && p?.brand?.name ? ' · ' : ''}
            {p?.brand?.name}
          </span>
        )}
      </div>
    );
  }, []);

  const handleCategoryChange = useCallback((option: SelectOption | null) => {
    setSelectedCategory(option);
    // Changing the filter invalidates the current product selection.
    setSelectedProductOption(null);
    setSelectedProductId(null);
    setSelectedProductData(null);
    setSelectedVariant(null);
    setVariants([]);
    setImages([]);
    setUploadFiles([]);
    setPreviewIndex(null);
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedCategory(null);
    setSelectedProductOption(null);
    setSelectedProductId(null);
    setSelectedProductData(null);
    setSelectedVariant(null);
    setVariants([]);
    setImages([]);
    setUploadFiles([]);
    setPreviewIndex(null);
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

  const handleProductSelect = useCallback((option: SelectOption | null) => {
    if (!option) {
      setSelectedProductOption(null);
      setSelectedProductId(null);
      setSelectedProductData(null);
      setSelectedVariant(null);
      setVariants([]);
      setImages([]);
      setPreviewIndex(null);
      return;
    }

    const product = productOptionsRef.current[option.value];
    const productId = Number(option.value);

    setSelectedProductOption(option);
    setSelectedProductId(productId);
    setSelectedProductData(product || { id: productId, name: option.label });
    setSelectedVariant(null);
    setVariants([]);
    setImages([]);
    setPreviewIndex(null);

    // Every product should carry at least one variant; auto-select the
    // default (or first) variant so an upload always has a variant_id.
    commonService.getVariationsByProduct(option.value)
      .then(list => {
        const v = list || [];
        setVariants(v);
        const def = v.find(x => x.is_default) || v[0];
        if (def) {
          const opt = { value: String(def.id), label: def.name || def.sku || `Variant #${def.id}` };
          setSelectedVariant(opt);
          loadImages(productId, Number(def.id));
        } else {
          setImages([]);
        }
      })
      .catch(() => {
        setVariants([]);
      });
  }, [loadImages]);

  const handleVariantChange = useCallback((option: SelectOption | null) => {
    setSelectedVariant(option);
    if (selectedProductId) {
      loadImages(selectedProductId, option ? Number(option.value) : null);
    }
  }, [selectedProductId, loadImages]);

  /** Validate and stage a set of files for upload. */
  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
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
    if (validFiles.length > 0) {
      setUploadFiles(prev => [...prev, ...validFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFilesSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const removeUploadFile = useCallback((index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedProductId || uploadFiles.length === 0) return;
    if (!selectedVariant) {
      notify.error('Please select a variant for this product before uploading.');
      return;
    }

    const variationId = Number(selectedVariant.value);
    const hasPrimary = images.some(img => img.is_primary);

    setUploading(true);
    const formData = new FormData();
    formData.append('product_id', String(selectedProductId));
    formData.append('variation_id', String(variationId));
    uploadFiles.forEach(file => formData.append('images[]', file));
    if (!hasPrimary) formData.append('is_primary', '1');

    try {
      const uploaded = await productMediaService.uploadImage(formData);
      const count = uploaded?.length ?? 0;
      notify.success(`${count || uploadFiles.length} image(s) uploaded successfully`);
      setUploadFiles([]);
      loadImages(selectedProductId, variationId);
    } catch {
      notify.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
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

  const openPreview = useCallback((index: number) => {
    setPreviewSource('zoom');
    setPreviewIndex(index);
  }, []);

  const movePreview = useCallback((dir: 1 | -1) => {
    setPreviewIndex(prev => {
      if (prev === null || images.length === 0) return prev;
      return (prev + dir + images.length) % images.length;
    });
  }, [images.length]);

  // Close preview on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPreviewIndex(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const previewImage = previewIndex !== null ? images[previewIndex] : null;
  const hasVariant = variants.length > 0 && !!selectedVariant;
  const canUpload = !!selectedProductId && hasVariant && uploadFiles.length > 0 && !uploading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
            <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Product Media
            </h1>
            {selectedProductData && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Managing media for <span className="font-medium text-gray-700 dark:text-gray-300">{selectedProductData.name}</span>
              </p>
            )}
          </div>
        </div>
        {selectedProductData && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full">
            <ImagePlus className="w-3.5 h-3.5" />
            {images.length} image{images.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* Search card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Category
            </label>
            <CustomSelect
              value={selectedCategory}
              onChange={handleCategoryChange}
              loadOptions={loadCategoryOptions}
              placeholder="All categories..."
              defaultOptions
              isClearable
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Filters the product list below.
            </p>
          </div>

          {/* Product search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Search Product
            </label>
            <CustomSelect
              key={selectedCategory?.value || 'all'}
              value={selectedProductOption}
              onChange={handleProductSelect}
              loadOptions={loadProductOptions}
              formatOptionLabel={formatProductOption}
              placeholder="Search by product name..."
              isClearable
              defaultOptions
            />
          </div>
        </div>

        {/* Selected product + Clear row */}
        {selectedProductData ? (
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700 pt-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg shrink-0">
                <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
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
              onClick={handleClearAll}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700 pt-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Select a product to manage its media.
            </p>
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Variant selector (required for upload) */}
      {selectedProductData && (
        <div className="max-w-md">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Variant <span className="text-red-500">*</span>
          </label>
          <CustomSelect
            value={selectedVariant}
            onChange={handleVariantChange}
            options={variants.map(v => ({ value: String(v.id), label: v.name || v.sku || `Variant #${v.id}` }))}
            placeholder={variants.length === 0 ? 'No variants available' : 'Select variant...'}
            isClearable={false}
            isDisabled={variants.length === 0}
          />
          {variants.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              This product has no variant. Create a variant before uploading images.
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading images...
        </div>
      )}

      {!loading && selectedProductData && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: Upload zone */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Upload Images
              </h3>

              {/* Dropzone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => {
                  if (hasVariant) fileInputRef.current?.click();
                  else notify.error('Please select a variant for this product before uploading.');
                }}
                className={`group relative cursor-pointer rounded-xl border-2 border-dashed transition-colors p-6 text-center ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPT}
                  className="hidden"
                  onChange={handleFilesSelected}
                />
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  dragOver ? 'bg-indigo-500 text-white' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100'
                }`}>
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {dragOver ? 'Drop files here' : 'Drag & drop images here'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  or <span className="text-indigo-600 dark:text-indigo-400 font-medium">browse files</span>
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  JPG, PNG, WebP &middot; max {MAX_SIZE_MB}MB each
                </p>
              </div>

              {/* Staged files */}
              {uploadFiles.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {uploadFiles.length} file{uploadFiles.length === 1 ? '' : 's'} selected
                    </p>
                    <button
                      type="button"
                      onClick={() => setUploadFiles([])}
                      className="text-[11px] text-red-500 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
                    {uploadFiles.map((file, i) => (
                      <div
                        key={`${file.name}-${i}`}
                        className="relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900/50 group/f"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt=""
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-1 pt-4 pb-0.5">
                          <p className="text-[9px] text-white truncate">{file.name}</p>
                          <p className="text-[8px] text-gray-200">{formatBytes(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); removeUploadFile(i); }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!canUpload}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {uploading ? 'Uploading...' : `Upload ${uploadFiles.length} image${uploadFiles.length === 1 ? '' : 's'}`}
                  </button>
                </div>
              )}

              <p className="text-[10px] text-gray-400 mt-3 border-t border-gray-100 dark:border-gray-700 pt-2">
                Images are attached to the selected variant. Each upload generates 350&times;350, 650&times;650, 1024&times;1024 and 2048&times;2048 WebP variants automatically.
              </p>
            </div>
          </div>

          {/* Right: Existing images */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 h-full">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Existing Images
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Click an image to preview
                </span>
              </div>

              {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-900/40 flex items-center justify-center mb-3">
                    <FileImage className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No images yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Upload images on the left to get started.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((img, index) => {
                    const isPrimary = img.is_primary;
                    const hasZoom = !!img.file_url_zoom;
                    return (
                      <div
                        key={img.id}
                        className={`relative group rounded-xl border overflow-hidden bg-gray-50 dark:bg-gray-900/50 transition-shadow hover:shadow-lg ${
                          isPrimary
                            ? 'border-yellow-400 dark:border-yellow-500 ring-2 ring-yellow-400/30'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => openPreview(index)}
                          className="block w-full aspect-square"
                          title="Preview"
                        >
                          <img
                            src={imageUrl(bestUrl(img, 'thumb')) ?? ''}
                            alt={img.alt_text || ''}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </button>

                        {/* Primary badge */}
                        {isPrimary && (
                          <div className="absolute top-1.5 left-1.5 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1 shadow">
                            <Star className="w-2.5 h-2.5 fill-current" /> Primary
                          </div>
                        )}

                        {/* Order number */}
                        <div className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md font-medium">
                          #{index + 1}
                        </div>

                        {/* Hover actions */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => openPreview(index)}
                            className="p-2 bg-white/95 rounded-lg hover:bg-white text-gray-700 shadow"
                            title="Preview"
                          >
                            {hasZoom ? <ZoomIn className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(img)}
                              className="p-2 bg-white/95 rounded-lg hover:bg-white text-amber-600 shadow"
                              title="Set as primary"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(img)}
                            className="p-2 bg-red-500/95 rounded-lg hover:bg-red-600 text-white shadow"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* File-type footer */}
                        <div className="absolute inset-x-0 bottom-0 flex justify-end px-1 pb-1 pointer-events-none">
                          {hasZoom && (
                            <span className="text-[8px] text-white bg-black/40 px-1 py-0.5 rounded">
                              2048
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedProductData && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-16 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Search and select a product to manage its media
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Upload, preview and organize product images in one place.
          </p>
        </div>
      )}

      {/* Lightbox preview */}
      {previewImage && previewIndex !== null && (
        <div
          className="fixed inset-0 z-100 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {previewImage.alt_text || `Image ${previewIndex + 1}`}
                </span>
                <span className="text-xs text-gray-400">
                  ({previewIndex + 1} of {images.length})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewSource(s => s === 'zoom' ? 'large' : 'zoom')}
                  className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${
                    previewSource === 'zoom' && previewImage.file_url_zoom
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="Toggle source"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  {previewSource === 'zoom' ? '2048' : '1024'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewIndex(null)}
                  className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="relative bg-gray-100 dark:bg-gray-950 max-h-[70vh] overflow-auto">
              <img
                src={imageUrl(previewSource === 'zoom' && previewImage.file_url_zoom
                  ? previewImage.file_url_zoom
                  : bestUrl(previewImage, 'full')) ?? ''}
                alt={previewImage.alt_text || ''}
                className="w-full h-auto object-contain"
              />
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => movePreview(-1)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 px-3">
                {previewImage.is_primary ? (
                  <span className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                    <Star className="w-3.5 h-3.5 fill-current" /> Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(previewImage)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    <Star className="w-3.5 h-3.5" /> Set primary
                  </button>
                )}
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  type="button"
                  onClick={() => { handleDelete(previewImage); setPreviewIndex(null); }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
              <button
                type="button"
                onClick={() => movePreview(1)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
