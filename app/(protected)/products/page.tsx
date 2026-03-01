'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Edit, Trash2, Rows4, Package2, Plus, Image } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import { Product } from "@/types/api.types";
import { productService } from '@/services';
import { usePermissions } from '@/hooks/use-permissions';
import { confirm, notify } from '@/lib/notifications';

export default function ProductsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { hasPermission, isHydrated } = usePermissions();

  // Check permissions only after store is hydrated
  useEffect(() => {
    if (isHydrated && !hasPermission('view-products')) {
      router.push('/access-denied');
    }
  }, [hasPermission, isHydrated, router]);

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        Active
      </span>
    ) : (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        Inactive
      </span>
    );
  };

  const getStockStatusBadge = (quantity: number, minQuantity?: number) => {
    if (quantity === 0) {
      return (
        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Out of Stock
        </span>
      );
    }
    if (minQuantity && quantity <= minQuantity) {
      return (
        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Low Stock
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        In Stock
      </span>
    );
  };

  const columns: ColumnDef<Product>[] = [
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
      accessorKey: 'name',
      header: 'Product Name',
      meta: { width: '20%' },
      cell: ({ row }) => {
        const name = row.original.name;
        const maxLength = 30;
        const truncatedName = name.length > maxLength ? name.substring(0, maxLength) + '...' : name;

        return (
          <div className="flex items-center">
            <div
              className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate w-full"
              title={name}
            >
              {truncatedName}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      meta: { width: '10%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
          {row.original.sku || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'base_price',
      header: 'Price',
      meta: { width: '8%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-900 dark:text-gray-100 font-medium">
          ${row.original.base_price?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      meta: { width: '8%' },
      cell: ({ row }) => {
        const status = row.original.status;
        const statusColors = {
          draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
          active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
          inactive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
          discontinued: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
          archived: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        };

        return (
          <span className={`px-1.5 py-0.5 text-xs font-medium rounded capitalize ${statusColors[status as keyof typeof statusColors] || statusColors.draft}`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'brand.name',
      header: 'Brand',
      meta: { width: '10%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.brand?.name || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'category.name',
      header: 'Category',
      meta: { width: '10%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.category?.name || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      meta: { width: '8%' },
      cell: ({ row }) => (
        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
          {row.original.type}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '20%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded cursor-pointer"
            title="View Details"
            onClick={() => console.log('View', row.original.id)}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {hasPermission('update-products') && (
            <button
              className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
              title="Edit"
              onClick={() => router.push(`/products/${row.original.id}/edit`)}
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            className="p-1 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded cursor-pointer"
            title="Variations"
            onClick={() => router.push(`/products/variations?product_id=${row.original.id}`)}
          >
            <Rows4 className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded cursor-pointer"
            title="Images"
            onClick={() => router.push(`/products/images?product_id=${row.original.id}`)}
          >
            <Image className="w-3.5 h-3.5" />
          </button>
          {hasPermission('delete-products') && (
            <button
              className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
              title="Delete"
              onClick={async () => {
                const result = await confirm({
                  title: 'Delete Product',
                  html: `Are you sure you want to delete <strong>${row.original.name}</strong>?<br><br>This action cannot be undone.`,
                  confirmButtonText: 'Delete',
                  cancelButtonText: 'Cancel',
                });

                if (result.isConfirmed) {
                  try {
                    await productService.deleteProduct(row.original.id);
                    notify.success('Product deleted successfully');
                    // The DataTable will automatically refresh
                    window.location.reload();
                  } catch (error) {
                    notify.error('Failed to delete product');
                  }
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Build API endpoint with filters
  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);
    const queryString = params.toString();
    return `/api/v1/products${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Package2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Product List
          </h1>
        </div>
        {hasPermission('create-products') && (
          <button
            onClick={() => router.push('/products/add')}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by product name, SKU, or description..."
        enablePagination={true}
        enableSorting={true}
      />
    </div>
  );
}