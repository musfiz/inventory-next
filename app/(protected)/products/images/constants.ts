/**
 * Product Images Page Constants
 */

// File upload constraints
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 2,
  MAX_SIZE_BYTES: 2 * 1024 * 1024,
  ACCEPTED_TYPES: ['image/jpeg', 'image/png'] as const,
  ACCEPTED_EXTENSIONS: '.jpeg,.jpg,.png',
  RECOMMENDED_SIZE: '800×800',
} as const;

// Table configuration
export const TABLE_CONFIG = {
  DEFAULT_PAGE_SIZE: 15,
  SEARCH_PLACEHOLDER: 'Search by product name, variation, alt text...',
} as const;

// Image dimensions
export const IMAGE_DIMENSIONS = {
  THUMBNAIL_SIZE: { width: 64, height: 64 },
  PREVIEW_SIZE: { width: 96, height: 96 },
} as const;

// Error messages
export const ERROR_MESSAGES = {
  INVALID_FILE_TYPE: 'Please select a JPEG or PNG image',
  FILE_TOO_LARGE: `Image size must be less than ${FILE_UPLOAD.MAX_SIZE_MB}MB`,
  UPLOAD_FAILED: 'Failed to upload image',
  DELETE_FAILED: 'Failed to delete image',
  SET_PRIMARY_FAILED: 'Failed to set primary image',
  NO_PRODUCT_SELECTED: 'Please select a product and an image',
  NO_PRODUCT_ID: 'Cannot determine product ID',
  LOAD_PRODUCTS_FAILED: 'Failed to load products',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  IMAGE_UPLOADED: 'Image uploaded successfully',
  IMAGE_DELETED: 'Image deleted successfully',
  PRIMARY_UPDATED: 'Primary image updated',
} as const;

// Confirmation dialogs
export const CONFIRM_DIALOGS = {
  DELETE_IMAGE: {
    title: 'Delete Image',
    html: 'Are you sure you want to delete this image?<br><br>This action cannot be undone.',
    confirmButtonText: 'Delete',
    cancelButtonText: 'Cancel',
  },
} as const;

// Placeholder image SVG
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E";
