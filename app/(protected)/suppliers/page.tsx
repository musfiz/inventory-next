'use client';

import { ColumnDef } from '@tanstack/react-table';
import { List, Plus, Edit, Trash2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { GiSave } from 'react-icons/gi';
import { ImDownload } from 'react-icons/im';
import { RiFileExcel2Line } from 'react-icons/ri';
import { TiUploadOutline } from 'react-icons/ti';
import CustomSelect from '@/components/ui/custom-select';
import DataTable from '@/components/ui/datatable';
import TenantSelect from '@/components/ui/tenant-select';
import { usePermissions } from '@/hooks/use-permissions';
import { notify, confirm } from '@/lib/notifications';
import { supplierService, commonService } from '@/services';
import { useAuthStore } from '@/stores/auth-store';
import type { BulkImportRowError, BulkImportStats } from '@/types/api.types';

const inputCls = (hasError?: boolean) =>
  `w-full px-2.5 py-1 text-xs bg-white dark:bg-gray-700 border ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500`;

/** Extensions the bulk import endpoint accepts (max 10MB). */
const BULK_FILE_EXTENSIONS = ['.xls', '.xlsx', '.csv'];
const BULK_MAX_BYTES = 10 * 1024 * 1024;

/** Outcome of one bulk upload attempt, shaped so success and 422 share a renderer. */
interface BulkOutcome {
  message: string;
  stats: BulkImportStats | null;
  errors: BulkImportRowError[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-md px-2.5 py-2 text-center ${tone}`}>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}

/**
 * Result of a bulk upload: the counters, which duplicate names were dropped, and
 * the per-row validation failures. Rendered inline in the upload panel so a
 * partial import does not look like a failure — the operator can fix the listed
 * rows and re-upload without hunting through a toast that has already vanished.
 */
function BulkOutcomePanel({ outcome, onDismiss }: { outcome: BulkOutcome; onDismiss: () => void }) {
  const stats = outcome.stats;
  const duplicates = stats?.duplicate_names ?? [];
  const hasWarnings = outcome.errors.length > 0 || (stats?.skipped ?? 0) > 0;
  const clean = outcome.errors.length === 0 && (stats?.skipped ?? 0) === 0;

  const shell = clean
    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-900/20'
    : hasWarnings
      ? 'border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20'
      : 'border-red-200 dark:border-red-800 bg-red-50/70 dark:bg-red-900/20';

  const HeadIcon = clean ? CheckCircle2 : AlertTriangle;
  const headText = clean
    ? 'text-emerald-700 dark:text-emerald-300'
    : hasWarnings
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-red-700 dark:text-red-300';

  return (
    <div className={`rounded-md border p-3 ${shell}`}>
      <div className="flex items-start gap-2">
        <HeadIcon className={`w-4 h-4 mt-0.5 shrink-0 ${headText}`} />
        <p className={`text-xs font-semibold flex-1 ${headText}`}>{outcome.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          title="Dismiss"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2 mt-2.5">
          <StatTile label="Imported" value={stats.imported} tone="bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200" />
          <StatTile label="Skipped" value={stats.skipped} tone="bg-amber-100/70 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200" />
          <StatTile label="Duplicates" value={stats.duplicates} tone="bg-amber-100/70 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200" />
        </div>
      )}

      {duplicates.length > 0 && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2">
          <span className="font-semibold">Skipped as duplicate name:</span>{' '}
          {duplicates.slice(0, 12).join(', ')}
          {duplicates.length > 12 ? ` and ${duplicates.length - 12} more` : ''}
        </p>
      )}

      {outcome.errors.length > 0 && (
        <div className="mt-2.5">
          <p className="text-[11px] font-semibold text-red-700 dark:text-red-300">
            {outcome.errors.length} row(s) rejected
          </p>
          <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
            {outcome.errors.map((e, i) => (
              <li key={`${e.row}-${i}`} className="text-[11px] text-red-600 dark:text-red-400 flex gap-1.5">
                <span className="font-mono shrink-0">Row {e.row}</span>
                <span className="min-w-0">
                  {e.attribute ? <span className="font-medium">{e.attribute}: </span> : null}
                  {e.errors.join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FormRow({ label, required, error, children, className = '', labelWidth = 'w-20', fieldWidth = 'flex-1 min-w-0' }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode; className?: string; labelWidth?: string; fieldWidth?: string }) {
  const errorMl =
    labelWidth === 'w-32' ? 'ml-[8.5rem]' : labelWidth === 'w-20' ? 'ml-[5.5rem]' : 'ml-[4.375rem]';
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <label className={`${labelWidth} shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-right`}>
          {label}{required && <span className="text-red-500">*</span>}:
        </label>
        <div className={fieldWidth}>{children}</div>
      </div>
      {error && <p className={`text-[10px] text-red-500 mt-0.5 ${errorMl}`}>{error}</p>}
    </div>
  );
}

export default function SupplierListPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { isSuperAdmin, hasPermission, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated && !hasPermission('view-supplier')) {
      router.push('/access-denied');
    }
  }, [hasPermission, isHydrated, router]);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({
    tenant_id: undefined,
    name: '',
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: 'Bangladesh',
    postal_code: '',
    vat_number: '',
    tin_number: '',
    trade_license: '',
    website: '',
    payment_terms: '',
    credit_limit: 0,
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState<any>({});
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [defaultTenantOptions, setDefaultTenantOptions] = useState<any[]>([]);

  // Tenant-wise list filter
  const authUser = useAuthStore(s => s.user);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  // Bulk upload state
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [bulkTenantId, setBulkTenantId] = useState<string>('');
  const [bulkOutcome, setBulkOutcome] = useState<BulkOutcome | null>(null);
  const [bulkErrors, setBulkErrors] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadTenantOptions = async (input: string) => {
    if (!isSuperAdmin) return [];
    const tenants = await commonService.getTenantsForDropdown({ search: input });
    const options = tenants.map((t: any) => ({ value: t.id, label: t.business_name }));
    if (!input && defaultTenantOptions.length === 0) setDefaultTenantOptions(options);
    return options;
  };

  useEffect(() => {
    if (isSuperAdmin) loadTenantOptions('');
  }, [isSuperAdmin]);

  const validateForm = () => {
    const errors: any = {};
    if (isSuperAdmin && !formData.tenant_id) errors.tenant_id = 'Tenant is required';
    if (!formData.name || !formData.name.trim()) errors.name = 'Name is required';
    if (!formData.phone || !formData.phone.trim()) {
      errors.phone = 'Phone is required';
    } else {
      const phone = String(formData.phone).trim();
      const phoneRegex = /^[+\d][\d\s\-().]{6,20}$/;
      if (!phoneRegex.test(phone)) errors.phone = 'Please enter a valid phone number';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const submitData = { ...formData };
      if (isEditing && formData.id) submitData.id = formData.id;
      if (!isSuperAdmin) delete submitData.tenant_id;
      await supplierService.storeSupplier(submitData);
      notify.success(isEditing ? 'Supplier updated successfully' : 'Supplier created successfully');
      setShowForm(false);
      setRefreshKey(k => k + 1);
      setSelectedTenant(null);
      setIsEditing(false);
      setFormErrors({});
      setFormData({
        tenant_id: undefined,
        name: '',
        company_name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        country: 'Bangladesh',
        postal_code: '',
        vat_number: '',
        tin_number: '',
        trade_license: '',
        website: '',
        payment_terms: '',
        credit_limit: 0,
        status: 'active',
      });
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const transformed: any = {};
        Object.entries(err.response.data.errors).forEach(([k, v]: any) => {
          transformed[k] = Array.isArray(v) ? v.join(', ') : v;
        });
        setFormErrors(transformed);
      } else {
        notify.error(err?.response?.data?.message || 'Failed to save supplier');
      }
    }
  };

  const handleEdit = async (supplier: any) => {
    setFormErrors({});
    // Normalize nulls to '' to avoid React `value` prop null warning (312:15)
    const sanitized = Object.fromEntries(
      Object.entries({ ...formData, ...supplier }).map(([k, v]) => [k, v ?? ''])
    ) as any;
    // keep tenant_id as undefined if empty, credit_limit as 0 if empty
    if (sanitized.tenant_id === '') sanitized.tenant_id = undefined;
    if (sanitized.credit_limit === '') sanitized.credit_limit = 0;
    setFormData(sanitized);
    if (supplier?.tenant_id) {
      // Prefer eager-loaded tenant relationship from API (SupplierTrait now with tenant)
      let label: string =
        supplier.tenant?.business_name ||
        supplier.tenant_business_name ||
        supplier.tenant_name ||
        supplier.business_name ||
        '';
      if (!label) {
        const hit = defaultTenantOptions.find((o: any) => String(o.value) === String(supplier.tenant_id));
        if (hit) label = hit.label;
      }
      if (!label && isSuperAdmin) {
        try {
          const tenants = await commonService.getTenantsForDropdown({ search: '' });
          const t = tenants.find((x: any) => String(x.id) === String(supplier.tenant_id));
          if (t) {
            label = (t as any).business_name;
            if (!defaultTenantOptions.some((o: any) => String(o.value) === String(t.id))) {
              setDefaultTenantOptions((prev: any) => [...prev, { value: (t as any).id, label }]);
            }
          }
        } catch { }
      }
      if (!label) label = String(supplier.tenant_id).slice(0, 8);
      const opt = { value: supplier.tenant_id, label };
      setSelectedTenant(opt);
      // Ensure AsyncSelect can display it even if not in defaultOptions
      if (!defaultTenantOptions.some((o: any) => String(o.value) === String(supplier.tenant_id))) {
        setDefaultTenantOptions((prev: any) => [...prev, opt]);
      }
    } else {
      setSelectedTenant(null);
    }
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const result = await confirm({
      title: 'Delete Supplier',
      html: 'Are you sure you want to delete this supplier?',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });

    if (!result.isConfirmed) return;

    try {
      await supplierService.deleteSupplier(id);
      notify.success('Supplier deleted successfully');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to delete supplier');
    }
  };

  // ── Bulk upload handlers ───────────────────────────────────────────────────

  const clearBulkFile = () => {
    setSelectedFile(null);
    setBulkOutcome(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const closeBulkUpload = () => {
    setShowBulkUpload(false);
    setUploading(false);
    clearBulkFile();
    setBulkErrors({});
  };

  const openBulkUpload = () => {
    setShowBulkUpload(true);
    setBulkOutcome(null);
    setBulkErrors({});
    // Super admins must name the target tenant; pre-select whatever the list is
    // already filtered to so the common case needs no extra choice.
    setBulkTenantId(
      selectedTenantId || (isSuperAdmin ? '' : (authUser?.tenant_id ? String(authUser.tenant_id) : ''))
    );
  };

  const handleDownloadSampleExcel = async () => {
    try {
      await supplierService.downloadSupplierSampleExcel(
        isSuperAdmin ? selectedTenantId || undefined : undefined
      );
      notify.success('Sample Excel downloaded successfully');
    } catch {
      notify.error('Failed to download sample file');
    }
  };

  const handleFileSelect = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isValidExt = BULK_FILE_EXTENSIONS.some(ext => fileName.endsWith(ext));

    if (!isValidExt) {
      notify.error(`Invalid file type. Please upload an Excel or CSV file (${BULK_FILE_EXTENSIONS.join(', ')}).`);
      return;
    }

    if (file.size > BULK_MAX_BYTES) {
      notify.error('File size exceeds 10MB limit.');
      return;
    }

    setSelectedFile(file);
    setBulkOutcome(null);
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      notify.error('Please select a file to upload');
      return;
    }

    // The API rejects a super admin upload with 422 unless a tenant is named,
    // so catch it here rather than letting the request round-trip.
    const tenantId = isSuperAdmin ? bulkTenantId : authUser?.tenant_id;
    if (isSuperAdmin && !bulkTenantId) {
      setBulkErrors({ tenant_id: 'Tenant is required' });
      return;
    }

    try {
      setUploading(true);
      setBulkErrors({});
      setBulkOutcome(null);

      const result = await supplierService.supplierBulkImport(
        selectedFile,
        tenantId ? String(tenantId) : undefined
      );

      setBulkOutcome({
        message: result.message,
        stats: result.data?.stats ?? null,
        errors: result.data?.errors ?? [],
      });
      notify.success(result.message);
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string; errors?: unknown } };
      };
      const payload = axiosError.response?.data;
      const message = payload?.message || 'Bulk upload failed';

      // Two different 422 shapes come back from this endpoint: a flat
      // { file: [...] } object when the upload itself is rejected, and an array
      // of row failures when the spreadsheet parsed but rows were invalid.
      if (Array.isArray(payload?.errors)) {
        setBulkOutcome({
          message,
          stats: null,
          errors: payload.errors as BulkImportRowError[],
        });
      } else if (payload?.errors && typeof payload.errors === 'object') {
        setBulkErrors(
          Object.fromEntries(
            Object.entries(payload.errors as Record<string, string[]>).map(([k, v]) => [
              k,
              v.join(', '),
            ])
          )
        );
        notify.error(message);
      } else {
        setBulkOutcome({ message, stats: null, errors: [] });
      }
    } finally {
      setUploading(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'serial',
      header: 'SL',
      cell: ({ row, table }) => (
        <span>
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
            row.index +
            1}
        </span>
      ),
    },
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'company_name', header: 'Company' },
    { accessorKey: 'email', header: 'Email' },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '84px' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row.original)}
            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 cursor-pointer"
            title="Edit"
            aria-label="Edit">
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original.id)}
            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
            title="Delete"
            aria-label="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Tenant-wise list filter. A tenant user is pinned to their own tenant by the
  // API regardless, but sending it keeps the DataTable's filterParamsKey stable
  // so switching tenants (super admin) resets to page 1 instead of showing a
  // page that no longer exists.
  const filterParams: Record<string, string | undefined | null> = {};
  if (isSuperAdmin) {
    filterParams.tenant_id = selectedTenantId || undefined;
  } else if (authUser?.tenant_id) {
    filterParams.tenant_id = String(authUser.tenant_id);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <List className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          {showForm ? (isEditing ? 'Edit Supplier' : 'Add Supplier') : 'Supplier'}
        </h1>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <div className="w-52">
              <TenantSelect
                value={selectedTenantId}
                onChange={(tid) => setSelectedTenantId(tid || '')}
                placeholder="All Tenants"
                isClearable
                compact
              />
            </div>
          )}
          <button
            onClick={handleDownloadSampleExcel}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
            title="Download the two-column supplier template"
          >
            <ImDownload className="w-4 h-4" />
            Supplier Sample (Excel)
          </button>
          <button
            onClick={() => (showBulkUpload ? closeBulkUpload() : openBulkUpload())}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
            aria-expanded={showBulkUpload}
          >
            <RiFileExcel2Line className="w-4 h-4" />
            Supplier Upload (Bulk)
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setIsEditing(false);
              setFormErrors({});
              setSelectedTenant(null);
              setFormData({
                tenant_id: undefined,
                name: '',
                company_name: '',
                contact_person: '',
                phone: '',
                email: '',
                address: '',
                city: '',
                state: '',
                country: 'Bangladesh',
                postal_code: '',
                vat_number: '',
                tin_number: '',
                trade_license: '',
                website: '',
                payment_terms: '',
                credit_limit: 0,
                status: 'active',
              });
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Bulk Supplier Upload */}
      {showBulkUpload && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bulk Supplier Upload</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                The file needs exactly two columns —{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">Name</span> and{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">Mobile No</span>. Supplier codes
                are generated automatically. Download the sample first if you are unsure of the layout.
              </p>
            </div>
            <button
              type="button"
              onClick={closeBulkUpload}
              disabled={uploading}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50 cursor-pointer"
              title="Close"
              aria-label="Close bulk upload"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleBulkUpload} className="space-y-3">
            {/* Target tenant — required for super admins, implied for everyone else */}
            {isSuperAdmin && (
              <div className="w-1/3 min-w-[260px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tenant <span className="text-red-500">*</span>
                </label>
                <TenantSelect
                  value={bulkTenantId}
                  onChange={(tid) => {
                    setBulkTenantId(tid || '');
                    if (tid && bulkErrors.tenant_id) {
                      setBulkErrors(prev => {
                        const next = { ...prev };
                        delete next.tenant_id;
                        return next;
                      });
                    }
                  }}
                  placeholder="Select tenant"
                  isDisabled={uploading}
                  isInvalid={!!bulkErrors.tenant_id}
                  isClearable
                  compact
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Every row will be created under this tenant.
                </p>
                {bulkErrors.tenant_id && <p className="mt-1 text-xs text-red-500">{bulkErrors.tenant_id}</p>}
              </div>
            )}

            {/* File Upload Field */}
            <div className="w-1/3 min-w-[260px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select File <span className="text-red-500">*</span>
              </label>
              <div
                onDragOver={e => {
                  e.preventDefault();
                  if (!uploading) setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragActive(false);
                  const f = e.dataTransfer?.files?.[0];
                  if (f && !uploading) handleFileSelect(f);
                }}
                className={`border-2 border-dashed rounded-sm text-center cursor-pointer transition-colors bg-gray-50 dark:bg-gray-700 ${
                  dragActive
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500'
                }`}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx,.csv"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                  className="hidden"
                  disabled={uploading}
                />

                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 p-4">
                    <RiFileExcel2Line className="w-5 h-5 text-green-600 shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{selectedFile.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{formatFileSize(selectedFile.size)}</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        clearBulkFile();
                      }}
                      disabled={uploading}
                      className="ml-1 p-0.5 text-red-500 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                      title="Remove file"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="font-medium text-sm text-gray-700 dark:text-gray-300">
                      Click or drop Excel / CSV file here
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">.xls, .xlsx, .csv — max 10MB</div>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Accepted file types: .xls, .xlsx, .csv
                {bulkErrors.file && <span className="text-red-500"> — {bulkErrors.file}</span>}
              </p>
            </div>

            {bulkOutcome && <BulkOutcomePanel outcome={bulkOutcome} onDismiss={() => setBulkOutcome(null)} />}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="px-3 py-1.5 bg-rose-500 text-white text-sm font-medium rounded-sm hover:bg-rose-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TiUploadOutline className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>

              <button
                type="button"
                onClick={closeBulkUpload}
                disabled={uploading}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                Close
              </button>

              <button
                type="button"
                onClick={handleDownloadSampleExcel}
                disabled={uploading}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ImDownload className="w-4 h-4" />
                Sample
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm && (
        <div className="space-y-3">
          <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h3>

              {isSuperAdmin && (
                <div className="mb-2">
                  <FormRow label="Tenant" required labelWidth="w-32" error={formErrors.tenant_id}>
                    <CustomSelect
                      value={selectedTenant}
                      onChange={(o: any) => {
                        setSelectedTenant(o);
                        setFormData({ ...formData, tenant_id: o?.value });
                        if (formErrors.tenant_id) {
                          setFormErrors((prev: any) => {
                            const next = { ...prev };
                            delete next.tenant_id;
                            return next;
                          });
                        }
                      }}
                      loadOptions={loadTenantOptions}
                      defaultOptions={defaultTenantOptions.length > 0 ? defaultTenantOptions : true}
                      placeholder="Select tenant"
                      isInvalid={!!formErrors.tenant_id}
                      compact
                    />
                  </FormRow>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <FormRow label="Name" required labelWidth="w-32" error={formErrors.name}>
                  <input
                    type="text"
                    value={formData.name ?? ''}
                    onChange={e => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) {
                        setFormErrors((prev: any) => {
                          const next = { ...prev };
                          delete next.name;
                          return next;
                        });
                      }
                    }}
                    placeholder="Enter supplier name"
                    className={inputCls(!!formErrors.name)}
                  />
                </FormRow>

                <FormRow label="Phone" required labelWidth="w-32" error={formErrors.phone}>
                  <input
                    type="text"
                    value={formData.phone ?? ''}
                    onChange={e => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (formErrors.phone) {
                        setFormErrors((prev: any) => {
                          const next = { ...prev };
                          delete next.phone;
                          return next;
                        });
                      }
                    }}
                    placeholder="Enter phone number"
                    className={inputCls(!!formErrors.phone)}
                  />
                </FormRow>

                <FormRow label="Contact Person" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.contact_person ?? ''}
                    onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Enter contact person name"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Company" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.company_name ?? ''}
                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Enter company name"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Email" labelWidth="w-32" error={formErrors.email}>
                  <input
                    type="email"
                    value={formData.email ?? ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    className={inputCls(!!formErrors.email)}
                  />
                </FormRow>

                <FormRow label="Website" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.website ?? ''}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                    placeholder="Enter website URL"
                    className={inputCls(false)}
                  />
                </FormRow>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <FormRow label="City" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.city ?? ''}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Enter city"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="State/Province" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.state ?? ''}
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Enter state"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Postal Code" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.postal_code ?? ''}
                    onChange={e => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="Enter postal code"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Country" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.country ?? ''}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Bangladesh"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Address" labelWidth="w-32" className="md:col-span-2">
                  <input
                    type="text"
                    value={formData.address ?? ''}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address, building, floor"
                    className={inputCls(false)}
                  />
                </FormRow>
              </div>
            </div>

            {/* Tax & Compliance */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Tax &amp; Compliance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <FormRow label="VAT Number" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.vat_number ?? ''}
                    onChange={e => setFormData({ ...formData, vat_number: e.target.value })}
                    placeholder="Enter VAT number"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="TIN Number" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.tin_number ?? ''}
                    onChange={e => setFormData({ ...formData, tin_number: e.target.value })}
                    placeholder="Enter TIN number"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Trade License" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.trade_license ?? ''}
                    onChange={e => setFormData({ ...formData, trade_license: e.target.value })}
                    placeholder="Enter trade license number"
                    className={inputCls(false)}
                  />
                </FormRow>
              </div>
            </div>

            {/* Business Terms */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Business Terms</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <FormRow label="Payment Terms" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.payment_terms ?? ''}
                    onChange={e => setFormData({ ...formData, payment_terms: e.target.value })}
                    placeholder="Enter payment terms"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Credit Limit" labelWidth="w-32" fieldWidth="w-40" error={formErrors.credit_limit}>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.credit_limit ?? ''}
                    onChange={e => setFormData({ ...formData, credit_limit: e.target.value })}
                    placeholder="0.00"
                    className={inputCls(!!formErrors.credit_limit)}
                  />
                </FormRow>

                <FormRow label="Status" labelWidth="w-32" fieldWidth="w-40" error={formErrors.status}>
                  <select
                    value={formData.status ?? 'active'}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className={inputCls(!!formErrors.status)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </FormRow>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setIsEditing(false);
                  setFormErrors({});
                  setSelectedTenant(null);
                  setFormData({
                    tenant_id: undefined,
                    name: '',
                    company_name: '',
                    contact_person: '',
                    phone: '',
                    email: '',
                    address: '',
                    city: '',
                    state: '',
                    country: 'Bangladesh',
                    postal_code: '',
                    vat_number: '',
                    tin_number: '',
                    trade_license: '',
                    website: '',
                    payment_terms: '',
                    credit_limit: 0,
                    status: 'active',
                  });
                }}
                className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded"
              >
                <GiSave className="w-3.5 h-3.5" />
                {isEditing ? 'Update Supplier' : 'Create Supplier'}
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint="suppliers"
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by supplier name, code..."
        filterParams={filterParams}
      />
    </div>
  );
}
