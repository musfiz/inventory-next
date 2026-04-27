import { useState, useCallback } from 'react';
import { notify, confirm } from '@/lib/notifications';
import { productImageService } from '@/services';
import { ProductImage } from '@/types/api.types';
import {
  validateImageFile,
  createPreviewUrl,
  revokePreviewUrl
} from '../utils';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CONFIRM_DIALOGS
} from '../constants';
import {
  ImageUploadState,
  ProductImageFormData,
  UseProductImagesReturn
} from '../types';

/**
 * Custom hook for managing product image operations
 */
export function useProductImages(): UseProductImagesReturn {
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadState, setUploadState] = useState<ImageUploadState>({
    uploading: false,
    progress: 0,
    selectedFile: null,
    previewUrl: null,
    error: null,
  });

  /**
   * Refresh the images list
   */
  const refreshImages = useCallback(() => {
    setRefreshKey((prev: number) => prev + 1);
  }, []);

  /**
   * Clear the selected file and preview
   */
  const clearSelection = useCallback(() => {
    // Revoke the preview URL to free memory
    revokePreviewUrl(uploadState.previewUrl);

    setUploadState({
      uploading: false,
      progress: 0,
      selectedFile: null,
      previewUrl: null,
      error: null,
    });
  }, [uploadState.previewUrl]);

  /**
   * Handle file selection with validation
   */
  const handleFileSelect = useCallback(async (file: File | null) => {
    if (!file) {
      clearSelection();
      return;
    }

    // Validate the file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadState((prev: ImageUploadState) => ({
        ...prev,
        error: validation.error || null,
        selectedFile: null,
        previewUrl: null,
      }));
      return;
    }

    try {
      // Create preview URL
      const previewUrl = await createPreviewUrl(file);

      setUploadState((prev: ImageUploadState) => ({
        ...prev,
        selectedFile: file,
        previewUrl,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to create preview:', error);
      setUploadState((prev: ImageUploadState) => ({
        ...prev,
        error: 'Failed to create image preview',
        selectedFile: null,
        previewUrl: null,
      }));
    }
  }, [clearSelection]);

  /**
   * Handle image upload
   */
  const handleUpload = useCallback(
    async (formData: Omit<ProductImageFormData, 'image'>) => {
      const { product_id, variation_id, alt_text, is_primary } = formData;

      if (!uploadState.selectedFile) {
        notify.error(ERROR_MESSAGES.NO_PRODUCT_SELECTED);
        return;
      }

      if (!product_id) {
        notify.error(ERROR_MESSAGES.NO_PRODUCT_SELECTED);
        return;
      }

      try {
        setUploadState((prev: ImageUploadState) => ({ ...prev, uploading: true, progress: 0 }));

        await productImageService.uploadProductImage(
          product_id,
          {
            product_id,
            image: uploadState.selectedFile,
            variation_id,
            alt_text,
            is_primary,
          },
          {
            onUploadProgress: (progressEvent: any) => {
              if (progressEvent.total) {
                const percent = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                setUploadState((prev: ImageUploadState) => ({ ...prev, progress: percent }));
              }
            },
          }
        );

        notify.success(SUCCESS_MESSAGES.IMAGE_UPLOADED);
        clearSelection();
        refreshImages();
      } catch (error: any) {
        console.error('Upload failed:', error);
        notify.error(
          error?.response?.data?.message || ERROR_MESSAGES.UPLOAD_FAILED
        );
      } finally {
        setUploadState((prev: ImageUploadState) => ({ ...prev, uploading: false, progress: 0 }));
      }
    },
    [uploadState.selectedFile, clearSelection, refreshImages]
  );

  /**
   * Handle image deletion
   */
  const handleDelete = useCallback(
    async (image: ProductImage) => {
      if (!image.product_id) {
        notify.error(ERROR_MESSAGES.NO_PRODUCT_ID);
        return;
      }

      const result = await confirm(CONFIRM_DIALOGS.DELETE_IMAGE);

      if (result.isConfirmed) {
        try {
          await productImageService.deleteProductImage(image.id);
          notify.success(SUCCESS_MESSAGES.IMAGE_DELETED);
          refreshImages();
        } catch (error: any) {
          console.error('Delete failed:', error);
          notify.error(
            error?.response?.data?.message || ERROR_MESSAGES.DELETE_FAILED
          );
        }
      }
    },
    [refreshImages]
  );

  /**
   * Handle setting image as primary
   */
  const handleSetPrimary = useCallback(
    async (image: ProductImage) => {
      if (!image.product_id) {
        notify.error(ERROR_MESSAGES.NO_PRODUCT_ID);
        return;
      }

      try {
        await productImageService.setPrimaryImage(image.id);
        notify.success(SUCCESS_MESSAGES.PRIMARY_UPDATED);
        refreshImages();
      } catch (error: any) {
        console.error('Set primary failed:', error);
        notify.error(
          error?.response?.data?.message || ERROR_MESSAGES.SET_PRIMARY_FAILED
        );
      }
    },
    [refreshImages]
  );

  return {
    uploadState,
    handleFileSelect,
    handleUpload,
    handleDelete,
    handleSetPrimary,
    clearSelection,
    refreshImages,
    refreshKey,
  };
}
