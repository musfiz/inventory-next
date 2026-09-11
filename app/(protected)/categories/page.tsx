'use client';

import { useState, useCallback, useRef } from 'react';
import { FolderOpen, Plus, Edit, Trash2, X, Download } from 'lucide-react';
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
import CustomSelect from '@/components/ui/custom-select';
import BusinessTypeSelect from '@/components/ui/business-type-select';
import BusinessTypeMultiSelect from '@/components/ui/business-type-multi-select';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
      />
    </button>
  );
}

export default function CategoriesPage() {
  const { isSuperAdmin, isHydrated } = usePermissions();
  const user = useAuthStore(state => state.user);
  const router = useRouter();

  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;
  const [businessTypeFilterId, setBusinessTypeFilterId] = useState<number | null>(
    isSuperAdmin ? null : tenantBusinessTypeId
  );

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    business_type_ids: isSuperAdmin ? [] as number[] : (tenantBusinessTypeId ? [tenantBusinessTypeId] : []),
    is_active: true,
    storefront_active: false,
    parent_id: undefined as string | undefined,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [togglingStorefront, setTogglingStorefront] = useState<Record<string, boolean>>({});
  const lastSavedBusinessTypeIds = useRef<number[]>([]);

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
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);

  const handleExportExcel = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      window.open(`${backendUrl}/api/v1/categories/export`, '_blank');
    } catch (error) {
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
    async (
      inputValue: string,
      businessTypeIds?: number[]
    ): Promise<{ value: string; label: string }[]> => {
      try {
        const params: { search?: string; only_parent?: boolean; business_type_id?: number } = {};
        params.only_parent = true;
        if (inputValue && inputValue.trim()) {
          params.search = inputValue.trim();
        }
        const ids = businessTypeIds ?? formData.business_type_ids;
        const effectiveBtId = isSuperAdmin ? (ids[0] ?? null) : tenantBusinessTypeId;
        if (effectiveBtId) {
          params.business_type_id = effectiveBtId;
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
    },
    [formData.business_type_ids, isSuperAdmin, tenantBusinessTypeId, isEditing, currentCategory?.id]
  );

  const handleAddCategory = () => {
    setIsEditing(false);
    setCurrentCategory(null);
    const initialIds = isSuperAdmin
      ? (lastSavedBusinessTypeIds.current.length > 0 ? lastSavedBusinessTypeIds.current : [])
      : (tenantBusinessTypeId ? [tenantBusinessTypeId] : []);
    setFormData({
      name: '',
      description: '',
      business_type_ids: initialIds,
      is_active: true,
      storefront_active: false,
      parent_id: undefined,
    });
    setFormErrors({});
    setDefaultParentOptions([]);
    loadParentCategoryOptions('', initialIds);
    setShowForm(true);
  };

  const extractBusinessTypeIds = (cat: any): number[] => {
    if (Array.isArray(cat?.business_types) && cat.business_types.length > 0) {
      return cat.business_types.map((bt: any) => Number(bt.id)).filter((n: number) => !Number.isNaN(n));
    }
    if (Array.isArray(cat?.business_type_ids) && cat.business_type_ids.length > 0) {
      return cat.business_type_ids.map((n: any) => Number(n)).filter((n: number) => !Number.isNaN(n));
    }
    if (cat?.business_type_id) {
      const n = Number(cat.business_type_id);
      return Number.isNaN(n) ? [] : [n];
    }
    if (cat?.business_type?.id) {
      const n = Number(cat.business_type.id);
      return Number.isNaN(n) ? [] : [n];
    }
    return [];
  };

  const applyCategoryToForm = (category: Category) => {
    const freshIds = extractBusinessTypeIds(category as any);
    const initialIds = isSuperAdmin
      ? freshIds
      : (tenantBusinessTypeId ? [tenantBusinessTypeId] : []);
    setFormData({
      name: category.name,
      description: category.description || '',
      // BusinessTypeMultiSelect loads ALL options from /v1/business-types/dropdown
      // and pre-selects these ids resolved from the fresh category data.
      business_type_ids: initialIds,
      is_active: category.is_active,
      storefront_active: category.storefront_active ?? false,
      parent_id: category.parent_id || undefined,
    });
    // Keep parent label visible even before the parent dropdown reloads
    const parentLabel =
      (category as any)?.parent?.name ?? (category as any)?.parent_category ?? '';
    if (category.parent_id && parentLabel) {
      setParentCategories(prev => {
        if (prev.some(c => c.id === category.parent_id)) return prev;
        return [...prev, { id: category.parent_id!, name: parentLabel } as Category];
      });
      setDefaultParentOptions(prev => {
        if (prev.some(o => o.value === category.parent_id)) return prev;
        return [{ value: category.parent_id!, label: parentLabel }, ...prev];
      });
    }
    loadParentCategoryOptions('', initialIds);
  };

  const handleEditCategory = async (category: Category) => {
    setIsEditing(true);
    setCurrentCategory(category);
    setFormErrors({});
    setDefaultParentOptions([]);
    setParentCategories([]);
    // Show row data instantly so the form opens without delay
    applyCategoryToForm(category);
    setShowForm(true);

    // Then fetch fresh category through backend API so business_types are accurate.
    // BusinessTypeMultiSelect shows all types from /v1/business-types/dropdown
    // and selects the ids coming from this fresh data.
    setIsLoadingEdit(true);
    try {
      const fresh = await categoryService.getCategoryById(category.id);
      setCurrentCategory(fresh);
      applyCategoryToForm(fresh);
    } catch (error) {
      console.error('Failed to fetch fresh category, falling back to row data:', error);
      // Row data already applied above; keep the form usable.
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (formData.business_type_ids.length === 0) {
      errors.business_type_ids = 'At least one business type is required';
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
      // Merge multiple indexed messages (e.g. business_type_ids.0, .1) into one field
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

    try {
      const submitData = {
        ...formData,
        // Send explicit null when cleared so backend removes the parent link
        // (undefined keys are dropped by JSON.stringify and old parent would persist).
        parent_id: formData.parent_id ?? null,
        business_type_ids: isSuperAdmin
          ? formData.business_type_ids
          : (tenantBusinessTypeId ? [tenantBusinessTypeId] : []),
        ...(isEditing && currentCategory && { id: currentCategory.id }),
      };

      await categoryService.storeCategory(submitData);
      notify.success(isEditing ? 'Category updated successfully' : 'Category created successfully');
      lastSavedBusinessTypeIds.current = formData.business_type_ids;
      if (isEditing) {
        setShowForm(false);
      } else {
        setFormData(prev => ({
          name: '',
          description: '',
          business_type_ids: prev.business_type_ids,
          is_active: true,
          storefront_active: false,
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

  const handleStorefrontToggle = async (category: Category, value: boolean) => {
    setTogglingStorefront(prev => ({ ...prev, [category.id]: true }));
    try {
      const rowIds = extractBusinessTypeIds(category as any);
      const submitData = {
        id: category.id,
        name: category.name,
        description: category.description,
        parent_id: category.parent_id ?? null,
        business_type_ids:
          rowIds.length > 0
            ? rowIds
            : isSuperAdmin
              ? []
              : tenantBusinessTypeId
                ? [tenantBusinessTypeId]
                : [],
        is_active: category.is_active,
        storefront_active: value,
      } as Parameters<typeof categoryService.storeCategory>[0];
      await categoryService.storeCategory(submitData);
      notify.success(`Category ${value ? 'shown on' : 'hidden from'} storefront`);
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      notify.error(axiosError.response?.data?.message || 'Failed to update storefront visibility');
    } finally {
      setTogglingStorefront(prev => {
        const next = { ...prev };
        delete next[category.id];
        return next;
      });
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
    ...(isSuperAdmin
      ? [
        {
          accessorKey: 'business_type',
          header: 'Business Types',
          cell: ({ row }: any) => {
            const types = (row.original as any).business_types;
            if (!types || types.length === 0) {
              return <span className="text-gray-400 text-xs">Other</span>;
            }
            return (
              <div className="flex flex-wrap gap-1">
                {types.map((bt: any) => (
                  <span
                    key={bt.id}
                    className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"
                  >
                    {bt.name}
                  </span>
                ))}
              </div>
            );
          },
        },
      ]
      : []),
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
      accessorKey: 'storefront_active',
      header: 'Storefront',
      cell: ({ row }) => (
        <ToggleSwitch
          checked={!!row.original.storefront_active}
          onChange={checked => handleStorefrontToggle(row.original, checked)}
          disabled={!!togglingStorefront[row.original.id]}
        />
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

  const buildApiEndpoint = () => 'categories';

  const effectiveBusinessTypeId = isSuperAdmin ? businessTypeFilterId : tenantBusinessTypeId;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 whitespace-nowrap">
            <FolderOpen className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
            Product Categories
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            Export Excel
          </button>
          <button
            onClick={handleDownloadSampleExcel}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <ImDownload className="w-4 h-4 shrink-0" />
            Category Sample (Excel)
          </button>
          <button
            onClick={() => setShowBulkUpload(!showBulkUpload)}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <RiFileExcel2Line className="w-4 h-4 shrink-0" />
            Category Upload (Bulk)
          </button>
          <button
            onClick={handleDownloadSubSampleExcel}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <ImDownload className="w-4 h-4 shrink-0" />
            Sub Category Sample (Excel)
          </button>
          <button
            onClick={() => setShowSubBulkUpload(!showSubBulkUpload)}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <RiFileExcel2Line className="w-4 h-4 shrink-0" />
            Sub Category Upload (Bulk)
          </button>
          <button
            onClick={handleAddCategory}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Add Category
          </button>
        </div>
      </div>

      {/* Filters */}
      {isSuperAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <BusinessTypeSelect
                value={businessTypeFilterId}
                onChange={(id) => setBusinessTypeFilterId(id)}
                placeholder="Filter by business type"
                isClearable
              />
            </div>
          </div>
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
            {isEditing && isLoadingEdit && (
              <span className="ml-2 text-xs font-normal text-gray-500">Loading fresh data…</span>
            )}
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
                  onChange={e => { setFormData({ ...formData, name: e.target.value }); clearFieldError('name'); }}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  required
                />
                {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
              </div>
              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    Business Types
                  </label>
                  <BusinessTypeMultiSelect
                    value={formData.business_type_ids}
                    onChange={(ids) => {
                      setFormData({ ...formData, business_type_ids: ids });
                      clearFieldError('business_type_ids');
                    }}
                    placeholder="Select business types"
                    isInvalid={!!formErrors.business_type_ids}
                  />
                  {formErrors.business_type_ids && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.business_type_ids}</p>
                  )}
                </div>
              )}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Show on Storefront
                </label>
                <div className="flex h-7.5 items-center gap-2">
                  <ToggleSwitch
                    checked={!!formData.storefront_active}
                    onChange={v => {
                      setFormData({ ...formData, storefront_active: v });
                      clearFieldError('storefront_active');
                    }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.storefront_active ? 'Shown in Shop by Category' : 'Hidden from Shop by Category'}
                  </span>
                </div>
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

      {/* DataTable */}
      <DataTable
        refreshKey={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by category name, description..."
        filterParams={{ business_type_id: effectiveBusinessTypeId }}
      />
    </div>
  );
}
