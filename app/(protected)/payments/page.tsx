'use client';

import { useEffect, useState } from 'react';
import { CreditCard, FileText, Filter, Search, X } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { paymentService } from '@/services';
import type {
  Payment,
  PaymentMethod,
  PaymentReferenceType,
  PaymentStatus,
} from '@/types/api.types';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import TenantSelect from '@/components/ui/tenant-select';
import CustomDatePicker from '@/components/ui/date-picker';
import { formatDate } from '@/lib/utils/date';
import { usePermissions } from '@/hooks/use-permissions';
import { useRouter } from 'next/navigation';
import { PrintMenu } from '@/components/invoices/pay-receipt/PrintMenu';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash',         label: 'Cash' },
  { value: 'card',         label: 'Card' },
  { value: 'bkash',        label: 'bKash' },
  { value: 'nagad',        label: 'Nagad' },
  { value: 'rocket',       label: 'Rocket' },
  { value: 'bank_transfer',label: 'Bank Transfer' },
  { value: 'check',        label: 'Check' },
  { value: 'credit',       label: 'Credit' },
  { value: 'other',        label: 'Other' },
];

const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: 'pending',   label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed',    label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded',  label: 'Refunded' },
];

const REFERENCE_TYPES: { value: PaymentReferenceType; label: string }[] = [
  { value: 'pos',      label: 'POS' },
  { value: 'sales',    label: 'Sales Order' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'expense',  label: 'Expense' },
  { value: 'refund',   label: 'Refund' },
  { value: 'other',    label: 'Other' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status?: string) {
  const map: Record<string, string> = {
    pending:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    completed: 'bg-green-100  text-green-800  dark:bg-green-900  dark:text-green-200',
    failed:    'bg-red-100    text-red-800    dark:bg-red-900    dark:text-red-200',
    cancelled: 'bg-gray-100   text-gray-700   dark:bg-gray-700   dark:text-gray-300',
    refunded:  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };
  const cls = map[status ?? ''] ?? 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${cls}`}>{status ?? '-'}</span>;
}

function fmtDate(d?: string | null) {
  // Render as DD/MM/YYYY — date only, no time. Matches the rest of
  // the inventory UI (sales-orders, etc.) and removes the
  // locale-dependent timestamp that the previous `toLocaleString()`
  // call produced.
  return formatDate(d, 'DD/MM/YYYY');
}

function fmtNum(n?: string | number | null) {
  if (n === null || n === undefined || n === '') return '-';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function methodLabel(v?: string) {
  return PAYMENT_METHODS.find(m => m.value === v)?.label ?? v ?? '-';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsListPage() {
  const { isSuperAdmin, hasPermission, isHydrated } = usePermissions();
  const router = useRouter();

  // Permission gate — mirrors pos-refunds/page.tsx line 94
  useEffect(() => {
    if (!isHydrated) return;
    if (!hasPermission('view-payment')) router.replace('/dashboard');
  }, [isHydrated, hasPermission, router]);

  // Filter draft — what the form controls are bound to. Changes do
  // NOT refetch until the user clicks Search.
  const [tenantId,          setTenantId]          = useState('');
  const [referenceTypeOpt, setReferenceTypeOpt]  = useState<any>(null);
  const [methodOpt,         setMethodOpt]         = useState<any>(null);
  const [statusOpt,         setStatusOpt]         = useState<any>(null);
  const [dateFrom,          setDateFrom]          = useState('');
  const [dateTo,            setDateTo]            = useState('');

  // Applied filters — what actually drives the API call. Updated only
  // when the user clicks Search.
  const [applied, setApplied] = useState({
    tenantId: '',
    referenceType: '',
    method: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Build the API endpoint from the *applied* filter set
  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    if (isSuperAdmin && applied.tenantId) params.set('tenant_id', applied.tenantId);
    if (applied.referenceType) params.set('reference_type', applied.referenceType);
    if (applied.method) params.set('payment_method', applied.method);
    if (applied.status) params.set('status', applied.status);
    if (applied.dateFrom) params.set('date_from', applied.dateFrom);
    if (applied.dateTo)   params.set('date_to',   applied.dateTo);
    const qs = params.toString();
    return `/payments${qs ? `?${qs}` : ''}`;
  };

  // Click handlers — copy the draft into applied and refetch
  const handleSearch = () => {
    setApplied({
      tenantId,
      referenceType: referenceTypeOpt?.value ?? '',
      method: methodOpt?.value ?? '',
      status: statusOpt?.value ?? '',
      dateFrom,
      dateTo,
    });
    setRefreshKey(k => k + 1);
  };

  const clearFilters = () => {
    setTenantId('');
    setReferenceTypeOpt(null);
    setMethodOpt(null);
    setStatusOpt(null);
    setDateFrom('');
    setDateTo('');
    setApplied({
      tenantId: '',
      referenceType: '',
      method: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    });
    setRefreshKey(k => k + 1);
  };

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: ColumnDef<Payment>[] = [
    {
      id: 'serial', header: 'SL',
      cell: ({ row, table }) =>
        table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1,
    },
    {
      accessorKey: 'receipt_number', header: 'Receipt #',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">{row.original.receipt_number ?? '-'}</span>
      ),
    },
    {
      accessorKey: 'payment_date', header: 'Payment Date',
      cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.payment_date)}</span>,
    },
    {
      accessorKey: 'reference_type', header: 'Reference Type',
      cell: ({ row }) => {
        const v = row.original.reference_type;
        const label = REFERENCE_TYPES.find(r => r.value === v)?.label ?? v ?? '-';
        return <span className="text-xs capitalize">{label}</span>;
      },
    },
    {
      accessorKey: 'payment_method', header: 'Method',
      cell: ({ row }) => <span className="text-xs">{methodLabel(row.original.payment_method)}</span>,
    },
    {
      accessorKey: 'total_amount', header: 'Amount',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">{fmtNum(row.original.total_amount)}</span>
      ),
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      accessorKey: 'created_by', header: 'Recorded By',
      cell: ({ row }) => <span className="text-xs">{row.original.creator?.name ?? '-'}</span>,
    },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => <PrintMenu payment={row.original} />,
    },
  ];

  // ── Styles ────────────────────────────────────────────────────────────────

  // Match the new tenant-registration / pos-refunds style: tight,
  // rounded-sm, indigo focus border.
  const inputCls =
    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 ' +
    'rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 ' +
    'dark:focus:border-indigo-400 transition-colors';
  const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2';

  const hasFilters =
    !!applied.tenantId ||
    !!applied.referenceType ||
    !!applied.method ||
    !!applied.status ||
    !!applied.dateFrom ||
    !!applied.dateTo;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Payments List
        </h1>
      </div>

      {/* Advanced Filter card */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Advanced Filter
          </p>
          {hasFilters && (
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wide">
              {Object.values(applied).filter(Boolean).length} active
            </span>
          )}
        </div>

        {/* Row 1 — Tenant (super admin only). Other roles skip this row. */}
        {isSuperAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className={labelCls}>Tenant</label>
              <TenantSelect
                value={tenantId}
                onChange={(tid) => setTenantId(tid || '')}
                placeholder="All Tenants"
                isInvalid={false}
              />
            </div>
          </div>
        )}

        {/* Row 2 — Reference Type + Method + Status + From + To + buttons */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          {/* Reference type — links to POS / Sales / etc. */}
          <div>
            <label className={labelCls}>Reference Type</label>
            <CustomSelect
              value={referenceTypeOpt}
              onChange={(opt) => setReferenceTypeOpt(opt)}
              defaultOptions={[{ value: '', label: 'All Types' } as any, ...REFERENCE_TYPES]}
              placeholder="All Types"
              className="text-sm"
            />
          </div>

          {/* Payment method */}
          <div>
            <label className={labelCls}>Method</label>
            <CustomSelect
              value={methodOpt}
              onChange={(opt) => setMethodOpt(opt)}
              defaultOptions={[{ value: '', label: 'All Methods' } as any, ...PAYMENT_METHODS]}
              placeholder="All Methods"
              className="text-sm"
            />
          </div>

          {/* Status */}
          <div>
            <label className={labelCls}>Status</label>
            <CustomSelect
              value={statusOpt}
              onChange={(opt) => setStatusOpt(opt)}
              defaultOptions={[{ value: '', label: 'All Statuses' } as any, ...PAYMENT_STATUSES]}
              placeholder="All Statuses"
              className="text-sm"
            />
          </div>

          {/* Date from */}
          <div>
            <label className={labelCls}>From</label>
            <CustomDatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="DD/MM/YYYY"
            />
          </div>

          {/* Date to + buttons */}
          <div>
            <label className={labelCls}>To</label>
            <CustomDatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="DD/MM/YYYY"
              minDate={dateFrom ? new Date(dateFrom + 'T00:00:00') : undefined}
            />
          </div>
        </div>

        {/* Buttons row */}
        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={clearFilters}
            title="Clear all filters"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-sm cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
          <button
            type="button"
            onClick={handleSearch}
            title="Apply filters"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-sm cursor-pointer transition-colors shadow-sm"
          >
            <Search className="w-3.5 h-3.5" /> Search
          </button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch
        searchPlaceholder="Search by receipt #, transaction id, invoice…"
      />

      {/* Helper note */}
      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 px-1">
        <FileText className="w-3.5 h-3.5" />
        Payments are recorded automatically by sales-order, sales-return settle,
        and POS flows. Use the printer icon to print a customer receipt.
      </div>
    </div>
  );
}
