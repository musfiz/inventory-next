'use client';

import { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, Building2, Plus, X } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import BusinessTypeSelect from '@/components/ui/business-type-select';
import { Brand } from '@/types';
import { notify, confirm } from '@/lib/notifications';
import brandService from '@/services/brandService';
import { formatDate } from '@/lib/utils/date';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';

export default function BrandsPage() {
  const { isSuperAdmin, isHydrated } = usePermissions();
  const user = useAuthStore(state => state.user);
  const router = useRouter();

  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;
  const [businessTypeFilterId, setBusinessTypeFilterId] = useState<number | null>(
    isSuperAdmin ? null : tenantBusinessTypeId
  );

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    business_type_id: null as number | null,
    logo_url: null as File | null,
    description: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddBrand = () => {
    setIsEditing(false);
    setCurrentBrand(null);
    setFormData({ name: '', business_type_id: isSuperAdmin ? businessTypeFilterId : tenantBusinessTypeId, logo_url: null, description: '', is_active: true });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setIsEditing(true);
    setCurrentBrand(brand);

    setFormData({
      name: brand.name,
      business_type_id: brand.business_type_id ?? brand.business_type?.id ?? null,
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
    if (!formData.business_type_id) {
      errors.business_type_id = 'Business type is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({}); // Clear previous errors before validation/submission
    if (!validateForm()) {
      return;
    }

    try {
      const effectiveBtId = formData.business_type_id ?? (isSuperAdmin ? businessTypeFilterId : tenantBusinessTypeId);
      if (!effectiveBtId) {
        setFormErrors({ ...formErrors, business_type_id: 'Business type is required' });
        return;
      }
      await brandService.storeBrand({
        id: isEditing && currentBrand?.id ? currentBrand.id : undefined,
        name: formData.name,
        business_type_id: effectiveBtId,
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
          errors.business_type_id = Array.isArray(errors.business_type_id) ? errors.business_type_id[0] : errors.business_type_id;
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

  // Business type options (fallback for display only)
  const businessTypeOptions: { value: string; label: string }[] = [];

  const columns: ColumnDef<Brand>[] = [
    {
      id: 'serial',
      header: '#',
      meta: { width: '4%' },
      cell: ({ row, table }) => {
        const page = table.getState().pagination?.pageIndex ?? 0;
        const pageSize = table.getState().pagination?.pageSize ?? 15;
        return (
          <div className="flex items-center">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {page * pageSize + row.index + 1}
            </span>
          </div>
        );
      },
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
        const maxLength = 20; // Maximum characters to display
        const truncatedName = name.length > maxLength ? name.substring(0, maxLength) + '...' : name;

        return (
          <div className="flex items-center">
            <div
              className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate w-full"
              title={name} // Show full name on hover
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
    ...(isSuperAdmin
      ? [
        {
          accessorKey: 'business_type',
          header: 'Business Type',
          meta: { width: '12%' },
          cell: ({ row }: any) => (
            <div className="flex items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                {row.original.business_type?.name || 'Other'}
              </span>
            </div>
          ),
        },
      ]
      : []),
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
           aria-label="Edit">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
            title="Delete"
            onClick={() => handleDeleteBrand(row.original)}
           aria-label="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Build API endpoint with filters
  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    const effectiveBtId = isSuperAdmin ? businessTypeFilterId : tenantBusinessTypeId;
    if (effectiveBtId) params.append('business_type_id', String(effectiveBtId));
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
            Brand List
          </h1>
        </div>
        <button
          onClick={handleAddBrand}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Brand
        </button>
      </div>

      {/* Filters */}
      {isSuperAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              {/* Business Type Filter */}
              <div className="md:col-span-2">
                <BusinessTypeSelect
                  value={businessTypeFilterId}
                  onChange={(id) => setBusinessTypeFilterId(id)}
                  placeholder="Filter by business type"
                />
              </div>
            </div>
          </div>
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
              {isSuperAdmin && (
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    Business Type
                  </label>
                  <BusinessTypeSelect
                    value={formData.business_type_id}
                    onChange={(id) => setFormData({ ...formData, business_type_id: id })}
                    placeholder="Select business type"
                    className="w-full"
                    isInvalid={!!formErrors.business_type_id}
                  />
                  {formErrors.business_type_id && <p className="text-red-600 text-xs mt-1">{formErrors.business_type_id}</p>}
                </div>
              )}
              <div className={isSuperAdmin ? 'md:col-span-2' : 'md:col-span-3'}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter brand name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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
                  onChange={e =>
                    setFormData({ ...formData, is_active: e.target.value === 'active' })
                  }
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

      {/* DataTable */}
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
