'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { businessTypeService } from '@/services/businessTypeService';
import type { BusinessTypeItem } from '@/services/businessTypeService';
import { notify, confirm } from '@/lib/notifications';
import { formatDate } from '@/lib/utils/date';

export default function BusinessTypesPage() {
  const { isSuperAdmin, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!isSuperAdmin) router.replace('/dashboard');
  }, [isHydrated, isSuperAdmin, router]);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentType, setCurrentType] = useState<BusinessTypeItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddType = () => {
    setIsEditing(false);
    setCurrentType(null);
    setFormData({ name: '', description: '', is_active: true });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEditType = (type: BusinessTypeItem) => {
    setIsEditing(true);
    setCurrentType(type);
    setFormData({
      name: type.name,
      description: type.description || '',
      is_active: type.is_active,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      errors.name = 'Business type name is required';
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

    try {
      if (isEditing && currentType?.id) {
        await businessTypeService.update(currentType.id, {
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active,
        });
        notify.success('Business type updated successfully');
      } else {
        await businessTypeService.create({
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active,
        });
        notify.success('Business type added successfully');
      }
      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const errorData = error?.response?.data;
      if (errorData?.errors) {
        setFormErrors(errorData.errors);
      } else {
        const errorMessage = errorData?.message || error?.message || 'Failed to save business type';
        notify.error(errorMessage);
      }
    }
  };

  const inputCls = (hasError?: boolean) =>
    `w-full px-2.5 py-1 text-xs bg-white dark:bg-gray-700 border ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500`;

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

  const handleDeleteType = async (type: BusinessTypeItem) => {
    const result = await confirm({
      title: 'Delete Business Type',
      html: `Are you sure you want to delete <strong>${type.name}</strong>?<br><br>
            <div style="color: #6b7280; font-size: 13px; line-height: 1.5;">
              <strong>Slug:</strong> ${type.slug}<br>
              <strong>Status:</strong> ${type.is_active ? 'Active' : 'Inactive'}
            </div><br>
            <em style="color: #dc2626; font-size: 12px;">This action cannot be undone and will permanently delete the business type.</em>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });

    if (!result.isConfirmed) return;

    try {
      await businessTypeService.delete(type.id);
      notify.success('Business type deleted successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to delete business type';
      notify.error(errorMessage);
    }
  };

  const columns: ColumnDef<BusinessTypeItem>[] = [
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
      header: 'Business Type',
      meta: { width: '25%' },
      cell: ({ row }) => {
        const name = row.original.name;
        const maxLength = 25;
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
      accessorKey: 'slug',
      header: 'Slug',
      meta: { width: '15%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">{row.original.slug}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      meta: { width: '25%' },
      cell: ({ row }) => {
        const desc = row.original.description || 'N/A';
        const maxLength = 30;
        const truncated = desc.length > maxLength ? desc.substring(0, maxLength) + '...' : desc;
        return (
          <span className="text-xs text-gray-600 dark:text-gray-400" title={desc}>
            {truncated}
          </span>
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
      accessorKey: 'is_active',
      header: 'Status',
      meta: { width: '8%' },
      cell: ({ row }) => getStatusBadge(row.original.is_active),
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '11%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
            title="Edit"
            onClick={() => handleEditType(row.original)}
           aria-label="Edit">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
            title="Delete"
            onClick={() => handleDeleteType(row.original)}
           aria-label="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Build API endpoint
  const buildApiEndpoint = () => {
    return 'business-types';
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Business Types
          </h1>
        </div>
        <button
          onClick={handleAddType}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Business Type
        </button>
      </div>

      {/* Add/Edit Business Type Form — styled like product add page */}
      {showForm && (
        <form onSubmit={handleFormSubmit} className="space-y-3" autoComplete="off">
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {isEditing ? 'Edit Business Type' : 'Basic Information'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
              <FormRow label="Name" required error={formErrors.name} labelWidth="w-32">
                <input
                  type="text"
                  placeholder="Enter business type name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={inputCls(!!formErrors.name)}
                  required
                />
              </FormRow>
              <FormRow label="Status" labelWidth="w-32" error={formErrors.is_active}>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={e =>
                    setFormData({ ...formData, is_active: e.target.value === 'active' })
                  }
                  className={inputCls(!!formErrors.is_active)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormRow>
              <FormRow label="Description" labelWidth="w-32" className="md:col-span-2" error={formErrors.description}>
                <textarea
                  placeholder="Enter description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className={inputCls(!!formErrors.description)}
                />
              </FormRow>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded"
            >
              <GiSave className="w-3.5 h-3.5" />
              {isEditing ? 'Update Business Type' : 'Create Business Type'}
            </button>
          </div>
        </form>
      )}

      {/* DataTable */}
      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by name, slug, or description..."
      />
    </div>
  );
}

function FormRow({ label, required, error, children, labelWidth = 'w-32', className = '' }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode; labelWidth?: string; className?: string }) {
  const errorMl = 'ml-[8.5rem]';
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <label className={`${labelWidth} shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-right`}>
          {label}{required && <span className="text-red-500">*</span>}:
        </label>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      {error && <p className={`text-[10px] text-red-500 mt-0.5 ${errorMl}`}>{error}</p>}
    </div>
  );
}