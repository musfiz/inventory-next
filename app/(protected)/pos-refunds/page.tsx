'use client';

import { useEffect, useState } from 'react';
import { Plus, X, CheckCircle, Check } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import { posRefundService, commonService, userService } from '@/services';
import type { PosRefund } from '@/services/posRefundService';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import DateTimePicker from '@/components/ui/date-time-picker';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import apiClient from '@/lib/api/axios';

// ─── Constants ────────────────────────────────────────────────────────────────

const REFUND_REASONS = [
  { value: 'return',                   label: 'Return' },
  { value: 'damaged',                  label: 'Damaged' },
  { value: 'wrong_item',               label: 'Wrong Item' },
  { value: 'customer_dissatisfaction', label: 'Customer Dissatisfaction' },
  { value: 'expired',                  label: 'Expired' },
  { value: 'exchange',                 label: 'Exchange' },
  { value: 'other',                    label: 'Other' },
];

const REFUND_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'card',          label: 'Card' },
  { value: 'bkash',         label: 'bKash' },
  { value: 'nagad',         label: 'Nagad' },
  { value: 'rocket',        label: 'Rocket' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'store_credit',  label: 'Store Credit' },
  { value: 'exchange',      label: 'Exchange' },
];

const STATUSES = [
  { value: 'pending',   label: 'Pending' },
  { value: 'approved',  label: 'Approved' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected',  label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status?: string) {
  const map: Record<string, string> = {
    pending:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    approved:  'bg-blue-100   text-blue-800   dark:bg-blue-900   dark:text-blue-200',
    completed: 'bg-green-100  text-green-800  dark:bg-green-900  dark:text-green-200',
    rejected:  'bg-red-100    text-red-800    dark:bg-red-900    dark:text-red-200',
    cancelled: 'bg-gray-100   text-gray-700   dark:bg-gray-700   dark:text-gray-300',
  };
  const cls = map[status ?? ''] ?? 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${cls}`}>{status ?? '-'}</span>;
}

function fmtDate(d?: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleString();
}

function fmtNum(n?: string | number | null) {
  if (n === null || n === undefined || n === '') return '-';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function reasonLabel(v?: string) {
  return REFUND_REASONS.find(r => r.value === v)?.label ?? v ?? '-';
}

function methodLabel(v?: string) {
  return REFUND_METHODS.find(r => r.value === v)?.label ?? v ?? '-';
}

// ─── Form type ────────────────────────────────────────────────────────────────

interface RefundForm {
  id: string;
  tenant_id: string;
  original_order_id: string;
  refund_order_id: string;
  refund_number: string;
  refund_date: string;
  refund_reason: string;
  reason_details: string;
  total_refund_amount: string;
  refund_method: string;
  status: string;
  approved_by: string;
  approved_at: string;
  completed_at: string;
}

const emptyForm = (): RefundForm => ({
  id: '', tenant_id: '', original_order_id: '', refund_order_id: '',
  refund_number: '', refund_date: '',
  refund_reason: 'return', reason_details: '',
  total_refund_amount: '', refund_method: 'cash', status: 'pending',
  approved_by: '', approved_at: '', completed_at: '',
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PosRefundsPage() {
  const { isSuperAdmin, hasPermission, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!hasPermission('view-pos-refund')) router.replace('/dashboard');
  }, [isHydrated, hasPermission, router]);

  const authUser = useAuthStore(s => s.user);

  const [showForm, setShowForm]     = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  const [form, setForm]                               = useState<RefundForm>(emptyForm());
  const [selectedTenant, setSelectedTenant]           = useState<any>(null);
  const [selectedOrder, setSelectedOrder]             = useState<any>(null);
  const [selectedRefundOrder, setSelectedRefundOrder] = useState<any>(null);
  const [selectedApprovedBy, setSelectedApprovedBy]   = useState<any>(null);
  const [defaultOrderOptions, setDefaultOrderOptions] = useState<any[]>([]);

  const sf = (field: keyof RefundForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  // ── Dropdown loaders ──────────────────────────────────────────────────────

  const loadTenantOptions = async (input: string) => {
    if (!isSuperAdmin) return [];
    const list = await commonService.getTenantsForDropdown({ search: input }).catch(() => []);
    return (list || []).map((t: any) => ({ value: t.id, label: t.business_name }));
  };

  const loadOrderOptions = async (input: string) => {
    try {
      const res = await apiClient.get('/api/v1/pos/orders', { params: { search: input, per_page: 20 } });
      const items = res.data?.data?.data ?? res.data?.data ?? [];
      return items.map((o: any) => ({ value: o.id, label: o.order_number || `#${o.id}` }));
    } catch {
      return [];
    }
  };

  const loadUserOptions = async (input: string) => {
    try {
      const res = await userService.getUsers({ search: input, per_page: 20 });
      return (res.users || []).map((u: any) => ({ value: u.id, label: u.name || u.email }));
    } catch {
      return [];
    }
  };

  useEffect(() => {
    loadOrderOptions('').then(setDefaultOrderOptions).catch(() => {});
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (isSuperAdmin && !form.id && !form.tenant_id) errs.tenant_id = 'Tenant is required';
    if (!form.original_order_id) errs.original_order_id = 'Original order is required';
    if (!form.refund_reason)     errs.refund_reason      = 'Refund reason is required';
    if (!form.total_refund_amount || Number(form.total_refund_amount) < 0)
                                 errs.total_refund_amount = 'Refund amount must be ≥ 0';
    if (!form.refund_method)     errs.refund_method       = 'Refund method is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAdd = () => {
    setForm({ ...emptyForm(), tenant_id: isSuperAdmin ? '' : (authUser?.tenant_id ?? '') });
    setSelectedTenant(null);
    setSelectedOrder(null);
    setSelectedRefundOrder(null);
    setSelectedApprovedBy(null);
    setErrors({});
    setShowForm(true);
  };

  const handleEdit = (refund: PosRefund) => {
    setForm({
      id:                   String(refund.id),
      tenant_id:            String(refund.tenant_id           ?? ''),
      original_order_id:    String(refund.original_order_id   ?? ''),
      refund_order_id:      String(refund.refund_order_id     ?? ''),
      refund_number:        String(refund.refund_number        ?? ''),
      refund_date:          refund.refund_date  ? new Date(refund.refund_date).toISOString().slice(0, 16)  : '',
      refund_reason:        String(refund.refund_reason        ?? 'return'),
      reason_details:       String(refund.reason_details       ?? ''),
      total_refund_amount:  String(refund.total_refund_amount  ?? ''),
      refund_method:        String(refund.refund_method        ?? 'cash'),
      status:               String(refund.status               ?? 'pending'),
      approved_by:          String(refund.approved_by          ?? ''),
      approved_at:          refund.approved_at  ? new Date(refund.approved_at).toISOString().slice(0, 16)  : '',
      completed_at:         refund.completed_at ? new Date(refund.completed_at).toISOString().slice(0, 16) : '',
    });
    setSelectedTenant(null);
    setSelectedOrder(refund.original_order
      ? { value: refund.original_order.id, label: refund.original_order.order_number }
      : null);
    setSelectedRefundOrder(refund.refund_order
      ? { value: refund.refund_order.id, label: refund.refund_order.order_number }
      : null);
    setSelectedApprovedBy((refund as any).approved_by_user
      ? { value: (refund as any).approved_by_user.id, label: (refund as any).approved_by_user.name }
      : null);
    setErrors({});
    setShowForm(true);
  };

  const handleCancel = () => { setShowForm(false); setErrors({}); };

  const handleError = (err: any) => {
    const msg = err?.response?.data?.message || err?.response?.data?.errors;
    if (typeof msg === 'object') {
      const flat: Record<string, string> = {};
      Object.entries(msg).forEach(([k, v]) => { flat[k] = Array.isArray(v) ? v[0] as string : String(v); });
      setErrors(flat);
    } else {
      notify.error(String(msg || 'An error occurred'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        tenant_id:           form.tenant_id          || undefined,
        original_order_id:   form.original_order_id  || undefined,
        refund_order_id:     form.refund_order_id     || undefined,
        refund_number:       form.refund_number       || undefined,
        refund_date:         form.refund_date         || undefined,
        refund_reason:       form.refund_reason,
        reason_details:      form.reason_details      || undefined,
        total_refund_amount: Number(form.total_refund_amount),
        refund_method:       form.refund_method,
        status:              form.status,
        approved_by:         form.approved_by         || undefined,
        approved_at:         form.approved_at         || undefined,
        completed_at:        form.completed_at        || undefined,
      };
      if (form.id) payload.id = form.id;
      await posRefundService.store(payload);
      notify.success(form.id ? 'Refund updated successfully' : 'Refund created successfully');
      setShowForm(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) { handleError(err); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (refund: PosRefund) => {
    const result = await confirm({
      title: 'Approve Refund',
      html: `Approve refund <strong>${refund.refund_number}</strong>?`,
      confirmButtonText: 'Approve', cancelButtonText: 'Cancel', icon: 'question',
    });
    if (!result.isConfirmed) return;
    try {
      await posRefundService.approve(refund.id);
      notify.success('Refund approved');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to approve');
    }
  };

  const handleComplete = async (refund: PosRefund) => {
    const result = await confirm({
      title: 'Complete Refund',
      html: `Mark refund <strong>${refund.refund_number}</strong> as completed?`,
      confirmButtonText: 'Complete', cancelButtonText: 'Cancel', icon: 'question',
    });
    if (!result.isConfirmed) return;
    try {
      await posRefundService.complete(refund.id);
      notify.success('Refund completed');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to complete');
    }
  };

  const handleDelete = async (refund: PosRefund) => {
    const result = await confirm({
      title: 'Delete Refund',
      html: `Delete refund <strong>${refund.refund_number}</strong>? This cannot be undone.`,
      confirmButtonText: 'Delete', cancelButtonText: 'Cancel', icon: 'warning',
    });
    if (!result.isConfirmed) return;
    try {
      await posRefundService.destroy(refund.id);
      notify.success('Refund deleted');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to delete');
    }
  };

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: ColumnDef<PosRefund>[] = [
    {
      id: 'serial', header: 'SL',
      cell: ({ row, table }) => table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1,
    },
    {
      accessorKey: 'refund_number', header: 'Refund #',
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.refund_number ?? '-'}</span>,
    },
    {
      accessorKey: 'original_order_id', header: 'Original Order',
      cell: ({ row }) => <span className="text-xs">{(row.original as any).original_order?.order_number ?? row.original.original_order_id ?? '-'}</span>,
    },
    {
      accessorKey: 'refund_order_id', header: 'Refund Order',
      cell: ({ row }) => <span className="text-xs">{(row.original as any).refund_order?.order_number ?? (row.original.refund_order_id ? `#${row.original.refund_order_id}` : '-')}</span>,
    },
    {
      accessorKey: 'refund_date', header: 'Refund Date',
      cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.refund_date)}</span>,
    },
    {
      accessorKey: 'refund_reason', header: 'Reason',
      cell: ({ row }) => <span className="text-xs">{reasonLabel(row.original.refund_reason)}</span>,
    },
    {
      accessorKey: 'total_refund_amount', header: 'Amount',
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{fmtNum(row.original.total_refund_amount)}</span>,
    },
    {
      accessorKey: 'refund_method', header: 'Method',
      cell: ({ row }) => <span className="text-xs">{methodLabel(row.original.refund_method)}</span>,
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      accessorKey: 'approved_by', header: 'Approved By',
      cell: ({ row }) => <span className="text-xs">{(row.original as any).approved_by_user?.name ?? '-'}</span>,
    },
    {
      accessorKey: 'approved_at', header: 'Approved At',
      cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.approved_at)}</span>,
    },
    {
      accessorKey: 'completed_at', header: 'Completed At',
      cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.completed_at)}</span>,
    },
    {
      accessorKey: 'created_by', header: 'Created By',
      cell: ({ row }) => <span className="text-xs">{(row.original as any).created_by_user?.name ?? '-'}</span>,
    },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center gap-1">
            {r.status === 'pending' && (
              <button onClick={() => handleApprove(r)} title="Approve" className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer">
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            {r.status === 'approved' && (
              <button onClick={() => handleComplete(r)} title="Mark Complete" className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 cursor-pointer">
                <Check className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => handleEdit(r)} title="Edit" className="p-1 rounded text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={() => handleDelete(r)} title="Delete" className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  // ── Shared styles ─────────────────────────────────────────────────────────

  const inputCls   = 'w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100';
  const labelCls   = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5';
  const errCls     = 'text-xs text-red-500 mt-0.5';
  const sectionCls = 'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600 pb-1 mb-2 mt-3';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">POS Refunds</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Refund
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {form.id ? `Edit Refund — ${form.refund_number}` : 'Add New Refund'}
            </h2>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">

            {/* ── Basic Info ── */}
            <p className={sectionCls}>Basic Info</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {isSuperAdmin && !form.id && (
                <div>
                  <label className={labelCls}>Tenant <span className="text-red-500">*</span></label>
                  <CustomSelect
                    value={selectedTenant}
                    onChange={opt => { setSelectedTenant(opt); setForm(f => ({ ...f, tenant_id: opt?.value ?? '' })); }}
                    loadOptions={loadTenantOptions}
                    placeholder="Select tenant"
                    className="text-sm"
                  />
                  {errors.tenant_id && <p className={errCls}>{errors.tenant_id}</p>}
                </div>
              )}

              <div>
                <label className={labelCls}>Original Order <span className="text-red-500">*</span></label>
                <CustomSelect
                  value={selectedOrder}
                  onChange={opt => { setSelectedOrder(opt); setForm(f => ({ ...f, original_order_id: opt?.value ?? '' })); }}
                  loadOptions={loadOrderOptions}
                  defaultOptions={defaultOrderOptions}
                  placeholder="Select POS order"
                  className="text-sm"
                />
                {errors.original_order_id && <p className={errCls}>{errors.original_order_id}</p>}
              </div>

              <div>
                <label className={labelCls}>Refund Order <span className="text-gray-400 text-xs">(optional)</span></label>
                <CustomSelect
                  value={selectedRefundOrder}
                  onChange={opt => { setSelectedRefundOrder(opt); setForm(f => ({ ...f, refund_order_id: opt?.value ?? '' })); }}
                  loadOptions={loadOrderOptions}
                  defaultOptions={defaultOrderOptions}
                  placeholder="Linked refund order"
                  className="text-sm"
                />
              </div>

              <div>
                <label className={labelCls}>Refund #</label>
                <input type="text" value={form.refund_number} onChange={sf('refund_number')} placeholder="Auto-generated if blank" className={inputCls} />
              </div>
            </div>

            {/* ── Refund Details ── */}
            <p className={sectionCls}>Refund Details</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label className={labelCls}>Refund Date</label>
                <DateTimePicker value={form.refund_date} onChange={v => setForm(f => ({ ...f, refund_date: v }))} placeholder="Select refund date" />
              </div>

              <div>
                <label className={labelCls}>Refund Reason <span className="text-red-500">*</span></label>
                <select value={form.refund_reason} onChange={sf('refund_reason')} className={inputCls}>
                  {REFUND_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {errors.refund_reason && <p className={errCls}>{errors.refund_reason}</p>}
              </div>

              <div>
                <label className={labelCls}>Refund Method <span className="text-red-500">*</span></label>
                <select value={form.refund_method} onChange={sf('refund_method')} className={inputCls}>
                  {REFUND_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                {errors.refund_method && <p className={errCls}>{errors.refund_method}</p>}
              </div>

              <div>
                <label className={labelCls}>Total Refund Amount <span className="text-red-500">*</span></label>
                <input type="number" step="0.01" min="0" value={form.total_refund_amount} onChange={sf('total_refund_amount')} className={inputCls} placeholder="0.00" />
                {errors.total_refund_amount && <p className={errCls}>{errors.total_refund_amount}</p>}
              </div>
            </div>

            <div>
              <label className={labelCls}>Reason Details</label>
              <textarea rows={2} value={form.reason_details} onChange={sf('reason_details')} className={inputCls} placeholder="Additional details about the reason for refund..." />
            </div>

            {/* ── Status & Approval ── */}
            <p className={sectionCls}>Status & Approval</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label className={labelCls}>Status</label>
                <select value={form.status} onChange={sf('status')} className={inputCls}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Approved By</label>
                <CustomSelect
                  value={selectedApprovedBy}
                  onChange={opt => { setSelectedApprovedBy(opt); setForm(f => ({ ...f, approved_by: opt?.value ?? '' })); }}
                  loadOptions={loadUserOptions}
                  placeholder="Select user"
                  className="text-sm"
                />
              </div>

              <div>
                <label className={labelCls}>Approved At</label>
                <DateTimePicker value={form.approved_at} onChange={v => setForm(f => ({ ...f, approved_at: v }))} placeholder="Select approved date" />
              </div>

              <div>
                <label className={labelCls}>Completed At</label>
                <DateTimePicker value={form.completed_at} onChange={v => setForm(f => ({ ...f, completed_at: v }))} placeholder="Select completed date" />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Saving…' : form.id ? 'Update Refund' : 'Save Refund'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-1.5 bg-gray-500 text-white text-sm font-medium rounded-sm hover:bg-gray-600 transition-colors cursor-pointer"
              >
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
        apiEndpoint="pos/refunds"
        pageSize={15}
        enableSearch
        searchPlaceholder="Search refunds…"
      />
    </div>
  );
}
