'use client';

import { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, Plus, Key, ListChecks, X } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import { Permission, Module } from '@/types/permission.types';
import { confirm, notify } from '@/lib/notifications';
import permissionService from '@/services/permissionService';

export default function PermissionsPage() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);

  // Load modules on component mount
  useEffect(() => {
    const loadModules = async () => {
      try {
        const modulesData = await permissionService.getModules();
        setModules(modulesData);
      } catch (error) {
        notify.error('Failed to load modules');
      } finally {
        setLoadingModules(false);
      }
    };
    loadModules();
  }, []);

  // Form handling functions
  const handleAddPermission = () => {
    setIsEditing(false);
    setCurrentPermission(null);
    setFormData({
      name: '',
      module_id: '',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEditPermission = (permission: Permission) => {
    setIsEditing(true);
    setCurrentPermission(permission);
    setFormData({
      name: permission.name,
      module_id: permission.module_id || '',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      errors.name = 'Permission name is required';
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
      if (isEditing && currentPermission) {
        await permissionService.updatePermission(currentPermission.id, formData);
        notify.success('Permission updated successfully');
      } else {
        await permissionService.storePermission(formData);
        notify.success('Permission created successfully');
      }
      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const errorData = (
        error as { response?: { data?: { errors?: Record<string, string>; message?: string } } }
      )?.response?.data;
      if (errorData?.errors) {
        setFormErrors(errorData.errors);
      } else {
        const errorMessage =
          errorData?.message || (error as Error)?.message || 'Failed to save permission';
        notify.error(errorMessage);
      }
    }
  };

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPermission, setCurrentPermission] = useState<Permission | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    module_id: '',
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: ColumnDef<Permission>[] = [
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
      header: 'Permission Name',
      meta: { width: '20%' },
      cell: ({ row }) => (
        <div className="flex items-center">
          <Key className="w-4 h-4 mr-2 text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {row.original.name}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'module',
      header: 'Module',
      meta: { width: '15%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.module?.name || 'General'}
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
            onClick={() => handleEditPermission(row.original)}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
            title="Delete"
            onClick={async () => {
              const result = await confirm({
                title: 'Delete Permission',
                html: `Are you sure you want to delete the permission <strong>${row.original.name}</strong>?<br><br>This action cannot be undone.`,
                confirmButtonText: 'Delete',
                cancelButtonText: 'Cancel',
              });

              if (result.isConfirmed) {
                try {
                  await permissionService.deletePermission(row.original.id);
                  notify.success('Permission deleted successfully');
                  setRefreshKey(prev => prev + 1);
                } catch (error) {
                  notify.error('Failed to delete permission');
                }
              }
            }}
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
    if (searchQuery) params.append('search', searchQuery);
    const queryString = params.toString();
    return `permissions${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Permission List
          </h1>
        </div>
        <button
          onClick={handleAddPermission}
          className="cursor-pointer inline-flex items-center px-4 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Permission
        </button>
      </div>
      {/* Add/Edit Permission Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Permission' : 'New Permission'}
          </h2>
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Permission Name *
              </label>
              <input
                type="text"
                placeholder="e.g., create-users, view-reports"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                  formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                required
              />
              {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Module
              </label>
              <select
                value={formData.module_id}
                onChange={e => setFormData({ ...formData, module_id: e.target.value })}
                className={`w-full px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                  formErrors.module_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={loadingModules}
              >
                <option value="">Select Module (Optional)</option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>
                    {module.name}
                  </option>
                ))}
              </select>
              {formErrors.module_id && (
                <p className="text-red-600 text-xs mt-1">{formErrors.module_id}</p>
              )}
            </div>

            <div className="flex gap-2 md:col-span-2">
              <button
                type="submit"
                className="mt-5.5 px-3 py-1 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors flex items-center gap-2 h-8"
              >
                <Edit className="w-4 h-4" />
                {isEditing ? 'Update Permission' : 'Create Permission'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="mt-5.5 px-3 py-1 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors flex items-center gap-2 h-8"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        enableSearch={false} // We handle search via filters
      />
    </div>
  );
}
