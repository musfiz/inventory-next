'use client';

import { useState, useEffect } from 'react';
import { Warehouse as WarehouseIcon, Plus, Edit, Trash2, X, MapPin } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import { warehouseService, commonService } from '@/services';
import type { Warehouse } from '@/services/warehouseService';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';

export default function WarehousePage() {
  const { isSuperAdmin, hasPermission, hasAnyPermission, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!hasPermission('view-warehouse')) router.replace('/dashboard');
  }, [isHydrated, hasPermission, router]);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentWarehouse, setCurrentWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    tenant_id: '' as string | undefined,
    code: '',
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: 'Bangladesh',
    postal_code: '',
    is_active: true,
    is_default: false,
    is_sales_location: false,
    is_purchase_location: false,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const [defaultTenantOptions, setDefaultTenantOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  // Load tenant options for super admin
  const loadTenantOptions = async (
    inputValue: string
  ): Promise<{ value: string; label: string }[]> => {
    try {
      if (!isSuperAdmin) return [];

      const tenants = await commonService.getTenantsForDropdown({ search: inputValue });
      const options = tenants.map(tenant => ({
        value: tenant.id,
        label: tenant.business_name,
      }));

      // Store default options for initial load
      if (!inputValue && defaultTenantOptions.length === 0) {
        setDefaultTenantOptions(options);
      }

      return options;
    } catch (error) {
      console.error('Failed to load tenants:', error);
      return [];
    }
  };

  const handleAddWarehouse = () => {
    setIsEditing(false);
    setCurrentWarehouse(null);
    setFormData({
      tenant_id: undefined,
      code: '',
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      country: 'Bangladesh',
      postal_code: '',
      is_active: true,
      is_default: false,
      is_sales_location: false,
      is_purchase_location: false,
    });
    setFormErrors({});
    setSelectedTenant(null);
    // Load default tenant options for super admin only
    if (isSuperAdmin) {
      loadTenantOptions('');
    }
    setShowForm(true);
  };

  const handleEditWarehouse = (warehouse: Warehouse) => {
    setIsEditing(true);
    setCurrentWarehouse(warehouse);
    setFormData({
      tenant_id: isSuperAdmin ? warehouse.tenant_id : undefined,
      code: warehouse.code,
      name: warehouse.name,
      contact_person: warehouse.contact_person || '',
      phone: warehouse.phone || '',
      email: warehouse.email || '',
      address: warehouse.address || '',
      city: warehouse.city || '',
      state: warehouse.state || '',
      country: warehouse.country || 'Bangladesh',
      postal_code: warehouse.postal_code || '',
      is_default: warehouse.is_default,
      is_active: warehouse.is_active,
      is_sales_location: warehouse.is_sales_location,
      is_purchase_location: warehouse.is_purchase_location,
    });
    setFormErrors({});
    // Set selected tenant only for super admin
    if (isSuperAdmin && warehouse.tenant) {
      setSelectedTenant({ value: warehouse.tenant.id, label: warehouse.tenant.business_name });
      // Load default tenant options
      loadTenantOptions('');
    } else {
      setSelectedTenant(null);
    }
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    // Validate tenant for super admin
    if (isSuperAdmin && !formData.tenant_id) {
      errors.tenant_id = 'Tenant selection required';
    }

    if (!formData.code.trim()) {
      errors.code = 'Warehouse code is required';
    }

    if (!formData.name.trim()) {
      errors.name = 'Warehouse name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      // Prepare submit data
      const submitData: any = {
        code: formData.code,
        name: formData.name,
        contact_person: formData.contact_person,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postal_code: formData.postal_code,
        is_default: formData.is_default,
        is_active: formData.is_active,
        is_sales_location: formData.is_sales_location,
        is_purchase_location: formData.is_purchase_location,
      };

      // Only include tenant_id if super admin
      if (isSuperAdmin && formData.tenant_id) {
        submitData.tenant_id = formData.tenant_id;
      }

      // Add id for editing
      if (isEditing && currentWarehouse) {
        submitData.id = currentWarehouse.id;
      }

      await warehouseService.storeWarehouse(submitData);
      notify.success(
        isEditing ? 'Warehouse updated successfully' : 'Warehouse created successfully'
      );
      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { errors?: Record<string, string[]>; message?: string } };
      };
      if (axiosError.response?.data?.errors) {
        const transformedErrors: { [key: string]: string } = {};
        Object.entries(axiosError.response.data.errors).forEach(([key, messages]) => {
          transformedErrors[key] = Array.isArray(messages) ? messages.join(', ') : messages;
        });
        setFormErrors(transformedErrors);
      } else {
        notify.error(axiosError.response?.data?.message || 'Failed to save warehouse');
      }
    }
  };

  const handleDelete = async (warehouse: Warehouse) => {
    const result = await confirm({
      title: 'Delete Warehouse',
      html: `Are you sure you want to delete warehouse <strong>${warehouse.name}</strong>?<br><br>
            <div style="color: #6b7280; font-size: 13px; line-height: 1.5;">
              <strong>Code:</strong> ${warehouse.code}<br>
              <strong>City:</strong> ${warehouse.city || 'N/A'}<br>
              <strong>Status:</strong> ${warehouse.is_active ? 'Active' : 'Inactive'}
            </div><br>
            <em style="color: #dc2626; font-size: 12px;">This action cannot be undone. Warehouse must not have any stock records.</em>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });

    if (!result.isConfirmed) return;

    try {
      await warehouseService.deleteWarehouse(warehouse.id);
      notify.success('Warehouse deleted successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      notify.error(axiosError.response?.data?.message || 'Failed to delete warehouse');
    }
  };

  const columns: ColumnDef<Warehouse>[] = [
    {
      id: 'serial',
      header: 'SL',
      cell: ({ row, table }) => (
        <span className="text-gray-600 dark:text-gray-400">
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
            row.index +
            1}
        </span>
      ),
    },
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <WarehouseIcon className="w-4 h-4 text-blue-500" />
          <span className="font-medium font-mono">{row.original.code}</span>
          {row.original.is_default && (
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-400">
              Default
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{row.original.name}</div>
          {row.original.contact_person && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Contact: {row.original.contact_person}
            </div>
          )}
        </div>
      ),
    },
    ...(isSuperAdmin
      ? [
        {
          id: 'tenant',
          header: 'Tenant',
          cell: ({ row }: { row: any }) => (
            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              {row.original.tenant?.business_name || '-'}
            </span>
          ),
        },
      ]
      : []),
    {
      id: 'location',
      header: 'Location',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="w-3 h-3" />
          <span>
            {row.original.city
              ? `${row.original.city}, ${row.original.country}`
              : row.original.country}
          </span>
        </div>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.phone && (
            <div className="text-gray-600 dark:text-gray-400">{row.original.phone}</div>
          )}
          {row.original.email && (
            <div className="text-gray-500 dark:text-gray-500 text-xs">{row.original.email}</div>
          )}
          {!row.original.phone && !row.original.email && <span className="text-gray-400">-</span>}
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.is_sales_location && (
            <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Sales
            </span>
          )}
          {row.original.is_purchase_location && (
            <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              Purchase
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${row.original.is_active
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}
        >
          {row.original.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    ...(isSuperAdmin || hasAnyPermission(['edit-warehouse', 'delete-warehouse'])
      ? [
        {
          id: 'actions',
          header: 'Actions',
          cell: ({ row }: { row: any }) => (
            <div className="flex items-center gap-2">
              {(isSuperAdmin || hasPermission('edit-warehouse')) && (
                <button
                  onClick={() => handleEditWarehouse(row.original)}
                  className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 cursor-pointer"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {(isSuperAdmin || hasPermission('delete-warehouse')) && (
                <button
                  onClick={() => handleDelete(row.original)}
                  className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ),
        },
      ]
      : []),
  ];

  // Build API endpoint with filters
  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    const queryString = params.toString();
    return `warehouses${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <WarehouseIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Warehouses
          </h1>
        </div>
        {(isSuperAdmin || hasPermission('create-warehouse')) && (
          <button
            onClick={handleAddWarehouse}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Warehouse
          </button>
        )}
      </div>

      {/* Add/Edit Warehouse Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Warehouse' : 'Add Warehouse'}
          </h2>
          <form onSubmit={handleFormSubmit} className="space-y-3">
            {/* Tenant Selection - Only for Super Admin */}
            {isSuperAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                <div>
                  <CustomSelect
                    value={selectedTenant}
                    onChange={option => {
                      setFormData({ ...formData, tenant_id: option?.value || undefined });
                      setSelectedTenant(option);
                      // Clear tenant error when selection is made
                      if (option?.value && formErrors.tenant_id) {
                        const { tenant_id, ...rest } = formErrors;
                        setFormErrors(rest);
                      }
                    }}
                    loadOptions={loadTenantOptions}
                    defaultOptions={defaultTenantOptions}
                    placeholder="Select tenant"
                    className="text-sm"
                    isInvalid={!!formErrors.tenant_id}
                  />
                  {formErrors.tenant_id && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.tenant_id}</p>
                  )}
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Warehouse Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Main Warehouse"
                  value={formData.name}
                  onChange={e => {
                    setFormData({ ...formData, name: e.target.value });
                    // Clear name error when user types
                    if (e.target.value.trim() && formErrors.name) {
                      const { name, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                />
                {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="WH001"
                  value={formData.code}
                  onChange={e => {
                    setFormData({ ...formData, code: e.target.value });
                    // Clear code error when user types
                    if (e.target.value.trim() && formErrors.code) {
                      const { code, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.code ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                />
                {formErrors.code && <p className="text-red-600 text-xs mt-1">{formErrors.code}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Contact Person
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={formData.contact_person}
                  onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1.5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Phone
                </label>
                <input
                  type="text"
                  placeholder="+880 1234567890"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="warehouse@example.com"
                  value={formData.email}
                  onChange={e => {
                    setFormData({ ...formData, email: e.target.value });
                    // Clear email error when valid email is entered
                    if (
                      e.target.value &&
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value) &&
                      formErrors.email
                    ) {
                      const { email, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                />
                {formErrors.email && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  City
                </label>
                <input
                  type="text"
                  placeholder="Dhaka"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  State/Province
                </label>
                <input
                  type="text"
                  placeholder="Dhaka Division"
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Address and Location */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="Street address, building, floor"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    Country
                  </label>
                  <input
                    type="text"
                    placeholder="Bangladesh"
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    placeholder="1207"
                    value={formData.postal_code}
                    onChange={e => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Set as Default
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_sales_location}
                  onChange={e => setFormData({ ...formData, is_sales_location: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sales Location
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_purchase_location}
                  onChange={e =>
                    setFormData({ ...formData, is_purchase_location: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Purchase Location
                </span>
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
              >
                <GiSave className="w-4 h-4" />
                {isEditing ? 'Update Warehouse' : 'Save Warehouse'}
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
        searchPlaceholder="Search by warehouse name, code, city..."
      />
    </div>
  );
}
