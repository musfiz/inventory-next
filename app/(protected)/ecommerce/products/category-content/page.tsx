'use client';

import React, { useState, useCallback, useRef } from 'react';
import { ImageIcon, Save, Loader2, Upload, X } from 'lucide-react';
import { notify } from '@/lib/notifications';
import { imageUrl } from '@/lib/image-url';
import categoryContentService from '@/services/categoryContentService';
import commonService from '@/services/commonService';
import CustomSelect from '@/components/ui/custom-select';
import { useAuthStore } from '@/stores/auth-store';
import type { CategoryContent } from '@/types/api.types';
import type { SelectOption } from '@/components/ui/custom-select';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_SIZE_MB = 2;

export default function CategoryContentPage() {
  const user = useAuthStore(state => state.user);
  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;
  const [selectedCategory, setSelectedCategory] = useState<SelectOption | null>(null);
  const [content, setContent] = useState<CategoryContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const thumbInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [thumbnailFile, setThumbnailFile] = useState<File | null | undefined>(undefined);
  const [bannerFile, setBannerFile] = useState<File | null | undefined>(undefined);

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

  const handleCategoryChange = useCallback(async (option: SelectOption | null) => {
    setSelectedCategory(option);
    setThumbnailFile(undefined);
    setBannerFile(undefined);
    if (thumbInputRef.current) thumbInputRef.current.value = '';
    if (bannerInputRef.current) bannerInputRef.current.value = '';

    if (!option) {
      setContent(null);
      return;
    }

    setLoading(true);
    try {
      const data = await categoryContentService.getContent(Number(option.value));
      setContent(data);
    } catch {
      notify.error('Failed to load category content');
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedCategory) return;

    setSaving(true);
    try {
      const formData = new FormData();

      if (thumbnailFile !== undefined) {
        formData.append('image', thumbnailFile instanceof File ? thumbnailFile : '');
      }

      if (bannerFile !== undefined) {
        formData.append('banner_image', bannerFile instanceof File ? bannerFile : '');
      }

      const updated = await categoryContentService.updateContent(Number(selectedCategory.value), formData);
      setContent(updated);
      setThumbnailFile(undefined);
      setBannerFile(undefined);
      if (thumbInputRef.current) thumbInputRef.current.value = '';
      if (bannerInputRef.current) bannerInputRef.current.value = '';
      notify.success('Category content saved');
    } catch {
      notify.error('Failed to save category content');
    } finally {
      setSaving(false);
    }
  }, [selectedCategory, thumbnailFile, bannerFile]);

  const hasChanges = thumbnailFile !== undefined || bannerFile !== undefined;

  const thumbPreview = thumbnailFile instanceof File
    ? URL.createObjectURL(thumbnailFile)
    : (thumbnailFile === null ? null : imageUrl(content?.image_url));

  const bannerPreview = bannerFile instanceof File
    ? URL.createObjectURL(bannerFile)
    : (bannerFile === null ? null : imageUrl(content?.banner_image));

  const showThumbnail = imageUrl(content?.image_url) || thumbnailFile instanceof File;
  const showBanner = imageUrl(content?.banner_image) || bannerFile instanceof File;
  const hasExistingThumbnail = !!content?.image_url && thumbnailFile === undefined;
  const hasExistingBanner = !!content?.banner_image && bannerFile === undefined;

  function UploadBox({
    label,
    inputRef,
    onFile,
  }: {
    label: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onFile: (f: File | null) => void;
  }) {
    return (
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 bg-gray-50 dark:bg-gray-800/50"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
              notify.error(`File too large. Max ${MAX_SIZE_MB}MB.`);
              return;
            }
            if (!ACCEPT.split(',').includes(file.type)) {
              notify.error('Invalid file type. Use JPG, PNG, or WebP.');
              return;
            }
            onFile(file);
          }}
        />
        <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
        <p className="text-xs text-gray-400">Click to upload new {label}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WebP · max {MAX_SIZE_MB}MB</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Category Page Content
        </h1>
      </div>

      <div className="max-w-md">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Category
        </label>
        <CustomSelect
          value={selectedCategory}
          onChange={handleCategoryChange}
          loadOptions={loadCategoryOptions}
          placeholder="Search & select category..."
          defaultOptions
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading...
        </div>
      )}

      {!loading && selectedCategory && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          {!content && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No content yet for this category.
            </p>
          )}

          {content && (
            <div className="space-y-6">
              {/* Thumbnail row */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Thumbnail Image (250×250)
                </h3>
                <div className="flex gap-4 items-start">
                  <div className="flex-1">
                    <UploadBox label="thumbnail" inputRef={thumbInputRef} onFile={setThumbnailFile} />
                  </div>
                  {showThumbnail && (
                    <div className="flex-shrink-0 w-48">
                      <div className="relative rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800/50">
                        <img
                          src={thumbPreview!}
                          alt="Thumbnail"
                          className="w-full h-48 object-cover"
                        />
                        {hasExistingThumbnail && (
                          <div className="absolute top-1 left-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                            Current
                          </div>
                        )}
                      </div>
                      {thumbnailFile === null && (
                        <p className="text-[10px] text-red-500 mt-0.5">Will be removed on save</p>
                      )}
                      {hasExistingThumbnail && (
                        <button
                          type="button"
                          onClick={() => setThumbnailFile(null)}
                          className="mt-1 inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Banner row */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Banner Image (900×400)
                </h3>
                <div className="flex gap-4 items-start">
                  <div className="flex-1">
                    <UploadBox label="banner" inputRef={bannerInputRef} onFile={setBannerFile} />
                  </div>
                  {showBanner && (
                    <div className="flex-shrink-0 w-80">
                      <div className="relative rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800/50">
                        <img
                          src={bannerPreview!}
                          alt="Banner"
                          className="w-full h-32 object-cover"
                        />
                        {hasExistingBanner && (
                          <div className="absolute top-1 left-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                            Current
                          </div>
                        )}
                      </div>
                      {bannerFile === null && (
                        <p className="text-[10px] text-red-500 mt-0.5">Will be removed on save</p>
                      )}
                      {hasExistingBanner && (
                        <button
                          type="button"
                          onClick={() => setBannerFile(null)}
                          className="mt-1 inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
