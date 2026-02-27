'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2, Tag, Plus, X } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import { TenantAttribute } from "@/types";
import { useAuthStore } from '@/stores/auth-store';
import { notify, confirm } from '@/lib/notifications';
import tenantAttributeService from '@/services/tenantAttributeService';
import tenantService from '@/services/tenantService';
import { formatDate } from '@/lib/utils/date';

export default function TenantAttributesPage() {
  const [tenantFilter, setTenantFilter] = useState<string>('');
  const [tenants, setTenants] = useState<any[]>([]);
  const currentUser = useAuthStore((state) => state.user);

  // Check if current user is super admin
  const isSuperAdmin = currentUser?.user_type === 'super_admin';

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAttribute, setCurrentAttribute] = useState<TenantAttribute | null>(null);
  const [formData, setFormData] = useState({
    attribute_id: '',
    name: '',
    type: 'text' as 'text' | 'select' | 'number' | 'date' | 'boolean' | 'color' | 'file',
    data_type: 'string' as 'string' | 'integer' | 'decimal' | 'date' | 'boolean',
    measurement_unit: '',
    is_required: false,
    is_filterable: false,
    is_variation_attribute: false,
    is_visible: true,
    sort_order: undefined as number | undefined,
    validation_rules: undefined as any,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddAttribute = () => {
    setIsEditing(false);
    setCurrentAttribute(null);
    setFormData({
      attribute_id: '',
      name: '',
      type: 'text',
      data_type: 'string',
      measurement_unit: '',
      is_required: false,
      is_filterable: false,
      is_variation_attribute: false,
      is_visible: true,
      sort_order: undefined,
      validation_rules: undefined,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEditAttribute = (attribute: TenantAttribute) => {
    setIsEditing(true);
    setCurrentAttribute(attribute);

    // For superadmin, set the tenantFilter to the attribute's tenant_id
    if (isSuperAdmin && attribute.tenant_id) {
      setTenantFilter(attribute.tenant_id);
    }

    setFormData({
      attribute_id: attribute.attribute_id || '',
      name: attribute.name,
      type: attribute.type,
      data_type: attribute.data_type || 'string',
      measurement_unit: attribute.measurement_unit || '',
      is_required: attribute.is_required,
      is_filterable: attribute.is_filterable,
      is_variation_attribute: attribute.is_variation_attribute,
      is_visible: attribute.is_visible,
      sort_order: attribute.sort_order || undefined,
      validation_rules: attribute.validation_rules,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      errors.name = 'Attribute name is required';
    }
    if (!formData.type) {
      errors.type = 'Attribute type is required';
    }
    if (!formData.data_type) {
      errors.data_type = 'Data type is required';
    }
    if (isSuperAdmin && !tenantFilter) {
      errors.tenant = 'Please select a tenant';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Set tenant_id: from tenantFilter for superadmin, otherwise from currentUser
    const tenantId = isSuperAdmin ? tenantFilter : (currentUser?.tenant_id || '');

    // For superadmin, validate tenant selection
    if (isSuperAdmin && !tenantId) {
      notify.error('Please select a tenant');
      return;
    }

    setFormErrors({}); // Clear previous errors before validation/submission
    if (!validateForm()) {
      return;
    }

    try {
      await tenantAttributeService.storeTenantAttribute({
        id: isEditing && currentAttribute?.id ? currentAttribute.id : undefined,
        attribute_id: formData.attribute_id || undefined,
        name: formData.name,
        type: formData.type,
        data_type: formData.data_type || undefined,
        measurement_unit: formData.measurement_unit || undefined,
        is_required: formData.is_required,
        is_filterable: formData.is_filterable,
        is_variation_attribute: formData.is_variation_attribute,
        is_visible: formData.is_visible,
        sort_order: formData.sort_order || undefined,
        validation_rules: formData.validation_rules,
        tenant_id: isSuperAdmin ? tenantId : undefined,
      });

      notify.success(isEditing ? 'Tenant attribute updated successfully' : 'Tenant attribute added successfully');
      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const errorData = error?.response?.data;
      if (errorData?.errors) {
        setFormErrors(errorData.errors);
      } else {
        const errorMessage = errorData?.message || error?.message || 'Failed to save tenant attribute';
        notify.error(errorMessage);
      }
    }
  };

  const handleDeleteAttribute = async (attribute: TenantAttribute) => {
    const result = await confirm({
      title: 'Delete Tenant Attribute',
      html: `Are you sure you want to delete <strong>${attribute.name}</strong>?<br><br>
            <div style="color: #6b7280; font-size: 13px; line-height: 1.5;">
              <strong>Type:</strong> ${attribute.type}<br>
              <strong>Data Type:</strong> ${attribute.data_type}<br>
              <strong>Required:</strong> ${attribute.is_required ? 'Yes' : 'No'}<br>
              <strong>Filterable:</strong> ${attribute.is_filterable ? 'Yes' : 'No'}
            </div><br>
            <em style="color: #dc2626; font-size: 12px;">This action cannot be undone and will permanently delete the tenant attribute.</em>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });

    if (!result.isConfirmed) return;

    try {
      await tenantAttributeService.deleteTenantAttribute(attribute.id);
      notify.success('Tenant attribute deleted successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to delete tenant attribute';
      notify.error(errorMessage);
    }
  };

  const typeOptions = [
    { value: 'text', label: 'Text' },
    { value: 'select', label: 'Select' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'color', label: 'Color' },
    { value: 'file', label: 'File' },
  ];

  const dataTypeOptions = [
    { value: 'string', label: 'String' },
    { value: 'integer', label: 'Integer' },
    { value: 'decimal', label: 'Decimal' },
    { value: 'date', label: 'Date' },
    { value: 'boolean', label: 'Boolean' },
  ];

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

  const getRequiredBadge = (isRequired: boolean) => {
    return isRequired ? (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        Required
      </span>
    ) : (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
        Optional
      </span>
    );
  };

  const getFilterableBadge = (isFilterable: boolean) => {
    return isFilterable ? (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
        Filterable
      </span>
    ) : (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
        Not Filterable
      </span>
    );
  };

  const getVariationBadge = (isVariation: boolean) => {
    return isVariation ? (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
        Variation
      </span>
    ) : (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
        Standard
      </span>
    );
  };

  const getVisibleBadge = (isVisible: boolean) => {
    return isVisible ? (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        Visible
      </span>
    ) : (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
        Hidden
      </span>
    );
  };

  const columns: ColumnDef<TenantAttribute>[] = [
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
      header: 'Attribute Name',
      meta: { width: '25%' },
      cell: ({ row }) => {
        const name = row.original.name;
        const maxLength = 20;
        const truncatedName = name.length > maxLength ? name.substring(0, maxLength) + '...' : name;

        return (
          <div className="flex items-center gap-2">
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
      accessorKey: 'is_required',
      header: 'Required',
      meta: { width: '10%' },
      cell: ({ row }) => getRequiredBadge(row.original.is_required),
    },
    {
      accessorKey: 'is_filterable',
      header: 'Filterable',
      meta: { width: '12%' },
      cell: ({ row }) => getFilterableBadge(row.original.is_filterable),
    },
    {
      accessorKey: 'is_variation_attribute',
      header: 'Variation',
      meta: { width: '10%' },
      cell: ({ row }) => getVariationBadge(row.original.is_variation_attribute),
    },
    {
      accessorKey: 'is_visible',
      header: 'Visible',
      meta: { width: '8%' },
      cell: ({ row }) => getVisibleBadge(row.original.is_visible),
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      meta: { width: '12%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.created_at ? formatDate(row.original.created_at) : 'N/A'}
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
            onClick={() => handleEditAttribute(row.original)}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
            title="Delete"
            onClick={() => handleDeleteAttribute(row.original)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Build API endpoint with filters
  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    if (isSuperAdmin && tenantFilter) {
      params.append('tenant_id', tenantFilter);
    }
    const queryString = params.toString();
    return `/api/v1/tenant-attribute${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Tenant Attribute List
          </h1>
        </div>
        <button
          onClick={handleAddAttribute}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Attribute
        </button>
      </div>

      {/* Tenant Filter - Only for Super Admin */}
      {isSuperAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
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

      {/* Add/Edit Attribute Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Attribute' : 'Add Attribute'}
          </h2>
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Name</label>
                <input
                  type="text"
                  placeholder="Enter attribute name"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                >
                  {typeOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {formErrors.type && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.type}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Data Type</label>
                <select
                  value={formData.data_type}
                  onChange={e => setFormData({ ...formData, data_type: e.target.value as any })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                >
                  {dataTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {formErrors.data_type && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.data_type}</p>
                )}
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Measurement Unit</label>
                <input
                  type="text"
                  placeholder="e.g., kg, cm, %"
                  value={formData.measurement_unit}
                  onChange={e => setFormData({ ...formData, measurement_unit: e.target.value })}
                  className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.measurement_unit ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                />
                {formErrors.measurement_unit && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.measurement_unit}</p>
                )}
              </div>

              <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-5">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_required}
                    onChange={e => setFormData({ ...formData, is_required: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Required</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_filterable}
                    onChange={e => setFormData({ ...formData, is_filterable: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filterable</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_variation_attribute}
                    onChange={e => setFormData({ ...formData, is_variation_attribute: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Variation</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_visible}
                    onChange={e => setFormData({ ...formData, is_visible: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Visible</span>
                </label>
              </div>

              {isEditing && (
                <div className="md:col-span-4 mt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Sort Order</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.sort_order}
                    onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.sort_order ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    min="0"
                  />
                  {formErrors.sort_order && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.sort_order}</p>
                  )}
                </div>
              )}

            </div>

            <div className="flex gap-2 md:col-span-2 mt-1.5">
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Edit className="w-4 h-4" />
                {isEditing ? 'Update Attribute' : 'Save Attribute'}
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
          </form >
        </div >
      )
      }

      {/* DataTable */}
      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        searchable={true}
        searchPlaceholder="Search by attribute name, type..."
      />
    </div >
  );
}