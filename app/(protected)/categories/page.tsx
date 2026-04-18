'use client';

import { useState } from 'react';
import { FolderOpen, Plus, Edit, Trash2, Eye, X } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { notify } from '@/lib/notifications';
import { categoryService } from '@/services';
import commonService from '@/services/commonService';
import { Category } from '@/types/api.types';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import { BUSINESS_TYPES } from '@/lib/constants';

export default function CategoriesPage() {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    business_type: 'other' as
      | 'pharmacy'
      | 'electric'
      | 'electronics'
      | 'fashion'
      | 'furniture'
      | 'bookshop'
      | 'departmental'
      | 'computer'
      | 'clothing'
      | 'footwear'
      | 'cosmetics'
      | 'stationery'
      | 'grocery'
      | 'hardware'
      | 'restaurant'
      | 'cafe'
      | 'supermarket'
      | 'other',
    is_active: true,
    parent_id: undefined as string | undefined,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const [defaultParentOptions, setDefaultParentOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const loadParentCategoryOptions = async (
    inputValue: string
  ): Promise<{ value: string; label: string }[]> => {
    try {
      const params: { search?: string; only_parent?: boolean } = {};
      params.only_parent = true;
      if (inputValue && inputValue.trim()) {
        params.search = inputValue.trim();
      }

      const categories = await commonService.getCategoriesForDropdown(params);

      // Filter out current category when editing
      const filteredCategories = categories.filter(
        cat => !isEditing || cat.id !== currentCategory?.id
      );

      const options = filteredCategories.map(cat => ({
        value: cat.id,
        label: cat.name,
      }));

      // Update parent categories state
      setParentCategories(filteredCategories);

      // Store default options for initial load
      if (!inputValue && defaultParentOptions.length === 0) {
        setDefaultParentOptions(options);
      }

      return options;
    } catch (error) {
      console.error('Failed to load parent categories:', error);
      return [];
    }
  };

  const handleAddCategory = () => {
    setIsEditing(false);
    setCurrentCategory(null);
    setFormData({
      name: '',
      description: '',
      business_type: 'other',
      is_active: true,
      parent_id: undefined,
    });
    setFormErrors({});
    // Load default parent category options
    loadParentCategoryOptions('');
    setShowForm(true);
  };

  const handleEditCategory = (category: Category) => {
    setIsEditing(true);
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      business_type: category.business_type || 'other',
      is_active: category.is_active,
      parent_id: category.parent_id || undefined,
    });
    setFormErrors({});
    // Load default parent category options
    loadParentCategoryOptions('');
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const submitData = {
        ...formData,
        ...(isEditing && currentCategory && { id: currentCategory.id }),
      };

      await categoryService.storeCategory(submitData);
      notify.success(isEditing ? 'Category updated successfully' : 'Category created successfully');
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
        notify.error(axiosError.response?.data?.message || 'Failed to save category');
      }
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      await categoryService.deleteCategory(category.id);
      notify.success('Category deleted successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      notify.error(axiosError.response?.data?.message || 'Failed to delete category');
    }
  };

  const columns: ColumnDef<Category>[] = [
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
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-blue-500" />
          <span className="font-medium">{row.original.name}</span>
          {row.original.parent && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded dark:bg-gray-700 dark:text-gray-400">
              Subcategory
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'parent_category',
      header: 'Parent Category',
      cell: ({ row }) => (
        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-teal-900/30 dark:text-purple-400">
          {row.original.parent?.name || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'business_type',
      header: 'Business Type',
      cell: ({ row }) => (
        <span className="text-gray-600 dark:text-gray-400 capitalize">
          {row.original.business_type || 'Other'}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-gray-600 dark:text-gray-400">{row.original.description || '-'}</span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            row.original.is_active
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
            onClick={() => handleEditCategory(row.original)}
            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original)}
            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
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
    return `categories${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Product Categories
          </h1>
        </div>
        <button
          onClick={handleAddCategory}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Add/Edit Category Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Category' : 'Add Category'}
          </h2>
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter category name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                />
                {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Business Type
                </label>
                <CustomSelect
                  value={BUSINESS_TYPES.find(type => type.value === formData.business_type) || null}
                  onChange={option =>
                    setFormData({
                      ...formData,
                      business_type: (option?.value as typeof formData.business_type) || 'other',
                    })
                  }
                  options={[...BUSINESS_TYPES]}
                  placeholder="Select business type"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Parent Category
                </label>
                <CustomSelect
                  value={
                    formData.parent_id
                      ? {
                          value: formData.parent_id,
                          label:
                            parentCategories.find(cat => cat.id === formData.parent_id)?.name || '',
                        }
                      : null
                  }
                  onChange={option =>
                    setFormData({ ...formData, parent_id: option?.value || undefined })
                  }
                  loadOptions={loadParentCategoryOptions}
                  defaultOptions={defaultParentOptions}
                  placeholder="Select parent (optional)"
                  className="text-sm"
                />
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
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Description
                </label>
                <textarea
                  placeholder="Describe the category"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 h-9 resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-2 md:col-span-2 mt-1.5">
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Edit className="w-4 h-4" />
                {isEditing ? 'Update Category' : 'Save Category'}
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
