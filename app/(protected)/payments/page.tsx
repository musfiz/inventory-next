'use client';

import { useEffect, useState } from 'react';
import { CreditCard, FileText, Filter, X } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { paymentService } from '@/services';
import type { Payment, PaymentMethod, PaymentStatus } from '@/types/api.types';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import TenantSelect from '@/components/ui/tenant-select';
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
  if (!d) return '-';
  return new Date(d).toLocaleString();
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

  // Filters
  const [tenantId,    setTenantId]    = useState('');
  const [methodOpt,   setMethodOpt]   = useState<any>(null);
  const [statusOpt,   setStatusOpt]   = useState<any>(null);
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [refreshKey,  setRefreshKey]  = useState(0);

  // Build the API endpoint with current filter state
  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    if (isSuperAdmin && tenantId) params.set('tenant_id', tenantId);
    if (methodOpt?.value) params.set('payment_method', methodOpt.value);
    if (statusOpt?.value) params.set('status', statusOpt.value);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo)   params.set('date_to',   dateTo);
    const qs = params.toString();
    return `/payments${qs ? `?${qs}` : ''}`;
  };

  const clearFilters = () => {
    setTenantId('');
    setMethodOpt(null);
    setStatusOpt(null);
    setDateFrom('');
    setDateTo('');
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
      id: 'reference', header: 'Reference',
      cell: ({ row }) => {
        const p = row.original;
        if (p.salesOrder?.invoice_number) {
          return <span className="text-xs font-mono">{p.salesOrder.invoice_number}</span>;
        }
        if (p.posOrder?.invoice_number) {
          return <span className="text-xs font-mono">{p.posOrder.invoice_number}</span>;
        }
        if (p.posOrder?.order_number) {
          return <span className="text-xs font-mono">{p.posOrder.order_number}</span>;
        }
        if (p.sales_order_id) return <span className="text-xs">#{p.sales_order_id}</span>;
        if (p.pos_order_id)   return <span className="text-xs">#{p.pos_order_id}</span>;
        return <span className="text-xs text-gray-400">-</span>;
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
    (isSuperAdmin && !!tenantId) ||
    !!methodOpt?.value ||
    !!statusOpt?.value ||
    !!dateFrom ||
    !!dateTo;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Payments List
        </h1>
      </div>

      {/* Filters card */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Filters
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              title="Clear all filters"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Tenant (super admin only) */}
          {isSuperAdmin && (
            <div>
              <label className={labelCls}>Tenant</label>
              <TenantSelect
                value={tenantId}
                onChange={(tid) => { setTenantId(tid || ''); setRefreshKey(k => k + 1); }}
                placeholder="All Tenants"
                isInvalid={false}
              />
            </div>
          )}

          {/* Payment method */}
          <div>
            <label className={labelCls}>Method</label>
            <CustomSelect
              value={methodOpt}
              onChange={(opt) => { setMethodOpt(opt); setRefreshKey(k => k + 1); }}
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
              onChange={(opt) => { setStatusOpt(opt); setRefreshKey(k => k + 1); }}
              defaultOptions={[{ value: '', label: 'All Statuses' } as any, ...PAYMENT_STATUSES]}
              placeholder="All Statuses"
              className="text-sm"
            />
          </div>

          {/* Date from */}
          <div>
            <label className={labelCls}>From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setRefreshKey(k => k + 1); }}
              className={inputCls}
            />
          </div>

          {/* Date to */}
          <div>
            <label className={labelCls}>To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setRefreshKey(k => k + 1); }}
              className={inputCls}
            />
          </div>
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
