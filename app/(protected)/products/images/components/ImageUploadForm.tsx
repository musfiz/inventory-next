import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import CustomSelect from '@/components/ui/custom-select';
import { useProductSelection } from '../hooks';
import { FILE_UPLOAD } from '../constants';
import { formatFileSize, validateImageFile, createPreviewUrl } from '../utils';
import { productImageService } from '@/services';
import { notify } from '@/lib/notifications';

interface ImageUploadFormProps {
  productId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Simple Product Image Upload Form
 * Standalone component with built-in upload logic and progress tracking
 */
export function ImageUploadForm({
  productId,
  onSuccess,
  onCancel,
}: ImageUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const {
    selectedProduct,
    selectedVariation,
    variationOptions,
    loadProductOptions,
    handleProductChange,
    handleVariationChange,
  } = useProductSelection(productId);

  // Handle file selection
  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      clearFile();
      return;
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    try {
      const preview = await createPreviewUrl(file);
      setSelectedFile(file);
      setPreviewUrl(preview);
      setError(null);
    } catch (err) {
      setError('Failed to create preview');
    }
  };

  // Clear file selection
  const clearFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle upload
  const handleUpload = async () => {
    const pid = productId || selectedProduct?.value;

    if (!pid) {
      notify.error('Please select a product');
      return;
    }

    if (!selectedFile) {
      notify.error('Please select an image file');
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

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
              const percent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setProgress(percent);
            }
          },
        }
      );

      notify.success('Image uploaded successfully');
      
      // Reset form
      clearFile();
      setAltText('');
      setIsPrimary(false);
      
      // Notify parent
      onSuccess?.();
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // Drag and drop handlers
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
    handleFileSelect(file);
  };

  // File input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
  };

  // Cancel and close
  const handleCancel = () => {
    clearFile();
    setAltText('');
    setIsPrimary(false);
    onCancel?.();
  };

  const isUploadDisabled = uploading || !selectedFile || (!selectedProduct && !productId);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Add Product Image
      </h2>

      <div className="space-y-4">
        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Product Select */}
          {!productId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={selectedProduct}
                onChange={handleProductChange}
                loadOptions={loadProductOptions}
                defaultOptions={true}
                placeholder="Select Product"
                className="text-sm"
              />
            </div>
          )}

          {/* Variation Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Variation (Optional)
            </label>
            <CustomSelect
              value={selectedVariation}
              onChange={handleVariationChange}
              options={variationOptions}
              placeholder="Select Variation"
              isDisabled={!selectedProduct && !productId}
              className="text-sm"
            />
          </div>

          {/* Alt Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Alt Text (Optional)
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Enter image description"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>

        {/* File Upload Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dropzone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Image File <span className="text-red-500">*</span>
            </label>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex items-center justify-between px-4 py-3 rounded-sm border-2 border-dashed transition-colors cursor-pointer ${
                dragActive
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={FILE_UPLOAD.ACCEPTED_EXTENSIONS}
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Upload className="w-6 h-6 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {selectedFile?.name || 'Drag & drop or click to choose'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    JPEG/PNG · Max {FILE_UPLOAD.MAX_SIZE_MB}MB · Recommended {FILE_UPLOAD.RECOMMENDED_SIZE}
                  </div>
                </div>
              </div>

              {selectedFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="px-2 py-1 text-sm border rounded-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50"
                >
                  Remove
                </button>
              )}
            </div>

            {error && (
              <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
          </div>

          {/* Primary Checkbox */}
          <div className="flex items-end pb-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is-primary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="is-primary"
                className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Set as Primary Image
              </label>
            </div>
          </div>
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-sm border border-gray-300"
                />
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {selectedFile?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Size: {formatFileSize(selectedFile?.size || 0)}
                </p>

                {/* Progress Bar */}
                {uploading && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Uploading... {progress}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploadDisabled}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {uploading ? `Uploading... ${progress}%` : 'Upload Image'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={uploading}
            className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
