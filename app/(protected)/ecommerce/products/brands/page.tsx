'use client';

import { useState, useRef } from 'react';
import { Edit, Trash2, Building2, Plus, X, Store } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ImDownload } from 'react-icons/im';
import { RiFileExcel2Line } from 'react-icons/ri';
import { TiUploadOutline } from 'react-icons/ti';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import BusinessTypeSelect from '@/components/ui/business-type-select';
import { Brand } from '@/types';
import { notify, confirm } from '@/lib/notifications';
import brandService from '@/services/brandService';
import { formatDate } from '@/lib/utils/date';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Tenant Brand Management
 * Route: /ecommerce/products/brands
 * Visible: tenant_admin / tenant_user with storefront active
 *
 * Uses the shared `brands` table. The tenant's business type is fixed
 * from `tenant.business_type_id` — every create/update sends that
 * `business_type_id` so brands are scoped per business type.
 * Listing is filtered by the same business_type_id.
 */
export default function TenantBrandsPage() {
  const user = useAuthStore(state => state.user);

  const tenantBusinessTypeId =
    (user as any)?.tenant?.business_type?.id ?? (user as any)?.tenant?.business_type_id ?? null;
  const tenantBusinessTypeName = (user as any)?.tenant?.business_type?.name ?? '';

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: null as File | null,
    description: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Bulk upload state
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddBrand = () => {
    setIsEditing(false);
    setCurrentBrand(null);
    setFormData({ name: '', logo_url: null, description: '', is_active: true });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setIsEditing(true);
    setCurrentBrand(brand);

    setFormData({
      name: brand.name,
      logo_url: null,
      description: brand.description || '',
      is_active: brand.is_active,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      errors.name = 'Brand name is required';
    }
    if (!tenantBusinessTypeId) {
      errors.business_type = 'Tenant business type is not configured. Contact support.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (!validateForm()) {
      return;
    }
    if (!tenantBusinessTypeId) return;

    try {
      await brandService.storeBrand({
        id: isEditing && currentBrand?.id ? currentBrand.id : undefined,
        name: formData.name,
        // Fixed to tenant's business type
        business_type_id: tenantBusinessTypeId,
        description: formData.description,
        is_active: formData.is_active,
        logo_url: formData.logo_url,
      });

      notify.success(isEditing ? 'Brand updated successfully' : 'Brand added successfully');
      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const errorData = error?.response?.data;
      if (errorData?.errors) {
        const errors = { ...errorData.errors };
        if (errors.business_type_id) {
          errors.business_type_id = Array.isArray(errors.business_type_id)
            ? errors.business_type_id[0]
            : errors.business_type_id;
        }
        setFormErrors(errors);
      } else {
        const errorMessage = errorData?.message || error?.message || 'Failed to save brand';
        notify.error(errorMessage);
      }
    }
  };

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

  const handleDeleteBrand = async (brand: Brand) => {
    const result = await confirm({
      title: 'Delete Brand',
      html: `Are you sure you want to delete <strong>${brand.name}</strong>?<br><br>
            <div style="color: #6b7280; font-size: 13px; line-height: 1.5;">
              <strong>Description:</strong> ${brand.description || 'No description'}<br>
              <strong>Status:</strong> ${brand.is_active ? 'Active' : 'Inactive'}
            </div><br>
            <em style="color: #dc2626; font-size: 12px;">This action cannot be undone and will permanently delete the brand.</em>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });

    if (!result.isConfirmed) return;

    try {
      await brandService.deleteBrand(brand.id);
      notify.success('Brand deleted successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to delete brand';
      notify.error(errorMessage);
    }
  };

  // Bulk upload handlers
  const handleDownloadSampleExcel = async () => {
    try {
      await brandService.downloadBrandSampleExcel();
      notify.success('Sample Excel downloaded successfully');
    } catch (err) {
      notify.error('Failed to download sample file');
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedExt = ['.xls', '.xlsx'];
    const fileName = file.name.toLowerCase();
    const isValidExt = allowedExt.some(ext => fileName.endsWith(ext));

    if (!isValidExt) {
      notify.error('Invalid file type. Please upload an Excel file (.xls, .xlsx).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      notify.error('File size exceeds 10MB limit.');
      return;
    }

    setSelectedFile(file);
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      notify.error('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);

      const result = await brandService.brandBulkImport(selectedFile);

      if (result.success) {
        notify.success(result.message);
        setShowBulkUpload(false);
        setSelectedFile(null);
        setRefreshKey(prev => prev + 1);
      } else {
        notify.error(result.message);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Bulk upload failed';
      notify.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const columns: ColumnDef<Brand>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      meta: { width: '5%' },
      cell: ({ row }) => (
        <div className="flex items-center">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {row.original.id}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'logo_url',
      header: 'Logo',
      meta: { width: '8%' },
      cell: ({ row }) => {
        const logoUrl = row.original.logo_url;
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') || '';
        const fullLogoUrl = logoUrl ? `${backendUrl}${logoUrl}` : null;
        return (
          <div className="flex items-center justify-center">
            {fullLogoUrl ? (
              <img
                src={fullLogoUrl}
                alt={row.original.name}
                className="w-10 h-10 object-contain rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                onError={e => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27%3E%3Crect width=%2740%27 height=%2740%27 fill=%27%23f3f4f6%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 fill=%27%239ca3af%27 font-size=%2712%27%3ENo Logo%3C/text%3E%3C/svg%3E';
                }}
              />
            ) : (
              <div className="w-10 h-10 flex items-center justify-center rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-xs text-gray-400">
                No Logo
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Brand Name',
      meta: { width: '17%' },
      cell: ({ row }) => {
        const name = row.original.name;
        const maxLength = 20;
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
      accessorKey: 'description',
      header: 'Description',
      meta: { width: '22%' },
      cell: ({ row }) => (
        <div className="flex items-center">
          <div
            className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-xs"
            title={row.original.description}
          >
            {row.original.description || 'No description'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      meta: { width: '15%' },
      cell: ({ row }) => (
        <div className="flex items-center">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {row.original.created_at ? formatDate(row.original.created_at) : 'N/A'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      meta: { width: '8%' },
      cell: ({ row }) => (
        <div className="flex items-center">{getStatusBadge(row.original.is_active)}</div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '13%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
            title="Edit"
            onClick={() => handleEditBrand(row.original)}
            aria-label="Edit"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
            title="Delete"
            onClick={() => handleDeleteBrand(row.original)}
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Build API endpoint with tenant business-type filter
  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    if (tenantBusinessTypeId) params.append('business_type_id', String(tenantBusinessTypeId));
    params.append('sortBy', 'id');
    params.append('sortOrder', 'asc');
    const queryString = params.toString();
    return `brand${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Brands
          </h1>
          {tenantBusinessTypeName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
              <Store className="w-3 h-3" />
              Business type: <span className="font-medium">{tenantBusinessTypeName}</span>
              <span className="text-gray-400">(fixed from your store)</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSampleExcel}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <ImDownload className="w-4 h-4" />
            Brand Sample (Excel)
          </button>
          <button
            onClick={() => setShowBulkUpload(!showBulkUpload)}
            disabled={!tenantBusinessTypeId}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <RiFileExcel2Line className="w-4 h-4" />
            Brand Upload (Bulk)
          </button>
          <button
            onClick={handleAddBrand}
            disabled={!tenantBusinessTypeId}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Brand
          </button>
        </div>
      </div>

      {!tenantBusinessTypeId && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm rounded-md px-3 py-2">
          No business type is linked to your store. Brands cannot be created until a business type
          is assigned to your tenant.
        </div>
      )}

      {/* Bulk Upload Form */}
      {showBulkUpload && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-1">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Bulk Brand Upload</h2>
          <form onSubmit={handleBulkUpload} className="space-y-3">
            {/* File Upload Field */}
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select File <span className="text-red-500">*</span>
              </label>
              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-sm p-4 text-center cursor-pointer hover:border-indigo-500 transition-colors bg-gray-50 dark:bg-gray-700"
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                  className="hidden"
                  disabled={uploading}
                />

                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <RiFileExcel2Line className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        clearFile();
                      }}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">Click or drop Excel file here</div>
                    <div className="text-xs text-gray-500">.xls, .xlsx — max 10MB</div>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Accepted file types: .xls, .xlsx (Excel files only)</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="px-3 py-1.5 bg-rose-500 text-white text-sm font-medium rounded-sm hover:bg-rose-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TiUploadOutline className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Excel'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowBulkUpload(false);
                  clearFile();
                }}
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

      {/* Add/Edit Brand Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Brand' : 'Add Brand'}
          </h2>
          <form
            onSubmit={handleFormSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-1.5"
            encType="multipart/form-data"
          >
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-1">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Business Type <span className="text-red-500">*</span>
                </label>
                <BusinessTypeSelect
                  value={tenantBusinessTypeId}
                  onChange={() => {}}
                  placeholder="Business type"
                  isDisabled
                  isClearable={false}
                  className="w-full"
                />
                <p className="text-gray-400 text-[11px] mt-0.5">Fixed from your store</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter brand name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Status
                </label>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={e => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-1">
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Logo
                </label>
                <div className="flex items-center gap-3 h-20">
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-sm cursor-pointer hover:border-indigo-500 transition-colors bg-gray-50 dark:bg-gray-700">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData({ ...formData, logo_url: file });
                        }
                      }}
                      className="hidden"
                    />
                    <span className="flex flex-col items-center">
                      <svg
                        className="w-6 h-6 text-gray-400 mb-0.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12m-4 4h-4a1 1 0 01-1-1v-1m6 2a2 2 0 002-2v-1a2 2 0 00-2-2h-4a2 2 0 00-2 2v1a2 2 0 002 2h4z"
                        />
                      </svg>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Click to upload image
                      </span>
                    </span>
                  </label>
                  {(formData.logo_url || (isEditing && currentBrand?.logo_url)) && (
                    <div className="flex flex-col items-center">
                      <img
                        src={
                          formData.logo_url
                            ? URL.createObjectURL(formData.logo_url)
                            : currentBrand?.logo_url
                              ? `${(process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '')}${currentBrand.logo_url}`
                              : ''
                        }
                        alt="Logo Preview"
                        className="w-16 h-16 object-contain rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-1"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="text-xs text-gray-500 mt-0.5">
                        {formData.logo_url ? 'New' : 'Current'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex flex-row justify-between items-center">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 text-right">
                    Description
                  </span>
                </div>
                <textarea
                  placeholder="Describe the brand and its unique attributes"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 h-20 md:h-20 resize-none"
                  rows={5}
                />
              </div>
            </div>
            {formErrors.business_type && (
              <p className="text-red-600 text-xs md:col-span-2">{formErrors.business_type}</p>
            )}
            <div className="flex gap-2 md:col-span-2 mt-1.5">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
              >
                <GiSave className="w-4 h-4" />
                {isEditing ? 'Update Brand' : 'Save Brand'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DataTable — scoped to tenant business type */}
      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by brand name, description..."
      />
    </div>
  );
}
