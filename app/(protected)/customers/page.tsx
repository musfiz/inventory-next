"use client";

import { useState, useEffect, useRef } from 'react';
import Spinner from '@/components/ui/spinner';
import { Users as UsersIcon, Plus, Edit, Trash2, X, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ImDownload } from 'react-icons/im';
import { RiFileExcel2Line } from 'react-icons/ri';
import { TiUploadOutline } from 'react-icons/ti';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import customerService from '@/services/customerService';
import type { Customer, CustomerStatementResponse, BulkImportRowError, BulkImportStats } from '@/services/customerService';
import DataTable from '@/components/ui/datatable';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import TenantSelect from '@/components/ui/tenant-select';
import { useAuthStore } from '@/stores/auth-store';

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
 * Result of a bulk upload: the counters, which duplicates were dropped, and the
 * per-row validation failures. Rendered inline in the upload panel so a partial
 * import does not look like a failure — the operator can fix the listed rows and
 * re-upload without hunting through a toast that has already vanished.
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
          <span className="font-semibold">Skipped as duplicate mobile:</span>{' '}
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
      <div className="flex items-start gap-1.5">
        <label className={`${labelWidth} shrink-0 pt-1 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-right`}>
          {label}{required && <span className="text-red-500">*</span>}:
        </label>
        <div className={fieldWidth}>{children}</div>
      </div>
      {error && <p className={`text-[10px] text-red-500 mt-0.5 ${errorMl}`}>{error}</p>}
    </div>
  );
}

export default function CustomersPage() {
  const { isSuperAdmin, hasPermission, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!hasPermission('view-customer')) router.replace('/dashboard');
  }, [isHydrated, hasPermission, router]);

  const authUser = useAuthStore(s => s.user);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<any>({
    tenant_id: '',
    name: '',
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: 'Bangladesh',
    type: 'retail',
    notes: '',
    credit_limit: '',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [showStatement, setShowStatement] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementData, setStatementData] = useState<CustomerStatementResponse | null>(null);
  const [statementTarget, setStatementTarget] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Bulk upload state
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [bulkTenantId, setBulkTenantId] = useState<string>('');
  const [bulkOutcome, setBulkOutcome] = useState<BulkOutcome | null>(null);
  const [bulkErrors, setBulkErrors] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fmtMoney = (v?: number | string | null) => Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : '-');

  // tenant select handled by TenantSelect component

  const handleAddCustomer = () => {
    setIsEditing(false);
    setCurrentCustomer(null);
    setFormData({
      tenant_id: isSuperAdmin ? '' : (authUser?.tenant_id ? String(authUser.tenant_id) : ''),
      name: '',
      company_name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      country: 'Bangladesh',
      type: 'retail',
      notes: '',
      credit_limit: '',
      status: 'active',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setIsEditing(true);
    setCurrentCustomer(customer);
    setFormData({
      tenant_id: customer.tenant_id ? String(customer.tenant_id) : '',
      name: customer.name,
      company_name: customer.company_name || '',
      contact_person: customer.contact_person || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || 'Bangladesh',
      type: customer.type || 'retail',
      notes: customer.notes || '',
      credit_limit: customer.credit_limit || '',
      status: customer.status || 'active',
    });
    setFormErrors({});
    // TenantSelect will handle selected option rendering; we just set tenant_id value.
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    // Only require tenant selection for super admins. For normal users use their tenant implicitly.
    if (isSuperAdmin && (!formData.tenant_id || !String(formData.tenant_id).trim())) errors.tenant_id = 'Tenant is required';
    if (!formData.name || !formData.name.trim()) errors.name = 'Customer name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const submitData: any = {
        // tenant_id handled below (super admin vs normal user)
        name: formData.name,
        company_name: formData.company_name,
        contact_person: formData.contact_person,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        type: formData.type,
        notes: formData.notes,
        credit_limit: formData.credit_limit || 0,
        status: formData.status,
      };

      const tenantId = isSuperAdmin ? formData.tenant_id : authUser?.tenant_id;
      if (tenantId) submitData.tenant_id = String(tenantId);

      if (isEditing && currentCustomer) {
        await customerService.updateCustomer(currentCustomer.id, submitData);
        notify.success('Customer updated successfully');
      } else {
        await customerService.storeCustomer(submitData);
        notify.success('Customer created successfully');
      }

      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (axiosError.response?.data?.errors) {
        const transformed: { [key: string]: string } = {};
        Object.entries(axiosError.response.data.errors).forEach(([key, msgs]) => {
          transformed[key] = Array.isArray(msgs) ? msgs.join(', ') : (msgs as any);
        });
        setFormErrors(transformed);
      } else {
        notify.error(axiosError.response?.data?.message || 'Failed to save customer');
      }
    }
  };

  const handleDelete = async (customer: Customer) => {
    const result = await confirm({
      title: 'Delete Customer',
      html: `Are you sure you want to delete customer <strong>${customer.name}</strong>?`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });

    if (!result.isConfirmed) return;

    try {
      await customerService.deleteCustomer(customer.id);
      notify.success('Customer deleted successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      notify.error(axiosError.response?.data?.message || 'Failed to delete customer');
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
    setBulkTenantId(selectedTenantId || (isSuperAdmin ? '' : (authUser?.tenant_id ? String(authUser.tenant_id) : '')));
  };

  const handleDownloadSampleExcel = async () => {
    try {
      await customerService.downloadCustomerSampleExcel(isSuperAdmin ? selectedTenantId || undefined : undefined);
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

      const result = await customerService.customerBulkImport(selectedFile, tenantId ? String(tenantId) : undefined);

      setBulkOutcome({
        message: result.message,
        stats: result.data?.stats ?? null,
        errors: result.data?.errors ?? [],
      });
      notify.success(result.message);
      setRefreshKey(prev => prev + 1);
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
        setBulkErrors(Object.fromEntries(Object.entries(payload.errors as Record<string, string[]>).map(([k, v]) => [k, v.join(', ')])));
        notify.error(message);
      } else {
        setBulkOutcome({ message, stats: null, errors: [] });
      }
    } finally {
      setUploading(false);
    }
  };

  const openStatement = async (customer: Customer) => {    try {
      setStatementLoading(true);
      setStatementTarget(customer);
      setShowStatement(true);
      const data = await customerService.getCustomerStatement(customer.id);
      setStatementData(data);
      setPayAmount('');
      setPayMethod('cash');
      setPayNotes('');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      notify.error(axiosError.response?.data?.message || 'Failed to load statement');
      setShowStatement(false);
      setStatementTarget(null);
    } finally {
      setStatementLoading(false);
    }
  };

  const recordPayment = async () => {
    if (!statementTarget) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      notify.error('Amount must be greater than 0');
      return;
    }
    try {
      setRecordingPayment(true);
      await customerService.recordCustomerPayment(statementTarget.id, {
        amount,
        payment_method: payMethod,
        notes: payNotes || undefined,
      });
      notify.success('Customer payment recorded successfully');
      const data = await customerService.getCustomerStatement(statementTarget.id);
      setStatementData(data);
      setPayAmount('');
      setPayNotes('');
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      notify.error(axiosError.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const columns: ColumnDef<Customer>[] = [];

  // Serial column
  columns.push({
    id: 'serial',
    header: 'SL',
    cell: ({ row, table }) => (
      <span className="text-gray-600 dark:text-gray-400">
        {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1}
      </span>
    ),
  });

  // Tenant column - only visible to super admins
  if (isSuperAdmin) {
    columns.push({
      id: 'tenant',
      header: 'Tenant',
      cell: ({ row }) => (
        <span className="text-sm">
          {(row.original as any).tenant?.business_name || (row.original as any).tenant?.name || row.original.tenant_id}
        </span>
      ),
    });
  }

  // Name column
  columns.push({
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-gray-900 dark:text-gray-100">{row.original.name}</div>
        {row.original.company_name && (
          <div className="text-xs text-gray-500">{row.original.company_name}</div>
        )}
      </div>
    ),
  });
  // Contact column
  columns.push({
    id: 'contact',
    header: 'Contact',
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.phone && <div className="text-gray-600">{row.original.phone}</div>}
        {row.original.email && <div className="text-xs text-gray-500">{row.original.email}</div>}
        {!row.original.phone && !row.original.email && <span className="text-gray-400">-</span>}
      </div>
    ),
  });

  // Balance column
  columns.push({
    id: 'balance',
    header: 'Balance',
    cell: ({ row }) => (
      <span className="text-sm font-medium">{fmtMoney(row.original.current_balance ?? 0)}</span>
    ),
  });

  columns.push({
    id: 'outstanding',
    header: 'Outstanding',
    cell: ({ row }) => {
      const outstanding = Number(row.original.outstanding_balance ?? 0);
      return (
        <span className={`text-sm font-semibold ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
          {fmtMoney(outstanding)}
        </span>
      );
    },
  });

  columns.push({
    id: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = String(row.original.type || '').toLowerCase();
      const typeStyle: Record<string, string> = {
        own: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
        retail: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
        wholesale: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
        corporate: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
        dealer: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
      };

      if (!type) {
        return <span className="text-xs text-gray-500 dark:text-gray-400">-</span>;
      }

      return (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize ${typeStyle[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
          {type}
        </span>
      );
    },
  });

  // Status column
  columns.push({
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className={`px-2 py-1 text-xs rounded-full ${row.original.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {row.original.status || '-'}
      </span>
    ),
  });

  // Actions column
  columns.push({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <button
          onClick={() => openStatement(row.original)}
          className="p-1 text-blue-600 hover:text-blue-800 cursor-pointer"
          title="Statement"
         aria-label="Statement">
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleEditCustomer(row.original)}
          className="p-1 text-green-600 hover:text-green-800 cursor-pointer"
          title="Edit"
         aria-label="Edit">
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleDelete(row.original)}
          className="p-1 text-red-600 hover:text-red-800 cursor-pointer"
          title="Delete"
         aria-label="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ),
  });

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
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {showForm ? (isEditing ? 'Edit Customer' : 'Add Customer') : 'Customer'}
          </h1>
        </div>
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
          {hasPermission('create-customer') && (
            <>
              <button
                onClick={handleDownloadSampleExcel}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
                title="Download the two-column customer template"
              >
                <ImDownload className="w-4 h-4" />
                Customer Sample (Excel)
              </button>
              <button
                onClick={() => (showBulkUpload ? closeBulkUpload() : openBulkUpload())}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
                aria-expanded={showBulkUpload}
              >
                <RiFileExcel2Line className="w-4 h-4" />
                Customer Upload (Bulk)
              </button>
            </>
          )}
          {hasPermission('create-customer') && (
            <button
              onClick={handleAddCustomer}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          )}
        </div>
      </div>

      {/* Bulk Customer Upload */}
      {showBulkUpload && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bulk Customer Upload</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                The file needs exactly two columns —{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">Name</span> and{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">Mobile No</span>. Download the
                sample first if you are unsure of the layout.
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
                {bulkErrors.tenant_id && (
                  <p className="mt-1 text-xs text-red-500">{bulkErrors.tenant_id}</p>
                )}
              </div>
            )}

            {/* File Upload Field */}
            <div className="w-1/3 min-w-[260px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select File <span className="text-red-500">*</span>
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!uploading) setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
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
                      onClick={(e) => {
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
                    <div className="text-xs text-gray-500 mt-0.5">
                      .xls, .xlsx, .csv — max 10MB
                    </div>
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

      {/* Add/Edit Customer Form */}
      {showForm && (
        <div className="space-y-3">
          <form onSubmit={handleFormSubmit} className="space-y-3" autoComplete="off">
            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h3>

              {isSuperAdmin && (
                <div className="mb-2">
                  <FormRow label="Tenant" required labelWidth="w-32" error={formErrors.tenant_id}>
                    <TenantSelect
                      value={formData.tenant_id}
                      onChange={(tid) => {
                        setFormData({ ...formData, tenant_id: tid || '' });
                        if (tid && formErrors.tenant_id) {
                          setFormErrors(prev => {
                            const next = { ...prev };
                            delete next.tenant_id;
                            return next;
                          });
                        }
                      }}
                      placeholder="Select tenant"
                      isInvalid={!!formErrors.tenant_id}
                      compact
                    />
                  </FormRow>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <FormRow label="Customer Name" required labelWidth="w-32" error={formErrors.name}>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={formData.name}
                    onChange={e => {
                      setFormData({ ...formData, name: e.target.value });
                      if (e.target.value.trim() && formErrors.name) {
                        setFormErrors(prev => {
                          const next = { ...prev };
                          delete next.name;
                          return next;
                        });
                      }
                    }}
                    className={inputCls(!!formErrors.name)}
                  />
                </FormRow>

                <FormRow label="Phone" required labelWidth="w-32" error={formErrors.phone}>
                  <input
                    type="text"
                    placeholder="+880 1..."
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className={inputCls(!!formErrors.phone)}
                  />
                </FormRow>

                <FormRow label="Email" labelWidth="w-32" error={formErrors.email}>
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.email}
                    onChange={e => {
                      setFormData({ ...formData, email: e.target.value });
                      if (e.target.value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value) && formErrors.email) {
                        setFormErrors(prev => {
                          const next = { ...prev };
                          delete next.email;
                          return next;
                        });
                      }
                    }}
                    className={inputCls(!!formErrors.email)}
                  />
                </FormRow>

                <FormRow label="Contact Person" labelWidth="w-32">
                  <input
                    type="text"
                    placeholder="Contact person name"
                    value={formData.contact_person}
                    onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Company" labelWidth="w-32">
                  <input
                    type="text"
                    placeholder="Company Ltd"
                    value={formData.company_name}
                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Type" labelWidth="w-32" fieldWidth="w-40" error={formErrors.type}>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className={inputCls(!!formErrors.type)}
                  >
                    <option value="own">Own</option>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="corporate">Corporate</option>
                    <option value="dealer">Dealer</option>
                  </select>
                </FormRow>

                <FormRow label="Status" labelWidth="w-32" fieldWidth="w-40" error={formErrors.status}>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className={inputCls(!!formErrors.status)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blacklisted">Blacklisted</option>
                  </select>
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
                    placeholder="Dhaka"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="State/Province" labelWidth="w-32">
                  <input
                    type="text"
                    placeholder="Dhaka Division"
                    value={formData.state}
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Country" labelWidth="w-32">
                  <input
                    type="text"
                    placeholder="Bangladesh"
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Address" labelWidth="w-32" error={formErrors.address}>
                  <textarea
                    placeholder="Street address, building, floor"
                    rows={2}
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className={inputCls(!!formErrors.address)}
                  />
                </FormRow>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <FormRow label="Credit Limit" labelWidth="w-32" fieldWidth="w-40" error={formErrors.credit_limit}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.credit_limit}
                    onChange={e => setFormData({ ...formData, credit_limit: e.target.value })}
                    className={inputCls(!!formErrors.credit_limit)}
                  />
                </FormRow>

                <FormRow label="Notes" labelWidth="w-32" error={formErrors.notes}>
                  <textarea
                    placeholder="Optional notes"
                    rows={2}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className={inputCls(!!formErrors.notes)}
                  />
                </FormRow>
              </div>
            </div>

            {/* Form Actions */}
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded"
              >
                <GiSave className="w-3.5 h-3.5" />
                {isEditing ? 'Update Customer' : 'Create Customer'}
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint="customers"
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by customer name, phone, email..."
        filterParams={filterParams}
      />

      {showStatement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-linear-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Customer Statement</h3>
                <p className="text-sm opacity-80">{statementData?.customer?.name || statementTarget?.name || '-'}</p>
              </div>
              <button
                onClick={() => {
                  setShowStatement(false);
                  setStatementData(null);
                  setStatementTarget(null);
                }}
                className="p-1 rounded-full hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {statementLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <Spinner size="md" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-700/60 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Credit Limit</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{fmtMoney(statementData?.customer?.credit_limit ?? 0)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                      <p className="text-xs text-blue-500">Current Balance</p>
                      <p className="font-semibold text-blue-700 dark:text-blue-200">{fmtMoney(statementData?.customer?.current_balance ?? 0)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3">
                      <p className="text-xs text-red-500">Outstanding</p>
                      <p className="font-bold text-red-700 dark:text-red-200 text-lg">{fmtMoney(statementData?.summary?.total_outstanding ?? 0)}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-700/70">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Invoice</th>
                          <th className="px-3 py-2 text-left font-semibold">Date</th>
                          <th className="px-3 py-2 text-right font-semibold">Total</th>
                          <th className="px-3 py-2 text-right font-semibold">Returned</th>
                          <th className="px-3 py-2 text-right font-semibold">Paid</th>
                          <th className="px-3 py-2 text-right font-semibold">Due</th>
                          <th className="px-3 py-2 text-center font-semibold">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {(statementData?.orders?.data ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-gray-400">No orders found</td>
                          </tr>
                        ) : (
                          (statementData?.orders?.data ?? []).map((o) => (
                            <tr key={o.id} className="bg-white dark:bg-gray-800">
                              <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-200">{o.invoice_number || '-'}</td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-300">{fmtDate(o.order_date)}</td>
                              <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">{fmtMoney(o.grand_total ?? 0)}</td>
                              <td className="px-3 py-2 text-right text-orange-600">{fmtMoney(o.returned_amount ?? 0)}</td>
                              <td className="px-3 py-2 text-right text-emerald-600">{fmtMoney(o.paid_amount ?? 0)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-red-600">{fmtMoney(o.due_amount ?? 0)}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${String(o.payment_status) === 'paid'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : String(o.payment_status) === 'partial'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                  {o.payment_status || '-'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {Number(statementData?.summary?.total_outstanding ?? 0) > 0 && (
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-900/20 p-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Record Customer Payment</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="Amount"
                          className="w-full px-2 py-1.5 text-sm border rounded-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="bkash">bKash</option>
                          <option value="nagad">Nagad</option>
                          <option value="rocket">Rocket</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="check">Check</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          type="text"
                          value={payNotes}
                          onChange={(e) => setPayNotes(e.target.value)}
                          placeholder="Notes (optional)"
                          className="w-full px-2 py-1.5 text-sm border rounded-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 md:col-span-2"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={recordPayment}
                          disabled={recordingPayment}
                          className="px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-sm font-medium"
                        >
                          {recordingPayment ? 'Recording...' : 'Record Payment'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
