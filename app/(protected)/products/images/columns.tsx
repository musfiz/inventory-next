import { ColumnDef } from '@tanstack/react-table';
import { Star, Trash2 } from 'lucide-react';
import { ProductImage } from '@/types/api.types';
import { buildImageUrl, handleImageError } from './utils';

/**
 * Generate table columns for product images
 */
export function createProductImageColumns(
  onDelete: (image: ProductImage) => void,
  onSetPrimary: (image: ProductImage) => void,
  canDelete?: boolean,
  canSetPrimary?: boolean
): ColumnDef<ProductImage>[] {
  return [
    {
      id: 'serial',
      header: 'SL',
      meta: { width: '6%' },
      cell: ({ row, table }) => {
        const pageIndex = table.getState().pagination.pageIndex;
        const pageSize = table.getState().pagination.pageSize;
        const serialNumber = pageIndex * pageSize + row.index + 1;

        return (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {serialNumber}
          </span>
        );
      },
    },
    {
      id: 'image',
      header: 'Image',
      meta: { width: '6%' },
      cell: ({ row }) => {
        const imageUrl = buildImageUrl(row.original.file_url);

        return (
          <div className="flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={row.original.alt_text || 'Product image'}
                className="h-16 w-16 rounded-sm object-cover border border-gray-200 dark:border-gray-600"
                onError={handleImageError}
              />
            ) : (
              <div className="w-16 h-16 flex items-center justify-center rounded-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-xs text-gray-400">
                No Image
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'product',
      header: 'Product Name',
      cell: ({ row }) => (
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {row.original.product?.name || 'Unknown Product'}
        </div>
      ),
    },
    {
      accessorKey: 'variation',
      header: 'Variation',
      cell: ({ row }) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {row.original.variation ? (
            <span>{row.original.variation.name || row.original.variation.sku}</span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 italic">-</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'alt_text',
      header: 'Alt Text',
      cell: ({ row }) => (
        <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
          {row.original.alt_text || (
            <span className="text-gray-400 dark:text-gray-500 italic">-</span>
          )}
        </div>
      ),
    },
    {
      id: 'is_primary',
      header: 'Primary',
      cell: ({ row }) =>
        row.original.is_primary ? (
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Star className="w-3 h-3 mr-1 fill-current" />
            Primary
          </span>
        ) : canSetPrimary ? (
          <button
            onClick={() => onSetPrimary(row.original)}
            className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-green-100 hover:text-green-800 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors cursor-pointer"
            title="Set as Primary"
            type="button"
          >
            <Star className="w-3 h-3 mr-1" />
            Set Primary
          </button>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 italic">-</span>
        ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => canDelete ? (
        <button
          onClick={() => onDelete(row.original)}
          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
          title="Delete"
          type="button"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ) : (
        <span className="text-gray-400 dark:text-gray-500 italic">-</span>
      ),
    },
  ];
}
