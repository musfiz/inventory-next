# Product Images Management Module

## Overview

This module provides a professional, modular implementation for managing product images with upload, delete, and primary image functionality.

## Structure

```
app/(protected)/products/images/
├── page.tsx                    # Main page component
├── constants.ts                # Configuration and constants
├── types.ts                    # TypeScript type definitions
├── utils.ts                    # Utility functions
├── columns.tsx                 # DataTable column definitions
├── components/
│   ├── index.ts               # Component exports
│   └── ImageUploadForm.tsx    # Upload form component
└── hooks/
    ├── index.ts               # Hook exports
    ├── use-product-images.ts  # Image operations hook
    └── use-product-selection.ts # Product/variation selection hook
```

## Features

### ✨ Core Functionality
- **Drag & Drop Upload**: Upload images by dragging and dropping
- **File Validation**: Automatic validation for file type and size
- **Image Preview**: Real-time preview before upload
- **Upload Progress**: Visual progress bar during upload
- **Primary Image**: Mark one image as primary per product
- **Delete Images**: Remove unwanted images
- **Search & Filter**: Search and filter images by product, variation
- **Pagination**: Efficient data loading with pagination

### 🎨 Professional Features
- **Modular Architecture**: Separated concerns for easy maintenance
- **Custom Hooks**: Reusable logic for image operations
- **Type Safety**: Full TypeScript support
- **Error Handling**: Comprehensive error handling with user notifications
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Dark Mode**: Full dark mode support
- **Responsive**: Mobile-friendly design

## Configuration

### File Upload Settings

Edit `constants.ts` to customize upload constraints:

```typescript
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 2,                              // Maximum file size in MB
  MAX_SIZE_BYTES: 2 * 1024 * 1024,            // Maximum file size in bytes
  ACCEPTED_TYPES: ['image/jpeg', 'image/png'], // Allowed file types
  ACCEPTED_EXTENSIONS: '.jpeg,.jpg,.png',      // File extensions
  RECOMMENDED_SIZE: '800×800',                 // Recommended dimensions
} as const;
```

### Table Settings

```typescript
export const TABLE_CONFIG = {
  DEFAULT_PAGE_SIZE: 15,                       // Items per page
  SEARCH_PLACEHOLDER: 'Search by product...',  // Search placeholder text
} as const;
```

### Error Messages

Customize error messages in `constants.ts`:

```typescript
export const ERROR_MESSAGES = {
  INVALID_FILE_TYPE: 'Please select a JPEG or PNG image',
  FILE_TOO_LARGE: 'Image size must be less than 2MB',
  // ... more messages
} as const;
```

## Usage

### Basic Usage

```typescript
import ProductImagesPage from '@/app/(protected)/products/images/page';

// Use in routes or as standalone component
<ProductImagesPage />
```

### With Product Filter

```typescript
// URL: /products/images?product_id=123
// Automatically filters images for product ID 123
```

### Using Custom Hooks

```typescript
import { useProductImages, useProductSelection } from './hooks';

function MyComponent() {
  const {
    uploadState,
    handleFileSelect,
    handleUpload,
    handleDelete,
    handleSetPrimary,
    clearSelection,
    refreshImages,
    refreshKey,
  } = useProductImages();

  const {
    selectedProduct,
    selectedVariation,
    variationOptions,
    loadProductOptions,
    handleProductChange,
    handleVariationChange,
  } = useProductSelection(productId);

  // ... your component logic
}
```

## Customization Guide

### Adding New Fields

1. **Update Types** (`types.ts`):
```typescript
export interface ProductImageFormData {
  product_id: string;
  image: File;
  variation_id?: string;
  alt_text?: string;
  is_primary?: boolean;
  your_new_field?: string;  // Add here
}
```

2. **Update Form Component** (`components/ImageUploadForm.tsx`):
```typescript
const [yourNewField, setYourNewField] = useState('');

// Add input field in JSX
<input
  value={yourNewField}
  onChange={(e) => setYourNewField(e.target.value)}
  // ...
/>

// Include in onUpload call
onUpload({
  alt_text: altText,
  is_primary: isPrimary,
  variation_id: selectedVariation?.value,
  your_new_field: yourNewField,
});
```

### Adding Custom Columns

Edit `columns.tsx`:

```typescript
export function createProductImageColumns(
  onDelete: (image: ProductImage) => void,
  onSetPrimary: (image: ProductImage) => void
): ColumnDef<ProductImage>[] {
  return [
    // ... existing columns
    {
      id: 'your_custom_column',
      header: 'Custom Header',
      cell: ({ row }) => (
        <div>{row.original.your_field}</div>
      ),
    },
  ];
}
```

### Styling

The module uses Tailwind CSS classes. To customize:

1. **Update component classes** in `ImageUploadForm.tsx` or `page.tsx`
2. **Modify constants** for consistent theming
3. **Use Tailwind's dark mode classes** for dark theme support

### API Integration

The module uses services from `/services`. To change API endpoints:

1. **Update service calls** in `hooks/use-product-images.ts`
2. **Modify productImageService** methods
3. **Adjust response handling** as needed

## Best Practices

### Performance
- Images are resized on the backend (800×800 main, 200×200 thumbnail)
- Lazy loading for large image lists
- Memoized columns to prevent unnecessary re-renders

### Security
- File type validation on both client and server
- File size limits enforced
- Secure file upload with authentication

### User Experience
- Clear error messages
- Upload progress indication
- Confirmation dialogs for destructive actions
- Responsive design for all devices

## Troubleshooting

### Images Not Displaying
- Check that `NEXT_PUBLIC_BACKEND_URL` is set correctly in `.env`
- Verify file paths in the database
- Ensure storage is linked: `php artisan storage:link`

### Upload Fails
- Check file size and type restrictions
- Verify backend API endpoint is accessible
- Check network tab for detailed error messages

### TypeScript Errors
- Run `npm run type-check` to identify issues
- Ensure all imports are correct
- Check that types match between frontend and backend

## API Reference

### Custom Hooks

#### useProductImages()
Manages product image operations.

**Returns:**
```typescript
{
  uploadState: ImageUploadState;
  handleFileSelect: (file: File | null) => void;
  handleUpload: (formData: ProductImageFormData) => Promise<void>;
  handleDelete: (image: ProductImage) => Promise<void>;
  handleSetPrimary: (image: ProductImage) => Promise<void>;
  clearSelection: () => void;
  refreshImages: () => void;
  refreshKey: number;
}
```

#### useProductSelection(productId?)
Manages product and variation selection.

**Parameters:**
- `productId` (optional): Initial product ID to load variations for

**Returns:**
```typescript
{
  selectedProduct: SelectOption | null;
  selectedVariation: SelectOption | null;
  variationOptions: SelectOption[];
  loadProductOptions: (inputValue: string) => Promise<SelectOption[]>;
  handleProductChange: (option: SelectOption | null) => void;
  handleVariationChange: (option: SelectOption | null) => void;
  resetSelections: () => void;
}
```

## License

Part of the Inventory Management System.
