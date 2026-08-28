'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2, Layers3, Plus, X } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import { Module } from '@/types';
import { notify, confirm } from '@/lib/notifications';
import moduleService from '@/services/moduleService';
import { formatDate } from '@/lib/utils/date';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';

export default function ModulesPage() {
  const { isSuperAdmin, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!isSuperAdmin) router.replace('/dashboard');
  }, [isHydrated, isSuperAdmin, router]);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddModule = () => {
    setIsEditing(false);
    setCurrentModule(null);
    setFormData({ name: '' });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEditModule = (module: Module) => {
    setIsEditing(true);
    setCurrentModule(module);

    setFormData({
      name: module.name,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      errors.name = 'Module name is required';
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
      await moduleService.storeModule({
        id: isEditing && currentModule?.id ? currentModule.id : undefined,
        name: formData.name,
      });

      notify.success(isEditing ? 'Module updated successfully' : 'Module added successfully');
      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const errorData = error?.response?.data;
      if (errorData?.errors) {
        setFormErrors(errorData.errors);
      } else {
        const errorMessage = errorData?.message || error?.message || 'Failed to save module';
        notify.error(errorMessage);
      }
    }
  };

  const handleDeleteModule = async (module: Module) => {
    const result = await confirm({
      title: 'Delete Module',
      html: `Are you sure you want to delete <strong>${module.name}</strong>?<br><br>
            <div style="color: #6b7280; font-size: 13px; line-height: 1.5;">
              <strong>Created:</strong> ${module.created_at ? formatDate(module.created_at) : 'N/A'}
            </div><br>
            <em style="color: #dc2626; font-size: 12px;">This action cannot be undone and will permanently delete the module.</em>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });

    if (!result.isConfirmed) return;

    try {
      await moduleService.deleteModule(module.id);
      notify.success('Module deleted successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to delete module';
      notify.error(errorMessage);
    }
  };

  const columns: ColumnDef<Module>[] = [
    {
      id: 'serial',
      header: '#',
      meta: { width: '5%' },
      cell: ({ row, table }) => {
        const page = table.getState().pagination?.pageIndex ?? 0;
        const pageSize = table.getState().pagination?.pageSize ?? 15;
        return <span className="text-xs text-gray-600 dark:text-gray-400">{page * pageSize + row.index + 1}</span>;
      },
    },
    {
      accessorKey: 'name',
      header: 'Module Name',
      meta: { width: '45%' },
      cell: ({ row }) => {
        const name = row.original.name;
        const maxLength = 28;
        const truncatedName = name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;

        return (
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate w-full" title={name}>
              {truncatedName}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      meta: { width: '25%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.created_at ? formatDate(row.original.created_at) : 'N/A'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '15%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
            title="Edit"
            onClick={() => handleEditModule(row.original)}
           aria-label="Edit">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
            title="Delete"
            onClick={() => handleDeleteModule(row.original)}
           aria-label="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const buildApiEndpoint = () => 'module';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Layers3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Module List
          </h1>
        </div>
        <button
          onClick={handleAddModule}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Module
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Module' : 'Add New Module'}
          </h2>
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 gap-1.5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Name
              </label>
              <input
                type="text"
                placeholder="Enter module name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                required
              />
              {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
            </div>

            <div className="flex gap-2 mt-1.5">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
              >
                <GiSave className="w-4 h-4" />
                {isEditing ? 'Update Module' : 'Save Module'}
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

      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by module name..."
      />
    </div>
  );
}