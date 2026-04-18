'use client';

import { useRouter } from 'next/navigation';
import { Package, Plus, Edit, Trash2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import { ProductVariation } from '@/types/api.types';
import productVariationService from '@/services/productVariationService';
import { confirm, notify } from '@/lib/notifications';

export default function ProductVariationsPage() {
  const router = useRouter();

  const columns: ColumnDef<ProductVariation>[] = [
    {
      id: 'serial',
      header: '#',
      meta: { width: '4%' },
      cell: ({ row, table }) => {
        const page = table.getState().pagination?.pageIndex ?? 0;
        const pageSize = table.getState().pagination?.pageSize ?? 15;
        return (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {page * pageSize + row.index + 1}
          </span>
        );
      },
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      meta: { width: '12%' },
      cell: ({ row }) => (
        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
          {row.original.sku}
        </span>
      ),
    },
    {
      accessorKey: 'product.name',
      header: 'Product',
      meta: { width: '18%' },
      cell: ({ row }) => {
        const productName = row.original.product?.name || '-';
        const maxLength = 30;
        const truncatedName =
          productName.length > maxLength
            ? productName.substring(0, maxLength) + '...'
            : productName;

        return (
          <div className="text-xs text-gray-700 dark:text-gray-300" title={productName}>
            {truncatedName}
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Variation Name',
      meta: { width: '15%' },
      cell: ({ row }) => {
        const name = row.original.name || '-';
        const maxLength = 25;
        const truncatedName = name.length > maxLength ? name.substring(0, maxLength) + '...' : name;

        return (
          <div className="text-xs text-gray-700 dark:text-gray-300" title={name}>
            {truncatedName}
          </div>
        );
      },
    },
    {
      id: 'attributes',
      header: 'Attributes',
      meta: { width: '18%' },
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.variation_attributes?.map(attr => (
            <span
              key={attr.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
            >
              {attr.attribute?.name}: {attr.attribute_value?.value}
            </span>
          )) || <span className="text-xs text-gray-500">-</span>}
        </div>
      ),
    },
    {
      accessorKey: 'cost_price',
      header: 'Cost Price',
      meta: { width: '10%' },
      cell: ({ row }) => (
        <span className="text-xs text-right text-gray-700 dark:text-gray-300">
          ৳ {Number(row.original.cost_price).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'selling_price',
      header: 'Selling Price',
      meta: { width: '12%' },
      cell: ({ row }) => (
        <span className="text-xs text-right text-gray-700 dark:text-gray-300">
          ৳ {Number(row.original.selling_price).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      meta: { width: '8%' },
      cell: ({ row }) => (
        <span
          className={`px-1.5 py-0.5 text-xs font-medium rounded ${
            row.original.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {row.original.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '10%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
            title="Edit"
            onClick={() => router.push(`/product-variations/${row.original.id}/edit`)}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
            title="Delete"
            onClick={async () => {
              const result = await confirm({
                title: 'Delete Variation',
                html: `Are you sure you want to delete variation <strong>${row.original.sku}</strong>?<br><br>This action cannot be undone.`,
                confirmButtonText: 'Delete',
                cancelButtonText: 'Cancel',
              });

              if (result.isConfirmed) {
                try {
                  await productVariationService.deleteVariation(row.original.id);
                  notify.success('Variation deleted successfully');
                  window.location.reload();
                } catch (error) {
                  notify.error('Failed to delete variation');
                }
              }
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Product Variations
          </h1>
        </div>
        <button
          onClick={() => router.push('/product-variations/add')}
          className="flex items-center gap-2 px-2 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-6 h-6" />
          Add Variation
        </button>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        apiEndpoint="product-variations"
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by SKU, product name, or variation name..."
        enablePagination={true}
        enableSorting={true}
      />
    </div>
  );
}
