'use client';

import {
  ShoppingCart,
  Coins,
  Receipt,
  TrendingUp,
  Percent,
  Wallet,
  } from 'lucide-react';
import { useState } from 'react';
import {
  ReportLayout,
  ReportFilters,
  FilterRow,
  FilterField,
  filterInputClass,
  filterSelectClass,
  ReportSummaryCards,
  ReportTable,
  ReportExportBar,
  type ReportColumn,
  type SummaryCard,
} from '@/components/reports';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import { useServerReportExport } from '@/hooks/reports/use-server-report-export';
import { usePermissions } from '@/hooks/use-permissions';
import { notify } from '@/lib/notifications';
import { formatCurrency, formatDate, formatNumber, formatPercent, todayISO } from '@/lib/utils/format';
import { posRegisterService } from '@/services';
import reportService from '@/services/reportService';
import { useAuthStore } from '@/stores/auth-store';
import type { PosDailySalesReport, PosDailySalesRow } from '@/types/report.types';

/** Mirrors `payments.payment_method` / `pos_orders.payment_status` on the backend. */
const PAYMENT_METHODS: SelectOption[] = [
  { value: '', label: 'All Methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Cheque' },
  { value: 'credit', label: 'Credit' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_STATUSES: SelectOption[] = [
  { value: '', label: 'All Statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'pending', label: 'Pending' },
  { value: 'credit', label: 'Credit' },
  { value: 'refunded', label: 'Refunded' },
];

const humanize = (value: string | null | undefined) =>
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';

export default function PosDailySalesPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<PosDailySalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [register, setRegister] = useState<SelectOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;

  /**
   * A single date is what this report is for, so the range fields start empty
   * and only take over once the user fills one in. The backend gives
   * `start_date`/`end_date` precedence over `date` when both arrive, so sending
   * a stale `date` alongside a range would be ignored rather than confusing —
   * but omitting it keeps the params, and the export, honest.
   */
  const usingRange = !!startDate || !!endDate;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (usingRange) {
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
    } else if (date) {
      params.date = date;
    }
    if (register) params.register_id = register.value;
    if (paymentMethod) params.payment_method = paymentMethod;
    if (paymentStatus) params.payment_status = paymentStatus;
    if (search.trim()) params.search = search.trim();
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.posDailySales(params as any);
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

  const reset = () => {
    setSelectedTenantId('');
    setDate(todayISO());
    setStartDate('');
    setEndDate('');
    setRegister(null);
    setPaymentMethod('');
    setPaymentStatus('');
    setSearch('');
    setData(null);
    setError(null);
  };

  /** Registers are per-tenant, so the dropdown follows the selected tenant. */
  const loadRegisters = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const rows = await posRegisterService.dropdown(scopeTenantId || undefined);
      const q = inputValue.trim().toLowerCase();
      return (rows || [])
        .map((r: any) => ({ value: String(r.id), label: r.name }))
        .filter((o: SelectOption) => !q || o.label.toLowerCase().includes(q));
    } catch {
      return [];
    }
  };

  const summary = data?.summary;

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Total Sales',
          value: formatCurrency(summary.total_sales),
          color: 'green',
          icon: Coins,
          subValue: `${formatCurrency(summary.net_sales)} net of returns`,
        },
        {
          label: 'Orders',
          value: formatNumber(summary.order_count),
          color: 'blue',
          icon: ShoppingCart,
          subValue: `${formatCurrency(summary.avg_order_value)} avg · ${formatNumber(summary.avg_units_per_order, 2)} units`,
        },
        {
          label: 'Gross Profit',
          value: formatCurrency(summary.gross_profit),
          color: 'purple',
          icon: TrendingUp,
          subValue:
            summary.gross_margin_pct !== null
              ? `${formatPercent(summary.gross_margin_pct)} margin on ex-tax revenue`
              : 'no revenue in range',
        },
        {
          label: 'Discounts',
          value: formatCurrency(summary.total_discount),
          color: 'orange',
          icon: Percent,
          subValue:
            summary.discount_rate_pct !== null
              ? `${formatPercent(summary.discount_rate_pct)} of ${formatCurrency(summary.total_subtotal)} subtotal`
              : 'no subtotal in range',
        },
        {
          label: 'Tax',
          value: formatCurrency(summary.total_tax),
          color: 'amber',
          icon: Receipt,
          subValue:
            summary.tax_rate_pct !== null
              ? `${formatPercent(summary.tax_rate_pct)} effective rate`
              : 'no taxable base',
        },
        {
          label: 'Paid / Due',
          value: formatCurrency(summary.total_paid),
          color: summary.total_due > 0.005 ? 'red' : 'blue',
          icon: Wallet,
          subValue:
            summary.total_due > 0.005
              ? `${formatCurrency(summary.total_due)} across ${formatNumber(summary.unpaid_order_count)} unpaid orders`
              : 'everything settled',
        },
      ]
    : [];

  const columns: ReportColumn<PosDailySalesRow>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      cell: (value: string) => <span className="font-mono text-xs font-medium">{value}</span>,
    },
    {
      key: 'order_time',
      header: 'Time',
      cell: (value: string | null) =>
        value ? <span className="font-mono text-xs">{value}</span> : <span className="text-muted-foreground">—</span>,
    },
    { key: 'customer_name', header: 'Customer' },
    { key: 'cashier_name', header: 'Cashier' },
    { key: 'register_name', header: 'Register' },
    { key: 'line_count', header: 'Lines', format: 'number', align: 'right' },
    { key: 'units_sold', header: 'Units', format: 'qty', align: 'right' },
    { key: 'sub_total', header: 'Subtotal', format: 'currency', align: 'right' },
    {
      key: 'total_discount',
      header: 'Discount',
      format: 'currency',
      align: 'right',
      // Order-level and line-level discount are shown together because reading
      // the order column alone understates what was given away on a sale whose
      // lines were discounted.
      cell: (value: number, row) => (
        <span title={`Order ${formatCurrency(row.order_discount)} · Lines ${formatCurrency(row.line_discount)}`}>
          {formatCurrency(value)}
        </span>
      ),
    },
    { key: 'tax_amount', header: 'Tax', format: 'currency', align: 'right' },
    {
      key: 'grand_total',
      header: 'Total',
      format: 'currency',
      align: 'right',
      cell: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
    { key: 'paid_amount', header: 'Paid', format: 'currency', align: 'right' },
    {
      key: 'amount_due',
      header: 'Due',
      format: 'currency',
      align: 'right',
      cell: (value: number) =>
        value > 0.005 ? (
          <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'returned_amount',
      header: 'Returned',
      format: 'currency',
      align: 'right',
      cell: (value: number) =>
        value > 0.005 ? (
          <span className="text-orange-600 dark:text-orange-400">{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: 'gross_profit', header: 'Gross Profit', format: 'currency', align: 'right' },
    { key: 'payment_method', header: 'Payment', cell: (value: string | null) => humanize(value) },
    {
      key: 'payment_status',
      header: 'Pay Status',
      align: 'center',
      cell: (value: string | null) => (
        <span
          className={
            value === 'paid'
              ? 'inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : value === 'partial'
                ? 'inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : value === 'refunded'
                  ? 'inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          }
        >
          {humanize(value)}
        </span>
      ),
    },
  ];

  const totalsRow = summary
    ? {
        invoice_number: 'Totals',
        line_count: formatNumber(summary.order_count),
        units_sold: formatNumber(summary.total_units, 2),
        sub_total: formatCurrency(summary.total_subtotal),
        total_discount: formatCurrency(summary.total_discount),
        tax_amount: formatCurrency(summary.total_tax),
        grand_total: formatCurrency(summary.total_sales),
        paid_amount: formatCurrency(summary.total_paid),
        amount_due: formatCurrency(summary.total_due),
        returned_amount: formatCurrency(summary.total_returned),
        gross_profit: formatCurrency(summary.gross_profit),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('pos', 'daily-sales', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const periodLabel = summary
    ? summary.start_date === summary.end_date
      ? formatDate(summary.start_date, 'long')
      : `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`
    : null;

  const description = summary
    ? [periodLabel, generatedAt ? `generated ${generatedAt}` : null].filter(Boolean).join(' · ')
    : 'The day register — every sale the counter rang, with the day reconciled underneath';

  return (
    <ReportLayout
      title="POS Daily Sales"
      description={description}
      icon={ShoppingCart}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading} actionsPlacement="below">
          {isSuperAdmin && (
            <FilterRow columns={1}>
              <FilterField label="Tenant" className="max-w-sm">
                <TenantSelect
                  value={selectedTenantId}
                  onChange={(tid) => {
                    setSelectedTenantId(tid || '');
                    setRegister(null);
                  }}
                  placeholder="Select a tenant"
                  compact
                  isClearable
                />
              </FilterField>
            </FilterRow>
          )}

          <FilterRow columns={3}>
            <FilterField
              label="Date"
              hint={usingRange ? 'overridden by the range below' : undefined}
            >
              <CustomDatePicker
                value={date}
                onChange={(v) => {
                  setDate(v);
                  // Picking a day clears the range, so the two filters never
                  // contradict each other on screen.
                  setStartDate('');
                  setEndDate('');
                }}
                compact
                disabled={usingRange}
              />
            </FilterField>
            <FilterField label="Start Date" hint={usingRange ? undefined : 'optional range'}>
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="End Date" hint={usingRange ? undefined : 'optional range'}>
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
          </FilterRow>

          <FilterRow columns={4}>
            <FilterField label="Register" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`reg-${scopeTenantId || 'unscoped'}`}
                value={register}
                onChange={setRegister}
                loadOptions={loadRegisters}
                defaultOptions={scopeReady}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All registers' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Payment Method">
              <select
                className={filterSelectClass}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Payment Status">
              <select
                className={filterSelectClass}
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Search">
              <input
                type="search"
                className={filterInputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Invoice, customer, phone or cashier"
              />
            </FilterField>
          </FilterRow>
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} columns={6} /> : undefined}
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
          rowKey={(row) => row.pos_order_id}
          searchKeys={[
            'invoice_number',
            'customer_name',
            'customer_phone',
            'cashier_name',
            'register_name',
            'payment_method',
            'payment_status',
          ]}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}