'use client';

import { useState, useCallback, useRef } from 'react';
import { FolderOpen, Plus, Edit, Trash2, X, Download, Store } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ImDownload } from 'react-icons/im';
import { RiFileExcel2Line } from 'react-icons/ri';
import { TiUploadOutline } from 'react-icons/ti';
import { ColumnDef } from '@tanstack/react-table';
import { notify } from '@/lib/notifications';
import { categoryService } from '@/services';
import commonService from '@/services/commonService';
import { Category } from '@/types/api.types';
import DataTable from '@/components/ui/datatable';
import BusinessTypeSelect from '@/components/ui/business-type-select';
import CustomSelect from '@/components/ui/custom-select';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Tenant Category Management
 * Route: /ecommerce/products/categories
 * Visible: tenant_admin / tenant_user with storefront active
 *
 * Uses the shared `categories` table. The tenant's business type is fixed
 * from `tenant.business_type_id` — every create/update sends
 * `business_type_ids: [tenantBusinessTypeId]` so the backend links the
 * row in the `category_business_type` pivot. Listing / parent dropdown
 * are filtered by the same business_type_id.
 */
export default function TenantCategoriesPage() {
  const user = useAuthStore(state => state.user);

  const tenantBusinessTypeId =
    (user as any)?.tenant?.business_type?.id ?? (user as any)?.tenant?.business_type_id ?? null;
  const tenantBusinessTypeName =
    (user as any)?.tenant?.business_type?.name ?? '';

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    parent_id: undefined as string | undefined,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Bulk upload state
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subcategory bulk upload state
  const [showSubBulkUpload, setShowSubBulkUpload] = useState(false);
  const [subUploading, setSubUploading] = useState(false);
  const [subSelectedFile, setSubSelectedFile] = useState<File | null>(null);
  const subFileInputRef = useRef<HTMLInputElement | null>(null);

  const [defaultParentOptions, setDefaultParentOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const handleExportExcel = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const url = tenantBusinessTypeId
        ? `${backendUrl}/api/v1/categories/export?business_type_id=${tenantBusinessTypeId}`
        : `${backendUrl}/api/v1/categories/export`;
      window.open(url, '_blank');
    } catch {
      notify.error('Failed to export categories');
    }
  };

  // Bulk upload handlers
  const handleDownloadSampleExcel = async () => {
    try {
      await categoryService.downloadCategorySampleExcel();
      notify.success('Sample Excel downloaded successfully');
    } catch (err) {
      notify.error('Failed to download sample file');
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedExt = ['.xls', '.xlsx'];
    const fileName = file.name.toLowerCase();
    const isValidExt = allowedExt.some(ext => fileName.endsWith(ext));

    if (!isValidExt) {
      notify.error('Invalid file type. Please upload an Excel file (.xls, .xlsx).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      notify.error('File size exceeds 10MB limit.');
      return;
    }

    setSelectedFile(file);
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      notify.error('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);

      const result = await categoryService.categoryBulkImport(selectedFile);

      if (result.success) {
        notify.success(result.message);
        setShowBulkUpload(false);
        setSelectedFile(null);
        setRefreshKey(prev => prev + 1);
      } else {
        notify.error(result.message);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Bulk upload failed';
      notify.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Subcategory bulk upload handlers
  const handleDownloadSubSampleExcel = async () => {
    try {
      await categoryService.downloadSubCategorySampleExcel();
      notify.success('Subcategory sample Excel downloaded successfully');
    } catch (err) {
      notify.error('Failed to download sample file');
    }
  };

  const handleSubFileSelect = (file: File) => {
    const allowedExt = ['.xls', '.xlsx'];
    const fileName = file.name.toLowerCase();
    const isValidExt = allowedExt.some(ext => fileName.endsWith(ext));

    if (!isValidExt) {
      notify.error('Invalid file type. Please upload an Excel file (.xls, .xlsx).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      notify.error('File size exceeds 10MB limit.');
      return;
    }

    setSubSelectedFile(file);
  };

  const handleSubBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subSelectedFile) {
      notify.error('Please select a file to upload');
      return;
    }

    try {
      setSubUploading(true);

      const result = await categoryService.subCategoryBulkImport(subSelectedFile);

      if (result.success) {
        notify.success(result.message);
        setShowSubBulkUpload(false);
        setSubSelectedFile(null);
        setRefreshKey(prev => prev + 1);
      } else {
        notify.error(result.message);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Subcategory bulk upload failed';
      notify.error(errorMessage);
    } finally {
      setSubUploading(false);
    }
  };

  const clearSubFile = () => {
    setSubSelectedFile(null);
    if (subFileInputRef.current) {
      subFileInputRef.current.value = '';
    }
  };

  const loadParentCategoryOptions = useCallback(
    async (inputValue: string): Promise<{ value: string; label: string }[]> => {
      try {
        const params: { search?: string; only_parent?: boolean; business_type_id?: number } = {
          only_parent: true,
        };
        if (inputValue && inputValue.trim()) {
          params.search = inputValue.trim();
        }
        if (tenantBusinessTypeId) {
          params.business_type_id = tenantBusinessTypeId;
        }

        const categories = await commonService.getCategoriesForDropdown(params);

        const filteredCategories = categories.filter(
          cat => !isEditing || cat.id !== currentCategory?.id
        );

        const options = filteredCategories.map(cat => ({
          value: cat.id,
          label: cat.name,
        }));

        setParentCategories(filteredCategories);

        if (!inputValue && defaultParentOptions.length === 0) {
          setDefaultParentOptions(options);
        }

        return options;
      } catch (error) {
        console.error('Failed to load parent categories:', error);
        return [];
      }
    },
    [tenantBusinessTypeId, isEditing, currentCategory?.id, defaultParentOptions.length]
  );

  const handleAddCategory = () => {
    setIsEditing(false);
    setCurrentCategory(null);
    setFormData({ name: '', description: '', is_active: true, parent_id: undefined });
    setFormErrors({});
    setDefaultParentOptions([]);
    loadParentCategoryOptions('');
    setShowForm(true);
  };

  const handleEditCategory = (category: Category) => {
    setIsEditing(true);
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      is_active: category.is_active,
      parent_id: category.parent_id || undefined,
    });
    setFormErrors({});
    setDefaultParentOptions([]);
    loadParentCategoryOptions('');
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!tenantBusinessTypeId) {
      errors.business_type = 'Tenant business type is not configured. Contact support.';
    }
    if (isEditing && formData.parent_id && currentCategory && formData.parent_id === currentCategory.id) {
      errors.parent_id = 'Parent category cannot be itself';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /** Map Laravel 422 errors to adjacent form fields (handles `field.0` nesting). */
  const mapBackendErrors = (errors: Record<string, string[] | string>) => {
    const transformed: { [key: string]: string } = {};
    Object.entries(errors).forEach(([key, messages]) => {
      const baseKey = key.split('.')[0];
      const message = Array.isArray(messages) ? messages.join(', ') : messages;
      transformed[baseKey] = transformed[baseKey] ? `${transformed[baseKey]}, ${message}` : message;
    });
    return transformed;
  };

  const clearFieldError = (field: string) => {
    setFormErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!tenantBusinessTypeId) return;

    try {
      // Fixed to tenant's business type — backend syncs category_business_type pivot.
      const submitData = {
        ...formData,
        // Explicit null when cleared so backend removes the parent link.
        parent_id: formData.parent_id ?? null,
        business_type_ids: [tenantBusinessTypeId],
        ...(isEditing && currentCategory && { id: currentCategory.id }),
      };

      await categoryService.storeCategory(submitData);
      notify.success(isEditing ? 'Category updated successfully' : 'Category created successfully');
      if (isEditing) {
        setShowForm(false);
      } else {
        setFormData(prev => ({
          name: '',
          description: '',
          is_active: true,
          parent_id: prev.parent_id,
        }));
        setFormErrors({});
      }
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { errors?: Record<string, string[]>; message?: string } };
      };
      if (axiosError.response?.data?.errors) {
        setFormErrors(mapBackendErrors(axiosError.response.data.errors));
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
          {row.original.parent_id && (
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
          {row.original.parent_category || '-'}
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
            onClick={() => handleEditCategory(row.original)}
            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
            title="Edit"
            aria-label="Edit">
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original)}
            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            title="Delete"
            aria-label="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Categories
          </h1>
          {tenantBusinessTypeName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
              <Store className="w-3 h-3" />
              Business type: <span className="font-medium">{tenantBusinessTypeName}</span>
              <span className="text-gray-400">(fixed from your store)</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={handleDownloadSampleExcel}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <ImDownload className="w-4 h-4" />
            Category Sample (Excel)
          </button>
          <button
            onClick={() => setShowBulkUpload(!showBulkUpload)}
            disabled={!tenantBusinessTypeId}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <RiFileExcel2Line className="w-4 h-4" />
            Category Upload (Bulk)
          </button>
          <button
            onClick={handleDownloadSubSampleExcel}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <ImDownload className="w-4 h-4" />
            Sub Category Sample (Excel)
          </button>
          <button
            onClick={() => setShowSubBulkUpload(!showSubBulkUpload)}
            disabled={!tenantBusinessTypeId}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <RiFileExcel2Line className="w-4 h-4" />
            Sub Category Upload (Bulk)
          </button>
          <button
            onClick={handleAddCategory}
            disabled={!tenantBusinessTypeId}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {!tenantBusinessTypeId && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm rounded-md px-3 py-2">
          No business type is linked to your store. Categories cannot be created until a business
          type is assigned to your tenant.
        </div>
      )}

      {/* Bulk Upload Form */}
      {showBulkUpload && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-1">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Bulk Category Upload</h2>
          <form onSubmit={handleBulkUpload} className="space-y-3">
            {/* File Upload Field */}
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select File <span className="text-red-500">*</span>
              </label>
              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-sm p-4 text-center cursor-pointer hover:border-blue-500 transition-colors bg-gray-50 dark:bg-gray-700"
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                  className="hidden"
                  disabled={uploading}
                />

                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <RiFileExcel2Line className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        clearFile();
                      }}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">Click or drop Excel file here</div>
                    <div className="text-xs text-gray-500">.xls, .xlsx — max 10MB</div>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Accepted file types: .xls, .xlsx (Excel files only)</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="px-3 py-1.5 bg-rose-500 text-white text-sm font-medium rounded-sm hover:bg-rose-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TiUploadOutline className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Excel'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowBulkUpload(false);
                  clearFile();
                }}
                disabled={uploading}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subcategory Bulk Upload Form */}
      {showSubBulkUpload && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-purple-200 dark:border-purple-700 p-4 mb-1">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Bulk Sub Category Upload</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Upload subcategories with parent category names. The system will automatically find the parent by name and set the parent_id.
          </p>
          <form onSubmit={handleSubBulkUpload} className="space-y-3">
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select File <span className="text-red-500">*</span>
              </label>
              <div
                className="border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-sm p-4 text-center cursor-pointer hover:border-purple-500 transition-colors bg-gray-50 dark:bg-gray-700"
                onClick={() => !subUploading && subFileInputRef.current?.click()}
              >
                <input
                  ref={subFileInputRef}
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleSubFileSelect(f);
                  }}
                  className="hidden"
                  disabled={subUploading}
                />

                {subSelectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <RiFileExcel2Line className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{subSelectedFile.name}</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        clearSubFile();
                      }}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">Click or drop Excel file here</div>
                    <div className="text-xs text-gray-500">.xls, .xlsx — max 10MB</div>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Columns: #, Name, Parent Category (required), Temp Subcategory ID</p>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={subUploading || !subSelectedFile}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-sm hover:bg-purple-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TiUploadOutline className="w-4 h-4" />
                {subUploading ? 'Uploading...' : 'Upload Sub Categories'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSubBulkUpload(false);
                  clearSubFile();
                }}
                disabled={subUploading}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
                  Business Type <span className="text-red-500">*</span>
                </label>
                <BusinessTypeSelect
                  value={tenantBusinessTypeId}
                  onChange={() => {}}
                  placeholder="Business type"
                  isDisabled
                  isClearable={false}
                  className="w-full text-sm"
                />
                <p className="text-gray-400 text-[11px] mt-0.5">Fixed from your store</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter category name"
                  value={formData.name}
                  onChange={e => { setFormData({ ...formData, name: e.target.value }); clearFieldError('name'); }}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  required
                />
                {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
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
                  onChange={option => {
                    setFormData({ ...formData, parent_id: option?.value || undefined });
                    clearFieldError('parent_id');
                  }}
                  loadOptions={loadParentCategoryOptions}
                  defaultOptions={defaultParentOptions}
                  placeholder="Select parent (optional)"
                  className="text-sm"
                  isClearable
                  isInvalid={!!formErrors.parent_id}
                />
                {formErrors.parent_id && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.parent_id}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Status
                </label>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={e => {
                    setFormData({ ...formData, is_active: e.target.value === 'active' });
                    clearFieldError('is_active');
                  }}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.is_active ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {formErrors.is_active && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.is_active}</p>
                )}
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
                  onChange={e => { setFormData({ ...formData, description: e.target.value }); clearFieldError('description'); }}
                  className={`w-full px-2 py-1.25 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 h-9 resize-none ${formErrors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  rows={3}
                />
                {formErrors.description && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.description}</p>
                )}
              </div>
            </div>
            {formErrors.business_type && (
              <p className="text-red-600 text-xs md:col-span-2">{formErrors.business_type}</p>
            )}
            <div className="flex gap-2 md:col-span-2 mt-1.5">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
              >
                <GiSave className="w-4 h-4" />
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

      {/* DataTable — scoped to tenant business type */}
      <DataTable
        refreshKey={refreshKey}
        columns={columns}
        apiEndpoint="categories"
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by category name, description..."
        filterParams={{ business_type_id: tenantBusinessTypeId }}
      />
    </div>
  );
}
