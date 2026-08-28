'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2, Tag, Plus, X } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import CustomSelect, { SelectOption } from '@/components/ui/custom-select';
import { AttributeValue, Attribute } from '@/types';
import { notify, confirm } from '@/lib/notifications';
import attributeValueService from '@/services/attributeValueService';
import attributeService from '@/services/attributeService';
import { formatDate } from '@/lib/utils/date';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';

export default function AttributeValuesPage() {
  const { isSuperAdmin, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!isSuperAdmin) router.replace('/dashboard');
  }, [isHydrated, isSuperAdmin, router]);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAttributeValue, setCurrentAttributeValue] = useState<AttributeValue | null>(null);
  const [formData, setFormData] = useState({
    attribute_id: '',
    value: '',
    display_value: '',
    hex_code: '',
    sort_order: undefined as number | undefined,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);

  useEffect(() => {
    loadDefaultAttributes();
  }, []);

  const loadDefaultAttributes = async () => {
    setLoadingAttributes(true);
    try {
      const attrs = await attributeService.searchAttributes('', 5);
      setAttributes(attrs);
    } catch (error: any) {
      notify.error('Failed to load attributes');
    } finally {
      setLoadingAttributes(false);
    }
  };

  const loadAttributeOptions = async (inputValue: string): Promise<SelectOption[]> => {
    try {
      const attrs = await attributeService.searchAttributes(inputValue, 20); // Load more for search
      const options = attrs.map(attr => ({
        value: attr.id,
        label: attr.name,
      }));
      return options;
    } catch (error) {
      return [];
    }
  };

  const handleAddAttributeValue = () => {
    setIsEditing(false);
    setCurrentAttributeValue(null);
    setFormData({
      attribute_id: '',
      value: '',
      display_value: '',
      hex_code: '',
      sort_order: undefined,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEditAttributeValue = (attributeValue: AttributeValue) => {
    setIsEditing(true);
    setCurrentAttributeValue(attributeValue);

    setFormData({
      attribute_id: attributeValue.attribute_id,
      value: attributeValue.value,
      display_value: attributeValue.display_value || '',
      hex_code: attributeValue.hex_code || '',
      sort_order: attributeValue.sort_order || 0,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.attribute_id) {
      errors.attribute_id = 'Attribute is required';
    }
    if (!formData.value.trim()) {
      errors.value = 'Value is required';
    }
    if (formData.hex_code && !/^#[a-fA-F0-9]{6}$/.test(formData.hex_code)) {
      errors.hex_code = 'Hex code must be in format #RRGGBB';
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
      await attributeValueService.storeAttributeValue({
        id: isEditing && currentAttributeValue?.id ? currentAttributeValue.id : undefined,
        attribute_id: formData.attribute_id,
        value: formData.value,
        display_value: formData.display_value || undefined,
        hex_code: formData.hex_code || undefined,
        sort_order: formData.sort_order || undefined,
      });

      notify.success(
        isEditing ? 'Attribute value updated successfully' : 'Attribute value added successfully'
      );
      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const errorData = error?.response?.data;
      if (errorData?.errors) {
        setFormErrors(errorData.errors);
      } else {
        const errorMessage =
          errorData?.message || error?.message || 'Failed to save attribute value';
        notify.error(errorMessage);
      }
    }
  };

  const handleDeleteAttributeValue = async (attributeValue: AttributeValue) => {
    const result = await confirm({
      title: 'Delete Attribute Value',
      html: `Are you sure you want to delete <strong>${attributeValue.value}</strong>?<br><br>
            <div style="color: #6b7280; font-size: 13px; line-height: 1.5;">
              <strong>Attribute:</strong> ${attributeValue.attribute?.name || 'N/A'}<br>
              <strong>Display Value:</strong> ${attributeValue.display_value || 'N/A'}<br>
              <strong>Hex Code:</strong> ${attributeValue.hex_code || 'N/A'}
            </div><br>
            <em style="color: #dc2626; font-size: 12px;">This action cannot be undone and will permanently delete the attribute value.</em>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });

    if (!result.isConfirmed) return;

    try {
      await attributeValueService.deleteAttributeValue(attributeValue.id);
      notify.success('Attribute value deleted successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to delete attribute value';
      notify.error(errorMessage);
    }
  };

  const columns: ColumnDef<AttributeValue>[] = [
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
      accessorKey: 'attribute.name',
      header: 'Attribute Name',
      meta: { width: '20%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.attribute?.name || 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'value',
      header: 'Value',
      meta: { width: '20%' },
      cell: ({ row }) => {
        const value = row.original.value;
        const maxLength = 25;
        const truncatedValue =
          value.length > maxLength ? value.substring(0, maxLength) + '...' : value;

        return (
          <div className="flex items-center gap-2">
            <div
              className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate w-full"
              title={value}
            >
              {truncatedValue}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'display_value',
      header: 'Display Value',
      meta: { width: '20%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.display_value || 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'hex_code',
      header: 'Color',
      meta: { width: '10%' },
      cell: ({ row }) => {
        const hexCode = row.original.hex_code;
        return hexCode ? (
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border border-gray-300"
              style={{ backgroundColor: hexCode }}
              title={hexCode}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">{hexCode}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">N/A</span>
        );
      },
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
      meta: { width: '13%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
            title="Edit"
            onClick={() => handleEditAttributeValue(row.original)}
           aria-label="Edit">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
            title="Delete"
            onClick={() => handleDeleteAttributeValue(row.original)}
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
    const queryString = params.toString();
    return `attribute-value${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Attribute Values
          </h1>
        </div>
        <button
          onClick={handleAddAttributeValue}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Value
        </button>
      </div>

      {/* Add/Edit Attribute Value Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Attribute Value' : 'New Attribute Value'}
          </h2>
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Attribute Name
                </label>
                <CustomSelect
                  value={
                    attributes.find(attr => attr.id === formData.attribute_id)
                      ? {
                          value: attributes.find(attr => attr.id === formData.attribute_id)!.id,
                          label: attributes.find(attr => attr.id === formData.attribute_id)!.name,
                        }
                      : null
                  }
                  onChange={option =>
                    setFormData({ ...formData, attribute_id: option?.value || '' })
                  }
                  loadOptions={loadAttributeOptions}
                  defaultOptions={attributes.map(attr => ({
                    value: attr.id,
                    label: attr.name,
                  }))}
                  placeholder={
                    loadingAttributes ? 'Loading attributes...' : 'Select or search attribute'
                  }
                  isDisabled={loadingAttributes}
                  isLoading={loadingAttributes}
                  isInvalid={!!formErrors.attribute_id}
                />
                {formErrors.attribute_id && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.attribute_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Value
                </label>
                <input
                  type="text"
                  placeholder="Enter value"
                  value={formData.value}
                  onChange={e => setFormData({ ...formData, value: e.target.value })}
                  className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                    formErrors.value ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                />
                {formErrors.value && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.value}</p>
                )}
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Display Value
                </label>
                <input
                  type="text"
                  placeholder="Optional display value"
                  value={formData.display_value}
                  onChange={e => setFormData({ ...formData, display_value: e.target.value })}
                  className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                    formErrors.display_value
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.display_value && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.display_value}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Hex Code
                </label>
                <input
                  type="text"
                  placeholder="#RRGGBB"
                  value={formData.hex_code}
                  onChange={e => setFormData({ ...formData, hex_code: e.target.value })}
                  className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                    formErrors.hex_code ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.hex_code && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.hex_code}</p>
                )}
              </div>

              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.sort_order}
                    onChange={e =>
                      setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                    }
                    className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                      formErrors.sort_order
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
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
                className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
              >
                <GiSave className="w-4 h-4" />
                {isEditing ? 'Update Value' : 'Save Value'}
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
        searchPlaceholder="Search by value, display value..."
      />
    </div>
  );
}
