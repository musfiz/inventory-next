'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, MapPin, Package, AlertTriangle, Archive } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import { binService, commonService } from '@/services';
import type { Bin } from '@/services/binService';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';

export default function BinPage() {
  const { isSuperAdmin, hasPermission, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!hasPermission('view-bin')) router.replace('/dashboard');
  }, [isHydrated, hasPermission, router]);

  const authUser = useAuthStore(s => s.user);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBin, setCurrentBin] = useState<Bin | null>(null);
  const [formData, setFormData] = useState({
    tenant_id: '' as string | undefined,
    warehouse_id: '',
    name: '',
    aisle: '',
    rack: '',
    shelf: '',
    bin_type: 'storage' as string,
    capacity: '',
    current_occupancy: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const [defaultTenantOptions, setDefaultTenantOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [defaultWarehouseOptions, setDefaultWarehouseOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);

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

  // Load warehouse options
  const loadWarehouseOptions = async (
    inputValue: string,
    tenantId?: string
  ): Promise<{ value: string; label: string }[]> => {
    try {
      // Use provided tenantId or fall back to formData.tenant_id or authUser.tenant_id
      const effectiveTenantId = tenantId !== undefined ? tenantId : (isSuperAdmin ? formData.tenant_id : authUser?.tenant_id);

      // tenant_id is required for the endpoint
      if (!effectiveTenantId) {
        return [];
      }

      // Use the new warehouse-by-tenant endpoint for better filtering
      const warehouses = await commonService.getWarehousesByTenant({
        search: inputValue,
        tenant_id: effectiveTenantId,
      });
      const options = warehouses.map(warehouse => ({
        value: warehouse.id,
        label: `${warehouse.code} - ${warehouse.name}`,
      }));

      // Store default options for initial load
      if (!inputValue && defaultWarehouseOptions.length === 0) {
        setDefaultWarehouseOptions(options);
      }

      return options;
    } catch (error) {
      console.error('Failed to load warehouses:', error);
      return [];
    }
  };

  // Prefetch warehouse options on mount for tenant users
  useEffect(() => {
    const prefetch = async () => {
      if (!isSuperAdmin && authUser?.tenant_id) {
        const warehouses = await commonService.getWarehousesByTenant({
          tenant_id: authUser.tenant_id,
          per_page: 50,
        }).catch(() => []);
        setDefaultWarehouseOptions(
          (warehouses || []).map((w: any) => ({
            value: w.id,
            label: `${w.code} - ${w.name}`,
          }))
        );
      }
    };
    prefetch();
  }, [isSuperAdmin, authUser?.tenant_id]);

  // When superadmin selects a tenant, refresh warehouse options
  useEffect(() => {
    const refreshWarehouses = async () => {
      if (isSuperAdmin && selectedTenant?.value) {
        const warehouses = await commonService.getWarehousesByTenant({
          tenant_id: selectedTenant.value,
          per_page: 50,
        }).catch(() => []);
        setDefaultWarehouseOptions(
          (warehouses || []).map((w: any) => ({
            value: w.id,
            label: `${w.code} - ${w.name}`,
          }))
        );
      } else if (isSuperAdmin && !selectedTenant) {
        setDefaultWarehouseOptions([]);
      }
    };
    refreshWarehouses();
  }, [isSuperAdmin, selectedTenant]);

  const handleAddBin = () => {
    setIsEditing(false);
    setCurrentBin(null);
    setFormData({
      tenant_id: undefined,
      warehouse_id: '',
      name: '',
      aisle: '',
      rack: '',
      shelf: '',
      bin_type: 'storage',
      capacity: '',
      current_occupancy: '',
      is_active: true,
    });
    setFormErrors({});
    setSelectedTenant(null);
    setSelectedWarehouse(null);
    setDefaultWarehouseOptions([]);
    // Load default options for super admin only
    if (isSuperAdmin) {
      loadTenantOptions('');
    } else {
      // For non-super admin, load warehouses immediately
      loadWarehouseOptions('');
    }
    setShowForm(true);
  };

  const handleEditBin = (bin: Bin) => {
    setIsEditing(true);
    setCurrentBin(bin);
    setFormData({
      tenant_id: isSuperAdmin ? bin.tenant_id : undefined,
      warehouse_id: bin.warehouse_id,
      name: bin.name,
      aisle: bin.aisle || '',
      rack: bin.rack || '',
      shelf: bin.shelf || '',
      bin_type: bin.bin_type || 'storage',
      capacity: bin.capacity?.toString() || '',
      current_occupancy: bin.current_occupancy?.toString() || '',
      is_active: bin.is_active,
    });
    setFormErrors({});
    // Set selected tenant only for super admin
    if (isSuperAdmin && bin.tenant) {
      setSelectedTenant({ value: bin.tenant.id, label: bin.tenant.business_name });
      // Load default tenant options
      loadTenantOptions('');
    } else {
      setSelectedTenant(null);
    }
    // Set selected warehouse
    if (bin.warehouse) {
      setSelectedWarehouse({
        value: bin.warehouse.id,
        label: `${bin.warehouse.code} - ${bin.warehouse.name}`,
      });
    }
    // Load warehouse options
    loadWarehouseOptions('');
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    // Only validate tenant for super admin (frontend validation)
    // All other validations will be handl ed by backend
    if (isSuperAdmin && !formData.tenant_id) {
      errors.tenant_id = 'Tenant selection is required';
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
        warehouse_id: formData.warehouse_id,
        name: formData.name,
        aisle: formData.aisle || undefined,
        rack: formData.rack || undefined,
        shelf: formData.shelf || undefined,
        bin_type: formData.bin_type || 'storage',
        capacity: formData.capacity ? parseFloat(formData.capacity) : undefined,
        current_occupancy: formData.current_occupancy
          ? parseFloat(formData.current_occupancy)
          : undefined,
        is_active: formData.is_active,
      };

      // Only include tenant_id if super admin
      if (isSuperAdmin && formData.tenant_id) {
        submitData.tenant_id = formData.tenant_id;
      }

      // Add id for editing
      if (isEditing && currentBin) {
        submitData.id = currentBin.id;
      }

      console.log('Submitting bin data:', submitData);

      await binService.storeBin(submitData);
      notify.success(isEditing ? 'Bin updated successfully' : 'Bin created successfully');
      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      console.error('Bin save error:', error);
      const axiosError = error as {
        response?: { data?: { errors?: Record<string, string[] | string>; message?: string } };
      };

      if (axiosError.response?.data?.errors) {
        const transformedErrors: { [key: string]: string } = {};
        Object.entries(axiosError.response.data.errors).forEach(([key, messages]) => {
          if (Array.isArray(messages)) {
            transformedErrors[key] = messages.join(', ');
          } else if (typeof messages === 'string') {
            transformedErrors[key] = messages;
          } else {
            transformedErrors[key] = String(messages);
          }
        });
        setFormErrors(transformedErrors);
        // Scroll to top to show errors
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (axiosError.response?.data?.message) {
        notify.error(axiosError.response.data.message);
      } else {
        notify.error('Failed to save bin. Please try again.');
      }
    }
  };

  const handleDelete = async (bin: Bin) => {
    const result = await confirm({
      title: 'Delete Bin',
      html: `Are you sure you want to delete bin <strong>${bin.name}</strong>?<br><br>
            <div style="color: #6b7280; font-size: 13px; line-height: 1.5;">
              <strong>Warehouse:</strong> ${bin.warehouse?.name || 'N/A'}<br>
              <strong>Location:</strong> ${bin.aisle ? `Aisle ${bin.aisle}` : 'N/A'}${bin.rack ? `, Rack ${bin.rack}` : ''}${bin.shelf ? `, Shelf ${bin.shelf}` : ''}<br>
              <strong>Type:</strong> ${bin.bin_type || 'storage'}<br>
              <strong>Status:</strong> ${bin.is_active ? 'Active' : 'Inactive'}
            </div><br>
            <em style="color: #dc2626; font-size: 12px;">This action cannot be undone. Bin must not have any stock records.</em>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });

    if (!result.isConfirmed) return;

    try {
      await binService.deleteBin(bin.id);
      notify.success('Bin deleted successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      notify.error(axiosError.response?.data?.message || 'Failed to delete bin');
    }
  };

  const columns: ColumnDef<Bin>[] = [
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
      accessorKey: 'name',
      header: 'Bin Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-500" />
          <span className="font-medium">{row.original.name}</span>
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
      id: 'warehouse',
      header: 'Warehouse',
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {row.original.warehouse?.name}
          </div>
          <div className="text-gray-500 dark:text-gray-400">{row.original.warehouse?.code}</div>
        </div>
      ),
    },
    {
      id: 'location',
      header: 'Location',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="w-3 h-3" />
          <span>
            {row.original.aisle && `Aisle ${row.original.aisle}`}
            {row.original.rack && `, Rack ${row.original.rack}`}
            {row.original.shelf && `, Shelf ${row.original.shelf}`}
            {!row.original.aisle && !row.original.rack && !row.original.shelf && 'Not specified'}
          </span>
        </div>
      ),
    },
    {
      id: 'bin_type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
          {row.original.bin_type || 'storage'}
        </span>
      ),
    },
    {
      id: 'capacity',
      header: 'Capacity',
      cell: ({ row }) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {row.original.capacity ? `${row.original.capacity}` : '-'}
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
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditBin(row.original)}
            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 cursor-pointer"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original)}
            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Build API endpoint with filters
  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    const queryString = params.toString();
    return `bins${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            {/* <BinIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" /> */}
            Bins
          </h1>
        </div>
        <button
          onClick={handleAddBin}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Bin
        </button>
      </div>

      {/* Add/Edit Bin Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Bin' : 'Add Bin'}
          </h2>
          <form onSubmit={handleFormSubmit} className="space-y-3">
            {/* Tenant Selection - Only for Super Admin */}
            {isSuperAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    Tenant <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    value={selectedTenant}
                    onChange={option => {
                      const newTenantId = option?.value || undefined;
                      setFormData({
                        ...formData,
                        tenant_id: newTenantId,
                        warehouse_id: '', // Clear warehouse when tenant changes
                      });
                      setSelectedTenant(option);
                      setSelectedWarehouse(null); // Clear warehouse selection
                      setDefaultWarehouseOptions([]); // Clear warehouse options

                      // Clear tenant error when selection is made
                      if (option?.value && formErrors.tenant_id) {
                        const { tenant_id, ...rest } = formErrors;
                        setFormErrors(rest);
                      }

                      // Load warehouse options for the new tenant
                      // Pass the new tenant ID directly to avoid state timing issues
                      if (newTenantId) {
                        loadWarehouseOptions('', newTenantId);
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
                  Warehouse <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={selectedWarehouse}
                  onChange={option => {
                    setFormData({ ...formData, warehouse_id: option?.value || '' });
                    setSelectedWarehouse(option);
                  }}
                  loadOptions={loadWarehouseOptions}
                  defaultOptions={defaultWarehouseOptions}
                  placeholder={
                    isSuperAdmin && !formData.tenant_id ? 'Select tenant first' : 'Select warehouse'
                  }
                  isDisabled={isSuperAdmin && !formData.tenant_id}
                  className="text-sm"
                  isInvalid={!!formErrors.warehouse_id}
                />
                {formErrors.warehouse_id && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.warehouse_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Bin Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Main Storage Bin 01"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                />
                {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Bin Type
                </label>
                <select
                  value={formData.bin_type}
                  onChange={e => setFormData({ ...formData, bin_type: e.target.value })}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.bin_type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                >
                  <option value="storage">Storage</option>
                  <option value="picking">Picking</option>
                  <option value="receiving">Receiving</option>
                  <option value="shipping">Shipping</option>
                  <option value="quarantine">Quarantine</option>
                </select>
                {formErrors.bin_type && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.bin_type}</p>
                )}
              </div>
            </div>

            {/* Location Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Aisle
                </label>
                <input
                  type="text"
                  placeholder="A"
                  value={formData.aisle}
                  onChange={e => setFormData({ ...formData, aisle: e.target.value })}
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Rack
                </label>
                <input
                  type="text"
                  placeholder="1"
                  value={formData.rack}
                  onChange={e => setFormData({ ...formData, rack: e.target.value })}
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Shelf
                </label>
                <input
                  type="text"
                  placeholder="1"
                  value={formData.shelf}
                  onChange={e => setFormData({ ...formData, shelf: e.target.value })}
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Capacity Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Capacity
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="500.00"
                  value={formData.capacity}
                  onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.capacity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                />
                {formErrors.capacity && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.capacity}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Current Occupancy
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.current_occupancy}
                  onChange={e => setFormData({ ...formData, current_occupancy: e.target.value })}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.current_occupancy
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                    }`}
                />
                {formErrors.current_occupancy && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.current_occupancy}</p>
                )}
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
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
              >
                <GiSave className="w-4 h-4" />
                {isEditing ? 'Update Bin' : 'Save Bin'}
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
        searchPlaceholder="Search by bin name, warehouse..."
      />
    </div>
  );
}
