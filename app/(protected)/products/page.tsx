'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, Rows4, Package2, Plus, Image, X } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import BusinessTypeSelect from '@/components/ui/business-type-select';
import { Product } from '@/types/api.types';
import { productService } from '@/services';
import apiClient from '@/lib/api/axios';
import { usePermissions } from '@/hooks/use-permissions';
import { confirm, notify } from '@/lib/notifications';
import { useAuthStore } from '@/stores/auth-store';
import dynamic from 'next/dynamic';
const BarcodeStickerPrint = dynamic(
  () => import('@/components/print/barcode/BarcodeStickerPrint'),
  { ssr: false, loading: () => null },
);
import { ImDownload } from "react-icons/im";
import { RiDragDropLine, RiFileExcel2Line } from "react-icons/ri";
import { TiUploadOutline } from "react-icons/ti";
import { PiListBulletsFill, PiListPlusFill } from "react-icons/pi";

export default function ProductsPage() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const isSuperAdmin = user?.user_type === 'super_admin';
  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { hasPermission, isHydrated } = usePermissions();

  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [businessTypeId, setBusinessTypeId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFile = (file: File) => {
    setSelectedFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadSample = () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      let url = `${backendUrl}/api/v1/products/sample-excel`;

      const btId = isSuperAdmin ? businessTypeId : tenantBusinessTypeId;
      if (btId) {
        url += `?business_type_id=${encodeURIComponent(btId)}`;
      }

      window.open(url, '_blank');
    } catch (err) {
      notify.error('Failed to download sample file');
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate file selection
    if (!selectedFile) {
      notify.error('Please select a file to upload');
      return;
    }

    // Validate business type for super admin (tenant uses their own)
    if (isSuperAdmin && !businessTypeId) {
      notify.error('Please select a business type');
      return;
    }

    // Client-side validation: ensure Excel file
    const allowedExt = ['.xls', '.xlsx'];
    const fileName = selectedFile.name.toLowerCase();
    const isValidExt = allowedExt.some(ext => fileName.endsWith(ext));

    if (!isValidExt) {
      notify.error('Invalid file type. Please upload an Excel file (.xls, .xlsx).');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const btId = isSuperAdmin ? businessTypeId : tenantBusinessTypeId;
      if (btId) {
        formData.append('business_type_id', String(btId));
      }

      const response = await apiClient.post('/api/v1/products/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      notify.success(response.data.message || 'Products uploaded successfully');
      setShowBulkUpload(false);
      clearFile();
      setBusinessTypeId(null);
      setRefreshKey(prev => prev + 1); // Refresh the product list
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Bulk upload failed';
      notify.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Business type options (empty - using BusinessTypeSelect instead)
  const businessTypeOptions: { value: string; label: string }[] = [];

  // Check permissions only after store is hydrated
  useEffect(() => {
    if (isHydrated && !hasPermission('view-product')) {
      router.push('/access-denied');
    }
  }, [hasPermission, isHydrated, router]);

  const getStatusBadge = (isActive: boolean) =>
    isActive ? (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        Active
      </span>
    ) : (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        Inactive
      </span>
    );

  const getStockStatusBadge = (quantity: number, minQuantity?: number) => {
    if (quantity === 0) return (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Out of Stock</span>
    );
    if (minQuantity && quantity <= minQuantity) return (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Low Stock</span>
    );
    return (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">In Stock</span>
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
            <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate w-full" title={name}>
              {truncatedName}
            </div>
          </div>
        );
      },
    },
    ...(isSuperAdmin
      ? [
        {
          accessorKey: 'business_type',
          header: 'Business Type',
          meta: { width: '15%' },
          cell: ({ row }: any) => (
            <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 capitalize">
              {row.original.business_type?.name || '-'}
            </span>
          ),
        },
      ]
      : []),
    {
      accessorKey: 'category.name',
      header: 'Category',
      meta: { width: '12%' },
      cell: ({ row }) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.original.category?.name || '-'}</span>,
    },
    {
      accessorKey: 'unit.name',
      header: 'Unit',
      meta: { width: '8%' },
      cell: ({ row }) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.original.unit?.name || '-'}</span>,
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
      accessorKey: 'status',
      header: 'Status',
      meta: { width: '10%' },
      cell: ({ row }) => {
        const status = row.original.status || 'draft';
        const statusColors: Record<string, string> = {
          draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
          active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
          inactive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
          discontinued: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
          archived: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        };
        const defaultColor = 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
        return (
          <span className={`px-1.5 py-0.5 text-xs font-medium rounded capitalize ${statusColors[status] || defaultColor}`}>
            {status}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '15%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {hasPermission('update-products') && (
            <button
              className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
              title="Edit"
              onClick={() => router.push(`/products/edit?id=${row.original.uuid || row.original.id}`)}
             aria-label="Edit">
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            className="p-1 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded cursor-pointer"
            title="Variations"
            onClick={() => router.push(`/product-variations?product_id=${row.original.id}`)}
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
          <BarcodeStickerPrint
            productId={row.original.id}
            productName={row.original.name}
          />
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
                    await productService.deleteProduct(String(row.original.id));
                    notify.success('Product deleted successfully');
                    setRefreshKey(prev => prev + 1); // Refresh the product list
                  } catch (err: any) {
                    notify.error(err?.response?.data?.message || 'Failed to delete product');
                  }
                }
              }}
             aria-label="Delete">
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
    if (!isSuperAdmin && tenantBusinessTypeId) {
      params.append('business_type_id', String(tenantBusinessTypeId));
    }
    const queryString = params.toString();
    return `products${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <PiListBulletsFill className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Product List
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            title="Filter by status"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
            <option value="archived">Archived</option>
          </select>
          <button
            type="button"
            onClick={handleDownloadSample}
            className="px-3 py-1.5 bg-cyan-600 text-white text-sm font-medium rounded-sm hover:bg-cyan-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <ImDownload className="w-4 h-4" /> Product Sample(Excel)
          </button>
          {hasPermission('create-product') && (
            <button
              onClick={() => setShowBulkUpload(!showBulkUpload)}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
            >
              <RiFileExcel2Line className="w-4 h-4" />
              Product Upload (Bulk)
            </button>
          )}
          {hasPermission('create-product') && (
            <button
              onClick={() => router.push('/products/add')}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
            >
              <PiListPlusFill className="w-5 h-5" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Bulk Upload Form */}
      {showBulkUpload && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-1">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Bulk Product Upload</h2>
          <form onSubmit={handleBulkUpload} className="space-y-3">
            {/* Business Type Field - Only for Super Admin */}
            {isSuperAdmin && (
              <div className="w-1/3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Type <span className="text-red-500">*</span>
                </label>
                <BusinessTypeSelect
                  value={businessTypeId}
                  onChange={(id) => setBusinessTypeId(id)}
                  placeholder="Select Business Type"
                  isDisabled={uploading}
                />
              </div>
            )}

            {/* File Upload Field */}
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select File <span className="text-red-500">*</span>
              </label>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const f = e.dataTransfer?.files?.[0];
                  if (f) handleFile(f);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                  className="hidden"
                  disabled={uploading}
                />

                <label
                  htmlFor="file"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-3 px-3 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:border-green-500 transition-colors bg-gray-50 dark:bg-gray-700"
                >
                  <RiDragDropLine className="w-8 h-8" />
                  <div className="text-sm text-gray-700 dark:text-gray-200">
                    {selectedFile ? (
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{selectedFile.name}</span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            clearFile();
                          }}
                          className="text-xs text-red-600 hover:text-red-800 ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium">Click or drop Excel file here</div>
                        <div className="text-xs text-gray-500">.xls, .xlsx — max 10MB</div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Accepted file types: .xls, .xlsx (Excel files only)</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={uploading}
                className="px-3 py-1.5 bg-rose-500 text-white text-sm font-medium rounded-sm hover:bg-rose-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TiUploadOutline className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Excel'}
              </button>

              <button
                type="button"
                onClick={() => setShowBulkUpload(false)}
                disabled={uploading}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DataTable */}
      <DataTable
        key={`${refreshKey}-${statusFilter}`}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by product name, SKU, or description..."
        enablePagination={true}
        enableSorting={true}
      />

      {/* Inline form used above; no modal component to render */}
    </div>
  );
}
