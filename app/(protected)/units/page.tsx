'use client';

import { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, Package, Plus, X } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import { Unit } from '@/types';
import { notify, confirm } from '@/lib/notifications';
import unitService from '@/services/unitService';
import { formatDate } from '@/lib/utils/date';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';

export default function UnitsPage() {
  const { isSuperAdmin, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!isSuperAdmin) router.replace('/dashboard');
  }, [isHydrated, isSuperAdmin, router]);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUnit, setCurrentUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddUnit = () => {
    setIsEditing(false);
    setCurrentUnit(null);
    setFormData({ name: '', short_name: '', is_active: true });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEditUnit = (unit: Unit) => {
    setIsEditing(true);
    setCurrentUnit(unit);

    setFormData({
      name: unit.name,
      short_name: unit.short_name,
      is_active: unit.is_active,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      errors.name = 'Unit name is required';
    }
    if (!formData.short_name.trim()) {
      errors.short_name = 'Short name is required';
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
      await unitService.storeUnit({
        id: isEditing && currentUnit?.id ? currentUnit.id : undefined,
        name: formData.name,
        short_name: formData.short_name,
        is_active: formData.is_active,
      });

      notify.success(isEditing ? 'Unit updated successfully' : 'Unit added successfully');
      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const errorData = error?.response?.data;
      if (errorData?.errors) {
        setFormErrors(errorData.errors);
      } else {
        const errorMessage = errorData?.message || error?.message || 'Failed to save unit';
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

  const handleDeleteUnit = async (unit: Unit) => {
    const result = await confirm({
      title: 'Delete Unit',
      html: `Are you sure you want to delete <strong>${unit.name}</strong>?<br><br>
            <div style="color: #6b7280; font-size: 13px; line-height: 1.5;">
              <strong>Short Name:</strong> ${unit.short_name}<br>
              <strong>Status:</strong> ${unit.is_active ? 'Active' : 'Inactive'}
            </div><br>
            <em style="color: #dc2626; font-size: 12px;">This action cannot be undone and will permanently delete the unit.</em>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });

    if (!result.isConfirmed) return;

    try {
      await unitService.deleteUnit(unit.id);
      notify.success('Unit deleted successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to delete unit';
      notify.error(errorMessage);
    }
  };

  const columns: ColumnDef<Unit>[] = [
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
      header: 'Unit Name',
      meta: { width: '20%' },
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
      accessorKey: 'short_name',
      header: 'Short Name',
      meta: { width: '15%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">{row.original.short_name}</span>
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
            onClick={() => handleEditUnit(row.original)}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
            title="Delete"
            onClick={() => handleDeleteUnit(row.original)}
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
    const queryString = params.toString();
    return `unit${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Unit List
          </h1>
        </div>
        <button
          onClick={handleAddUnit}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Unit
        </button>
      </div>

      {/* Add/Edit Unit Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Unit' : 'Add New Unit'}
          </h2>
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter unit name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  required
                />
                {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Short Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., kg, pcs, liter"
                  value={formData.short_name}
                  onChange={e => setFormData({ ...formData, short_name: e.target.value })}
                  className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.short_name
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                    }`}
                  required
                />
                {formErrors.short_name && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.short_name}</p>
                )}
              </div>
              <div>
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
            <div className="flex gap-2 md:col-span-2 mt-1.5">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
              >
                <GiSave className="w-4 h-4" />
                {isEditing ? 'Update Unit' : 'Save Unit'}
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
        searchPlaceholder="Search by unit name, short name..."
      />
    </div>
  );
}
