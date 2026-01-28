'use client';

import { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, Building2, Plus, X } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '../components/DataTable';
import CustomSelect from '../components/CustomSelect';
import { Brand } from "@/types";
import { useAuth } from '@/hooks/useAuth';
import { confirm, notify } from '@/lib/notifications';
import tenantService from '@/services/tenantService';
import brandService from '@/services/brandService';

export default function BrandsPage() {
  const [tenantFilter, setTenantFilter] = useState<string>('');
  const [tenants, setTenants] = useState<any[]>([]);
  const { user: currentUser } = useAuth();

  // Check if current user is super admin
  const isSuperAdmin = currentUser?.user_type === 'super_admin';

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: null as File | null,
    description: '',
    is_active: true,
    tenant_id: '',
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddBrand = () => {
    setIsEditing(false);
    setCurrentBrand(null);
    // Use tenantFilter for superadmin, empty for regular users
    const initialTenantId = isSuperAdmin ? tenantFilter : '';
    setFormData({ name: '', logo_url: null, description: '', is_active: true, tenant_id: initialTenantId });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setIsEditing(true);
    setCurrentBrand(brand);

    // For superadmin, set the tenantFilter to the brand's tenant_id
    if (isSuperAdmin && brand.tenant?.id) {
      setTenantFilter(brand.tenant.id);
    }

    setFormData({
      name: brand.name,
      logo_url: null,
      description: brand.description || '',
      is_active: brand.is_active,
      tenant_id: brand.tenant?.id || '',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      errors.name = 'Brand name is required';
    }
    if (isSuperAdmin && !tenantFilter) {
      errors.tenant = 'Please select a tenant';
    }
    const tenantId = isSuperAdmin ? tenantFilter : (currentUser?.tenant_id || '');
    if (!tenantId) {
      errors.tenant_id = 'Tenant ID is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Set tenant_id: from tenantFilter for superadmin (set from CustomSelect), otherwise from currentUser
    const tenantId = isSuperAdmin ? tenantFilter : (currentUser?.tenant_id || '');

    if (!tenantId) {
      notify.error('Tenant selection required');
      return;
    }
    setFormErrors({}); // Clear previous errors before validation/submission
    if (!validateForm()) {
      return;
    }

    try {
      await brandService.storeBrand({
        id: isEditing && currentBrand?.id ? currentBrand.id : undefined,
        name: formData.name,
        description: formData.description,
        is_active: formData.is_active,
        tenant_id: tenantId,
        logo_url: formData.logo_url,
      });

      notify.success(isEditing ? 'Brand updated successfully' : 'Brand added successfully');
      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const errorData = error?.response?.data;
      if (errorData?.errors) {
        // Map server-side errors to formErrors state (assumes { errors: { fieldName: 'message' } })
        setFormErrors(errorData.errors);
      } else {
        // Fallback to general error notification if no field-specific errors
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Fetch tenants for superadmin filter
  useEffect(() => {
    if (isSuperAdmin) {
      tenantService.searchTenants()
        .then((tenants) => {
          setTenants(Array.isArray(tenants) ? tenants : []);
        })
        .catch((error) => {
          console.error('Failed to fetch tenants:', error);
          setTenants([]);
        });
    }
  }, [isSuperAdmin]);

  // Create tenant options for React Select
  const tenantOptions = [
    { value: '', label: 'Select Tenant' },
    ...tenants.map((tenant) => ({
      value: tenant.id,
      label: tenant.business_name,
    }))
  ];

  const columns: ColumnDef<Brand>[] = [
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
      header: 'Brand Name',
      meta: { width: '20%' },
      cell: ({ row }) => {
        const name = row.original.name;
        const maxLength = 20; // Maximum characters to display
        const truncatedName = name.length > maxLength ? name.substring(0, maxLength) + '...' : name;

        return (
          <div className="flex items-center gap-2">
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
      meta: { width: '25%' },
      cell: ({ row }) => (
        <div className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-xs" title={row.original.description}>
          {row.original.description || 'No description'}
        </div>
      ),
    },
    {
      accessorKey: 'tenant.business_name',
      header: 'Tenant',
      meta: { width: '15%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.tenant?.business_name || 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      meta: { width: '15%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.created_at ? formatDate(row.original.created_at) : 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      meta: { width: '8%' },
      cell: ({ row }) => getStatusBadge(row.original.is_active),
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
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          {isSuperAdmin && (
            <button
              className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
              title="Delete"
              onClick={() => console.log('Delete', row.original.id)}
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
    // if (statusFilter !== 'all') params.append('status', statusFilter);
    if (isSuperAdmin && tenantFilter) params.append('tenant_id', tenantFilter);
    const queryString = params.toString();
    return `/api/v1/brand${queryString ? `?${queryString}` : ''}`;
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
              {/* Tenant Filter - Only for Super Admin */}
              <div className="md:col-span-2">
                <CustomSelect
                  className={'w-64 text-xs'}
                  value={tenantOptions.find(t => t.value === tenantFilter) || null}
                  onChange={(option) => setTenantFilter(option?.value || '')}
                  options={tenantOptions}
                  placeholder="Select a tenant"
                />
                {formErrors.tenant && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.tenant}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Brand Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Brand' : 'Add New Brand'}
          </h2>
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-1.5" encType="multipart/form-data">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Name</label>
                <input
                  type="text"
                  placeholder="Enter brand name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  required
                />
                {formErrors.name && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Status</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo</label>
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
                      <svg className="w-6 h-6 text-gray-400 mb-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12m-4 4h-4a1 1 0 01-1-1v-1m6 2a2 2 0 002-2v-1a2 2 0 00-2-2h-4a2 2 0 00-2 2v1a2 2 0 002 2h4z" /></svg>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Click to upload image</span>
                    </span>
                  </label>
                  {(formData.logo_url || formData.logo_url) && (
                    <div className="flex flex-col items-center">
                      <img src={formData.logo_url ? URL.createObjectURL(formData.logo_url) : formData.logo_url} alt="Logo Preview" className="w-12 h-12 object-contain rounded border border-gray-200 dark:border-gray-600" />
                      <span className="text-xs text-gray-500 mt-0.5">{formData.logo_url ? 'New' : 'Current'}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex flex-row justify-between items-center">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 text-right">Description</span>
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
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Edit className="w-4 h-4" />
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
        searchable={true}
        searchPlaceholder="Search by brand name, description..."
      />
    </div>
  );
}