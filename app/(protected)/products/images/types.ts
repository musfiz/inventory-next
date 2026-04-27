import { ProductImage } from '@/types/api.types';

/**
 * Product Images Page Types
 */

export interface ProductImageFormData {
  product_id: string;
  variation_id?: string;
  image: File;
  alt_text?: string;
  is_primary?: boolean;
}

export interface ImageUploadState {
  uploading: boolean;
  progress: number;
  selectedFile: File | null;
  previewUrl: string | null;
  error: string | null;
}

export interface ProductImageFilters {
  product_id?: string;
  variation_id?: string;
  search?: string;
  per_page?: number;
}

export interface UseProductImagesReturn {
  // State
  uploadState: ImageUploadState;

  // Actions
  handleFileSelect: (file: File | null) => void;
  handleUpload: (formData: Omit<ProductImageFormData, 'image'>) => Promise<void>;
  handleDelete: (image: ProductImage) => Promise<void>;
  handleSetPrimary: (image: ProductImage) => Promise<void>;
  clearSelection: () => void;

  // Refresh
  refreshImages: () => void;
  refreshKey: number;
}

export interface ImageUploadFormProps {
  productId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}
