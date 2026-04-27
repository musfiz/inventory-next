import { FILE_UPLOAD, PLACEHOLDER_IMAGE } from './constants';

/**
 * Validates if a file meets the upload requirements
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Validate file type
  if (!FILE_UPLOAD.ACCEPTED_TYPES.includes(file.type as any)) {
    return { valid: false, error: 'Please select a JPEG or PNG image' };
  }

  // Validate file size
  if (file.size > FILE_UPLOAD.MAX_SIZE_BYTES) {
    return { valid: false, error: `Image size must be less than ${FILE_UPLOAD.MAX_SIZE_MB}MB` };
  }

  return { valid: true };
}

/**
 * Formats file size in KB
 */
export function formatFileSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

/**
 * Creates a preview URL from a file
 */
export function createPreviewUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Builds the full image URL from a file path
 */
export function buildImageUrl(fileUrl?: string): string | null {
  if (!fileUrl) return null;

  if (fileUrl.startsWith('http')) {
    return fileUrl;
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') || '';
  const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;

  return `${backendUrl}${path}`;
}

/**
 * Handles image load error by setting a placeholder
 */
export function handleImageError(event: React.SyntheticEvent<HTMLImageElement>): void {
  event.currentTarget.src = PLACEHOLDER_IMAGE;
}

/**
 * Revokes a preview URL to free memory
 */
export function revokePreviewUrl(url: string | null): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
