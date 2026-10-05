'use client';

import {
  Receipt,
  Coins,
  ShoppingCart,
  Wallet,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { useState } from 'react';
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
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import { useServerReportExport } from '@/hooks/reports/use-server-report-export';
import { usePermissions } from '@/hooks/use-permissions';
import { notify } from '@/lib/notifications';
import { formatCurrency, formatDate, formatNumber, todayISO, firstDayOfMonthISO } from '@/lib/utils/format';
import { commonService, posRegisterService } from '@/services';
import reportService from '@/services/reportService';
import { useAuthStore } from '@/stores/auth-store';
import type { PosSessionSummaryReport, PosSessionSummaryRow } from '@/types/report.types';

/** Mirrors `pos_sessions.status` on the backend. */
const STATUSES: SelectOption[] = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'paused', label: 'Paused' },
  { value: 'suspended', label: 'Suspended' },
];

export default function PosSessionSummaryPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<PosSessionSummaryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [register, setRegister] = useState<SelectOption | null>(null);
  const [warehouse, setWarehouse] = useState<SelectOption | null>(null);
  const [status, setStatus] = useState('');
  const [varianceOnly, setVarianceOnly] = useState(false);
  const [search, setSearch] = useState('');

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (register) params.register_id = register.value;
    if (warehouse) params.warehouse_id = warehouse.value;
    if (status) params.status = status;
    if (search.trim()) params.search = search.trim();
    if (varianceOnly) params.variance_only = 1;
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.posSessionSummary(params as any);
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
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setRegister(null);
    setWarehouse(null);
    setStatus('');
    setVarianceOnly(false);
    setSearch('');
    setData(null);
    setError(null);
  };

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

  const loadWarehouses = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const rows = await commonService.getWarehousesByTenant({
        search: inputValue,
        tenant_id: scopeTenantId,
      });
      return (rows || []).map((w: any) => ({ value: String(w.id), label: w.name }));
    } catch {
      return [];
    }
  };

  const summary = data?.summary;

  /**
   * A negative variance means the drawer was short, so the card reads red; over
   * and balanced read green. An unreconciled day (no session counted yet) is
   * neutral rather than falsely reassuring.
   */
  const varianceTone = (() => {
    const v = summary?.cash_variance_total ?? null;
    if (summary?.counted_session_count === 0) return 'gray' as const;
    if (v === null || v === 0) return 'green' as const;
    return v < 0 ? ('red' as const) : ('green' as const);
  })();

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Total Sales',
          value: formatCurrency(summary.total_sales),
          color: 'green',
          icon: Coins,
          subValue: `${formatNumber(summary.order_count)} orders · ${formatCurrency(summary.avg_order_value)} avg`,
        },
        {
          label: 'Sessions',
          value: formatNumber(summary.session_count),
          color: 'blue',
          icon: Clock,
          subValue: `${formatNumber(summary.closed_session_count)} closed · ${formatNumber(summary.open_session_count)} still open`,
        },
        {
          label: 'Net Sales',
          value: formatCurrency(summary.net_sales),
          color: 'purple',
          icon: ShoppingCart,
          subValue: `after ${formatCurrency(summary.total_refunds)} refunds · ${formatCurrency(summary.total_discount)} discount`,
        },
        {
          label: 'Cash Variance',
          value:
            summary.counted_session_count === 0
              ? 'Not counted'
              : formatCurrency(summary.cash_variance_total),
          color: varianceTone,
          icon: summary.counted_session_count === 0 ? Clock : Scale,
          subValue:
            summary.counted_session_count === 0
              ? 'no session has been closed yet'
              : `${formatNumber(summary.counted_session_count)} counted · ${formatNumber(summary.short_sessions)} short, ${formatNumber(summary.over_sessions)} over`,
        },
        {
          label: 'Expected Cash',
          value: formatCurrency(summary.expected_cash_total),
          color: 'amber',
          icon: Wallet,
          subValue: `${formatCurrency(summary.actual_cash_total)} counted across ${formatNumber(summary.counted_session_count)} session${summary.counted_session_count === 1 ? '' : 's'}`,
        },
        {
          label: 'By Method',
          value: formatCurrency(summary.total_cash_sales),
          color: 'blue',
          icon: Layers,
          subValue: `cash · ${formatCurrency(summary.total_card_sales)} card · ${formatCurrency(summary.total_mobile_sales)} mobile · ${formatCurrency(summary.total_credit_sales)} credit`,
        },
      ]
    : [];

  const columns: ReportColumn<PosSessionSummaryRow>[] = [
    {
      key: 'session_number',
      header: 'Session #',
      cell: (value: string) => <span className="font-mono text-xs font-medium">{value}</span>,
    },
    { key: 'cashier_name', header: 'Cashier' },
    { key: 'register_name', header: 'Register' },
    { key: 'warehouse_name', header: 'Warehouse' },
    {
      key: 'start_time',
      header: 'Opened',
      format: 'datetime',
      cell: (value: string | null) =>
        value ? formatDate(value, 'datetime') : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'end_time',
      header: 'Closed',
      format: 'datetime',
      cell: (value: string | null) =>
        value ? (
          formatDate(value, 'datetime')
        ) : (
          <span className="text-amber-600 dark:text-amber-400">Open</span>
        ),
    },
    {
      key: 'duration_hours',
      header: 'Hours',
      format: 'number',
      align: 'right',
      cell: (value: number) => <span className="font-mono text-xs">{formatNumber(value, 2)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (value: string) => (
        <span
          className={
            value === 'open'
              ? 'inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
              : value === 'closed'
                ? 'inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          }
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    { key: 'order_count', header: 'Orders', format: 'number', align: 'right' },
    { key: 'units_sold', header: 'Units', format: 'qty', align: 'right' },
    {
      key: 'total_sales',
      header: 'Sales',
      format: 'currency',
      align: 'right',
      cell: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
    { key: 'total_refunds', header: 'Refunds', format: 'currency', align: 'right' },
    { key: 'total_discount', header: 'Discount', format: 'currency', align: 'right' },
    { key: 'total_tax', header: 'Tax', format: 'currency', align: 'right' },
    { key: 'avg_order_value', header: 'Avg Order', format: 'currency', align: 'right' },
    { key: 'cash_sales', header: 'Cash', format: 'currency', align: 'right' },
    { key: 'card_sales', header: 'Card', format: 'currency', align: 'right' },
    {
      key: 'mobile_sales',
      header: 'Mobile',
      format: 'currency',
      align: 'right',
      // bKash + Nagad + Rocket, collapsed server-side.
      cell: (value: number) => (
        <span title="bKash + Nagad + Rocket">{formatCurrency(value)}</span>
      ),
    },
    { key: 'credit_sales', header: 'Credit', format: 'currency', align: 'right' },
    { key: 'opening_balance', header: 'Opening', format: 'currency', align: 'right' },
    { key: 'cash_in', header: 'Cash In', format: 'currency', align: 'right' },
    { key: 'cash_out', header: 'Cash Out', format: 'currency', align: 'right' },
    { key: 'expected_cash', header: 'Expected', format: 'currency', align: 'right' },
    {
      key: 'actual_cash',
      header: 'Counted',
      format: 'currency',
      align: 'right',
      // Null while the shift is open: there is no counted cash to report, and
      // printing ৳0.00 would read as "the drawer was empty".
      cell: (value: number | null) =>
        value === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          formatCurrency(value)
        ),
    },
    {
      key: 'cash_variance',
      header: 'Variance',
      format: 'currency',
      align: 'right',
      cell: (value: number | null) => {
        if (value === null) return <span className="text-muted-foreground">—</span>;
        if (Math.abs(value) < 0.005) {
          return (
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 size={12} />
              Balanced
            </span>
          );
        }
        return (
          <span
            className={
              value < 0 ? 'font-medium text-red-600 dark:text-red-400' : 'font-medium text-amber-600 dark:text-amber-400'
            }
          >
            {formatCurrency(value)} {value < 0 ? 'short' : 'over'}
          </span>
        );
      },
    },
  ];

  const totalsRow = summary
    ? {
        session_number: 'Totals',
        order_count: formatNumber(summary.order_count),
        units_sold: formatNumber(summary.total_units, 2),
        total_sales: formatCurrency(summary.total_sales),
        total_refunds: formatCurrency(summary.total_refunds),
        total_discount: formatCurrency(summary.total_discount),
        total_tax: formatCurrency(summary.total_tax),
        cash_sales: formatCurrency(summary.total_cash_sales),
        card_sales: formatCurrency(summary.total_card_sales),
        mobile_sales: formatCurrency(summary.total_mobile_sales),
        credit_sales: formatCurrency(summary.total_credit_sales),
        expected_cash: formatCurrency(summary.expected_cash_total),
        actual_cash: formatCurrency(summary.actual_cash_total),
        cash_variance: formatCurrency(summary.cash_variance_total),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('pos', 'session-summary', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Cashier shifts, drawer reconciliation and till performance';

  return (
    <ReportLayout
      title="POS Session Summary"
      description={description}
      icon={Receipt}
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
            <FilterField label="Start Date">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="End Date">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="Status">
              <select className={filterSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </FilterField>
          </FilterRow>

          <FilterRow columns={3}>
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
            <FilterField label="Warehouse" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`wh-${scopeTenantId || 'unscoped'}`}
                value={warehouse}
                onChange={setWarehouse}
                loadOptions={loadWarehouses}
                defaultOptions={scopeReady}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All warehouses' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Search">
              <input
                type="search"
                className={filterInputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Session number, cashier or register"
              />
            </FilterField>
          </FilterRow>

          <FilterRow>
            <FilterField label="Options">
              <FilterCheckbox
                label="Cash variance only"
                activeHint="Hides sessions that were never counted"
                checked={varianceOnly}
                onChange={setVarianceOnly}
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
        <>
          {summary && summary.counted_session_count === 0 && data.data.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                None of these sessions have been closed yet, so there is no counted cash to reconcile
                against. The variance columns stay blank until a shift is closed.
              </p>
            </div>
          )}
          <ReportTable
            columns={columns}
            data={data.data}
            pageSize={25}
            totalsRow={totalsRow}
            rowKey={(row) => row.id}
            searchKeys={['session_number', 'cashier_name', 'register_name', 'warehouse_name']}
            showSerial
            serialHeader="SL"
          />
        </>
      )}
    </ReportLayout>
  );
}