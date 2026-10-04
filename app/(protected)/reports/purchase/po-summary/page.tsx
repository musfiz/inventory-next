'use client';

import { useState } from 'react';
import {
  FileBarChart,
  Coins,
  Wallet,
  PackageCheck,
  Truck,
  AlertTriangle,
  Award,
  Layers,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import commonService from '@/services/commonService';
import supplierService from '@/services/supplierService';
import { formatCurrency, formatDate, formatNumber, formatPercent, todayISO, firstDayOfMonthISO } from '@/lib/utils/format';
import { notify } from '@/lib/notifications';
import {
  ReportLayout,
  ReportFilters,
  FilterRow,
  FilterField,
  FilterCheckbox,
  filterInputClass,
  filterSelectClass,
  ReportSummaryCards,
  ReportTable,
  ReportExportBar,
  type ReportColumn,
  type SummaryCard,
} from '@/components/reports';
import { useServerReportExport } from '@/hooks/reports/use-server-report-export';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type {
  PoSummaryReport,
  PoSummaryRow,
  PurchaseOrderStatus,
  PurchasePaymentStatus,
} from '@/types/report.types';

/** Kept in step with App\Reports\Purchase\PurchaseOrderSummaryReport::STATUSES. */
const STATUSES: { value: PurchaseOrderStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'partial', label: 'Partially Received' },
  { value: 'received', label: 'Received' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  ordered: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  received: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const DELIVERY_BADGES: Record<string, string> = {
  late: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  on_track: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const PAYMENT_BADGES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function PoSummaryPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<PoSummaryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [supplier, setSupplier] = useState<SelectOption | null>(null);
  const [warehouse, setWarehouse] = useState<SelectOption | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<PurchasePaymentStatus | ''>('');
  const [lateOnly, setLateOnly] = useState(false);
  const [search, setSearch] = useState('');

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (supplier) params.supplier_id = supplier.value;
    if (warehouse) params.warehouse_id = warehouse.value;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (status) params.status = status;
    if (paymentStatus) params.payment_status = paymentStatus;
    if (search.trim()) params.search = search.trim();
    params.late_only = lateOnly ? 1 : 0;
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.poSummary(params as any);
      setData(res);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load report';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const generate = () => fetchReport(buildParams());

  /** Clicking an already-active status clears it, so the card toggles. */
  const applyStatus = (value: PurchaseOrderStatus) => {
    const next = status === value ? '' : value;
    setStatus(next);
    const params = buildParams();
    if (next === '') {
      delete params.status;
    } else {
      params.status = next;
    }
    fetchReport(params);
  };

  const reset = () => {
    setSelectedTenantId('');
    setSupplier(null);
    setWarehouse(null);
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setStatus('');
    setPaymentStatus('');
    setLateOnly(false);
    setSearch('');
    setData(null);
    setError(null);
  };

  const loadSuppliers = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const res = await supplierService.getSuppliers({
        search: inputValue,
        per_page: 25,
        ...(scopeTenantId ? { tenant_id: scopeTenantId } : {}),
      });
      const rows = res?.data?.data ?? res?.data ?? [];
      return (Array.isArray(rows) ? rows : []).map((s: any) => ({
        value: String(s.id),
        label: s.name,
      }));
    } catch {
      return [];
    }
  };

  const loadWarehouses = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const rows = await commonService.getWarehousesByTenant({ search: inputValue, tenant_id: scopeTenantId });
      return (rows || []).map((w: any) => ({ value: String(w.id), label: w.name }));
    } catch {
      return [];
    }
  };

  const summary = data?.summary;
  const statusByKey = (key: PurchaseOrderStatus) => summary?.count_by_status?.find((b) => b.key === key);

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Total PO Value',
          value: formatCurrency(summary.total_value),
          color: 'blue',
          icon: FileBarChart,
          subValue: `${formatNumber(summary.total_pos)} purchase orders`,
        },
        {
          label: 'Committed',
          value: formatCurrency(summary.committed_value),
          color: 'purple',
          icon: Coins,
          subValue: 'excludes draft, pending and cancelled',
        },
        {
          label: 'Total Paid',
          value: formatCurrency(summary.total_paid),
          color: 'green',
          icon: PackageCheck,
        },
        {
          label: 'Total Due',
          value: formatCurrency(summary.total_due),
          color: 'red',
          icon: Wallet,
        },
        {
          label: 'Awaiting Delivery',
          value: formatNumber(summary.awaiting_delivery),
          color: 'amber',
          icon: Truck,
          subValue: `receiving ${formatPercent(summary.receiving_rate_pct)} of ordered qty`,
        },
        {
          label: 'Late Deliveries',
          value: formatNumber(summary.late_pos),
          color: summary.late_pos > 0 ? 'red' : 'green',
          icon: AlertTriangle,
          onClick: () => setLateOnly(!lateOnly),
          active: lateOnly,
        },
        {
          label: 'Top Supplier',
          value: summary.top_supplier?.name ?? '—',
          color: 'green',
          icon: Award,
          subValue: summary.top_supplier
            ? `${formatCurrency(summary.top_supplier.value)} over ${formatNumber(summary.top_supplier.orders)} POs`
            : 'no purchases in range',
        },
        {
          label: 'Qty Ordered',
          value: formatNumber(summary.total_ordered_qty, 2),
          color: 'gray',
          icon: Layers,
          subValue: `${formatNumber(summary.total_received_qty, 2)} received`,
        },
      ]
    : [];

  /** One card per status, so the status itself is the drill-down. */
  const statusCards: SummaryCard[] = STATUSES.map((st) => {
    const stat = statusByKey(st.value);
    const tone =
      st.value === 'cancelled' ? 'red' : st.value === 'draft' ? 'gray' : st.value === 'completed' ? 'green' : 'blue';
    return {
      label: st.label,
      value: formatNumber(stat?.count ?? 0),
      color: tone,
      subValue: formatCurrency(stat?.value ?? 0),
      onClick: () => applyStatus(st.value),
      active: status === st.value,
    } as SummaryCard;
  });

  const columns: ReportColumn<PoSummaryRow>[] = [
    {
      key: 'po_number',
      header: 'PO #',
      cell: (value: string) => <span className="font-mono text-xs font-medium">{value}</span>,
    },
    { key: 'supplier_name', header: 'Supplier' },
    { key: 'warehouse_name', header: 'Warehouse' },
    { key: 'order_date', header: 'Order Date', format: 'date' },
    {
      key: 'expected_delivery_date',
      header: 'Expected',
      cell: (value: string | null) => (value ? formatDate(value) : <span className="text-muted-foreground">—</span>),
    },
    {
      key: 'delivery_status',
      header: 'Delivery',
      align: 'center',
      cell: (_value: unknown, row: PoSummaryRow) =>
        row.delivery_status === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span
            className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
              DELIVERY_BADGES[row.delivery_status] || DELIVERY_BADGES.closed
            }`}
          >
            {row.delivery_status === 'on_track' ? 'On Track' : row.delivery_status === 'late' ? `Late${row.days_late ? ` ${row.days_late}d` : ''}` : 'Closed'}
          </span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (_value: unknown, row: PoSummaryRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            STATUS_BADGES[row.status] || STATUS_BADGES.draft
          }`}
        >
          {STATUSES.find((x) => x.value === row.status)?.label ?? row.status}
        </span>
      ),
    },
    { key: 'subtotal', header: 'Subtotal', format: 'currency', align: 'right' },
    { key: 'discount_amount', header: 'Discount', format: 'currency', align: 'right' },
    { key: 'tax_amount', header: 'Tax', format: 'currency', align: 'right' },
    { key: 'shipping_charge', header: 'Shipping', format: 'currency', align: 'right' },
    {
      key: 'total',
      header: 'Total',
      format: 'currency',
      align: 'right',
      cell: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
    { key: 'paid_amount', header: 'Paid', format: 'currency', align: 'right' },
    {
      key: 'due',
      header: 'Due',
      align: 'right',
      cell: (value: number) =>
        value > 0 ? (
          <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: 'item_count', header: 'Items', format: 'number', align: 'right' },
    { key: 'quantity_ordered', header: 'Qty Ordered', format: 'qty', align: 'right' },
    { key: 'quantity_received', header: 'Qty Received', format: 'qty', align: 'right' },
    {
      key: 'receiving_rate_pct',
      header: 'Received %',
      align: 'right',
      cell: (value: number) => (
        <span
          className={
            value >= 100
              ? 'font-medium text-green-600 dark:text-green-400'
              : value > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground'
          }
        >
          {formatPercent(value, 1)}
        </span>
      ),
    },
    {
      key: 'payment_status',
      header: 'Payment',
      align: 'center',
      cell: (_value: unknown, row: PoSummaryRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            PAYMENT_BADGES[row.payment_status] || PAYMENT_BADGES.pending
          }`}
        >
          {row.payment_status.charAt(0).toUpperCase() + row.payment_status.slice(1)}
        </span>
      ),
    },
  ];

  const totalsRow = summary
    ? {
        po_number: 'Totals',
        subtotal: formatCurrency(
          data.data.reduce((sum, r) => sum + r.subtotal, 0),
        ),
        discount_amount: formatCurrency(
          data.data.reduce((sum, r) => sum + r.discount_amount, 0),
        ),
        tax_amount: formatCurrency(data.data.reduce((sum, r) => sum + r.tax_amount, 0)),
        shipping_charge: formatCurrency(
          data.data.reduce((sum, r) => sum + r.shipping_charge, 0),
        ),
        total: formatCurrency(summary.total_value),
        paid_amount: formatCurrency(summary.total_paid),
        due: formatCurrency(summary.total_due),
        item_count: formatNumber(data.data.reduce((sum, r) => sum + r.item_count, 0)),
        quantity_ordered: formatNumber(summary.total_ordered_qty, 2),
        quantity_received: formatNumber(summary.total_received_qty, 2),
        receiving_rate_pct: formatPercent(summary.receiving_rate_pct, 1),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('purchase', 'po-summary', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `${formatNumber(summary.total_pos)} POs`,
        `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'What was ordered, from whom, what has arrived and what is still owed';

  return (
    <ReportLayout
      title="Purchase Order Summary"
      description={description}
      icon={FileBarChart}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading} actionsPlacement="below">
          {isSuperAdmin && (
            <FilterRow columns={1}>
              <FilterField label="Tenant" className="max-w-sm">
                <TenantSelect
                  value={selectedTenantId}
                  onChange={(tid) => {
                    setSelectedTenantId(tid || '');
                    setSupplier(null);
                    setWarehouse(null);
                  }}
                  placeholder="Select a tenant"
                  compact
                  isClearable
                />
              </FilterField>
            </FilterRow>
          )}

          <FilterRow columns={3}>
            <FilterField label="Supplier" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`sup-${scopeTenantId || 'unscoped'}`}
                value={supplier}
                onChange={setSupplier}
                loadOptions={loadSuppliers}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All suppliers' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Warehouse" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`wh-${scopeTenantId || 'unscoped'}`}
                value={warehouse}
                onChange={setWarehouse}
                loadOptions={loadWarehouses}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All warehouses' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Start Date">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
          </FilterRow>

          <FilterRow columns={3}>
            <FilterField label="End Date">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="Status">
              <select
                className={filterSelectClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus | '')}
              >
                <option value="">All Statuses</option>
                {STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Payment Status">
              <select
                className={filterSelectClass}
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PurchasePaymentStatus | '')}
              >
                <option value="">All Payment Statuses</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </FilterField>
          </FilterRow>

          <FilterRow>
            <FilterField label="Search">
              <input
                type="search"
                className={filterInputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="PO number, supplier ref or supplier"
              />
            </FilterField>
            <FilterField label="Options">
              <FilterCheckbox
                label="Late deliveries only"
                activeHint="Only orders past their expected delivery date"
                checked={lateOnly}
                onChange={setLateOnly}
              />
            </FilterField>
          </FilterRow>
        </ReportFilters>
      }
      summaryCards={
        cards.length > 0 ? (
          <>
            <ReportSummaryCards cards={cards} />
            <div className="mt-3">
              <ReportSummaryCards cards={statusCards} />
            </div>
          </>
        ) : undefined
      }
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        <ReportExportBar
          onExportPDF={exportPDF}
          onExportExcel={exportExcel}
          onExportCSV={exportCSV}
          onPrint={handlePrint}
          loading={!!exportLoading}
          disabled={!data}
        />
      }
    >
      {data && (
        <ReportTable
          columns={columns}
          data={data.data}
          pageSize={25}
          totalsRow={totalsRow}
          rowKey={(row) => row.po_number}
          searchKeys={['po_number', 'supplier_order_no', 'supplier_name', 'warehouse_name']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}