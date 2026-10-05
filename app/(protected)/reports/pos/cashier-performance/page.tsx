'use client';

import {
  Users,
  Coins,
  ShoppingCart,
  TrendingUp,
  Percent,
  Package,
  Wallet,
  Trophy,
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
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  firstDayOfMonthISO,
  todayISO,
} from '@/lib/utils/format';
import { commonService, posRegisterService, userService } from '@/services';
import reportService from '@/services/reportService';
import { useAuthStore } from '@/stores/auth-store';
import type { CashierPerformanceReport, CashierPerformanceRow } from '@/types/report.types';

/**
 * Mirrors `payments.payment_method` / `pos_orders.payment_status` on the
 * backend (`PosDailySalesReport::PAYMENT_METHODS` / `PAYMENT_STATUSES`).
 */
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

export default function CashierPerformancePage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<CashierPerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [cashier, setCashier] = useState<SelectOption | null>(null);
  const [register, setRegister] = useState<SelectOption | null>(null);
  const [warehouse, setWarehouse] = useState<SelectOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  /** Registers and warehouses are per-tenant, so they wait for a tenant. */
  const scopeReady = !isSuperAdmin || !!selectedTenantId;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (cashier) params.cashier_id = cashier.value;
    if (register) params.register_id = register.value;
    if (warehouse) params.warehouse_id = warehouse.value;
    if (paymentMethod) params.payment_method = paymentMethod;
    if (paymentStatus) params.payment_status = paymentStatus;
    if (search.trim()) params.search = search.trim();
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.cashierPerformance(buildParams());
      setData(res);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load report';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedTenantId('');
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setCashier(null);
    setRegister(null);
    setWarehouse(null);
    setPaymentMethod('');
    setPaymentStatus('');
    setSearch('');
    setData(null);
    setError(null);
  };

  /** Changing tenant invalidates every tenant-scoped option, so clear them. */
  const onTenantChange = (tid?: string | null) => {
    setSelectedTenantId(tid || '');
    setCashier(null);
    setRegister(null);
    setWarehouse(null);
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
    if (!scopeTenantId) return [];
    try {
      const rows = await commonService.getWarehousesByTenant({ tenant_id: scopeTenantId });
      const q = inputValue.trim().toLowerCase();
      return (rows || [])
        .map((w: any) => ({ value: String(w.id), label: w.name }))
        .filter((o: SelectOption) => !q || o.label.toLowerCase().includes(q));
    } catch {
      return [];
    }
  };

  /**
   * Cashiers are `users`. The users endpoint is tenant-scoped by a global scope,
   * but a super admin sees every tenant's users — which is harmless here
   * because the report also filters on tenant, so picking one from another
   * tenant simply returns no rows.
   */
  const loadCashiers = async (inputValue: string): Promise<SelectOption[]> => {
    try {
      const res = await userService.getUsers({
        search: inputValue.trim() || undefined,
        per_page: 50,
      });
      return (res?.data || []).map((u: any) => ({
        value: String(u.id),
        label: u.name ?? u.email ?? String(u.id),
      }));
    } catch {
      return [];
    }
  };

  const summary = data?.summary;

  const top = summary?.top_cashier?.[0];

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Cashiers',
          value: formatNumber(summary.cashier_count),
          color: 'blue',
          icon: Users,
          subValue: `${formatNumber(summary.avg_orders_per_cashier)} orders each on average`,
        },
        {
          label: 'Total Sales',
          value: formatCurrency(summary.total_sales),
          color: 'green',
          icon: Coins,
          subValue: `${formatCurrency(summary.avg_sales_per_cashier)} per cashier`,
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
              ? `${formatPercent(summary.gross_margin_pct)} margin on ${formatCurrency(summary.net_revenue)} ex-tax`
              : 'no revenue in range',
        },
        {
          label: 'Discounts',
          value: formatCurrency(summary.total_discount),
          color: 'orange',
          icon: Percent,
          subValue:
            summary.discount_rate_pct !== null
              ? `${formatPercent(summary.discount_rate_pct)} off the subtotal`
              : 'no subtotal in range',
        },
        {
          label: 'Units Sold',
          value: formatNumber(summary.total_units, 2),
          color: 'amber',
          icon: Package,
          subValue: `${formatCurrency(summary.total_tax)} tax · ${formatCurrency(summary.total_returned)} returned`,
        },
        {
          label: 'Top Cashier',
          value: top?.label ?? '—',
          color: 'purple',
          icon: Trophy,
          subValue: top ? `${formatCurrency(top.value)}${top.share_pct != null ? ` · ${formatPercent(top.share_pct)} of sales` : ''}` : 'no sales in range',
        },
        {
          label: 'Unpaid Orders',
          value: formatNumber(summary.unpaid_order_count),
          color: summary.unpaid_order_count > 0 ? 'red' : 'gray',
          icon: Wallet,
          subValue: summary.unpaid_order_count > 0 ? 'still owing from the counter' : 'everything settled',
        },
      ]
    : [];

  const columns: ReportColumn<CashierPerformanceRow>[] = [
    {
      key: 'rank',
      header: 'Rank',
      align: 'center',
      width: '64px',
      cell: (value: number | null) =>
        value === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span
            className={
              value === 1
                ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                : 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }
          >
            {value}
          </span>
        ),
    },
    {
      key: 'cashier_name',
      header: 'Cashier',
      cell: (value: string, row) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-gray-900 dark:text-gray-100">{value}</div>
          {/* An unattributed sale still has to be attributable to something, and
              created_by is what the report groups on. */}
          {row.cashier_id === null && (
            <div className="text-[11px] text-muted-foreground">No user recorded</div>
          )}
        </div>
      ),
    },
    { key: 'register_count', header: 'Registers', format: 'number', align: 'right' },
    { key: 'session_count', header: 'Sessions', format: 'number', align: 'right' },
    { key: 'order_count', header: 'Orders', format: 'number', align: 'right' },
    { key: 'units_sold', header: 'Units', format: 'qty', align: 'right' },
    { key: 'avg_order_value', header: 'Avg Order', format: 'currency', align: 'right' },
    {
      key: 'total_sales',
      header: 'Sales',
      format: 'currency',
      align: 'right',
      cell: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
    { key: 'net_revenue', header: 'Net Revenue', format: 'currency', align: 'right' },
    {
      key: 'total_discount',
      header: 'Discount',
      format: 'currency',
      align: 'right',
      cell: (value: number) =>
        value > 0.005 ? (
          <span className="text-orange-600 dark:text-orange-400">{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: 'total_tax', header: 'Tax', format: 'currency', align: 'right' },
    {
      key: 'total_returned',
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
    { key: 'gross_margin_pct', header: 'Margin %', format: 'percent', align: 'right' },
    { key: 'discount_rate_pct', header: 'Discount %', format: 'percent', align: 'right' },
    {
      key: 'sales_share_pct',
      header: 'Share %',
      format: 'percent',
      align: 'right',
      // A 0%-100% share is worth a bar: it is the one column that makes the
      // leaderboard readable at a glance rather than by reading numbers.
      cell: (value: number | null) => {
        if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
        const pct = Math.max(0, Math.min(100, value));
        return (
          <div className="flex items-center justify-end gap-2">
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <span
                className="block h-full rounded-full bg-indigo-500"
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="tabular-nums">{formatPercent(value)}</span>
          </div>
        );
      },
    },
    {
      key: 'unpaid_order_count',
      header: 'Unpaid',
      format: 'number',
      align: 'right',
      cell: (value: number) =>
        value > 0 ? (
          <span className="font-medium text-red-600 dark:text-red-400">{formatNumber(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  const totalsRow = summary
    ? {
        rank: '',
        cashier_name: 'Totals',
        register_count: '',
        // Left blank rather than summed: both are per-cashier DISTINCT counts,
        // so a register two cashiers worked, or a session handed over between
        // them, would be double-counted. The backend does not total them either.
        session_count: '',
        order_count: formatNumber(summary.order_count),
        units_sold: formatNumber(summary.total_units, 2),
        avg_order_value: formatCurrency(summary.avg_order_value),
        total_sales: formatCurrency(summary.total_sales),
        net_revenue: formatCurrency(summary.net_revenue),
        total_discount: formatCurrency(summary.total_discount),
        total_tax: formatCurrency(summary.total_tax),
        total_returned: formatCurrency(summary.total_returned),
        gross_profit: formatCurrency(summary.gross_profit),
        gross_margin_pct: formatPercent(summary.gross_margin_pct),
        discount_rate_pct: formatPercent(summary.discount_rate_pct),
        sales_share_pct: '',
        unpaid_order_count: formatNumber(summary.unpaid_order_count),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('pos', 'cashier-performance', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const periodLabel = summary
    ? summary.start_date === summary.end_date
      ? formatDate(summary.start_date, 'long')
      : `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`
    : null;

  const description = summary
    ? [periodLabel, generatedAt ? `generated ${generatedAt}` : null].filter(Boolean).join(' · ')
    : 'Takings, margin and discount behaviour, per cashier';

  return (
    <ReportLayout
      title="Cashier Performance"
      description={description}
      icon={Users}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading} actionsPlacement="below">
          {isSuperAdmin && (
            <FilterRow columns={1}>
              <FilterField label="Tenant" className="max-w-sm">
                <TenantSelect
                  value={selectedTenantId}
                  onChange={onTenantChange}
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
            <FilterField label="Cashier" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                value={cashier}
                onChange={setCashier}
                loadOptions={loadCashiers}
                defaultOptions
                isClearable
                compact
                placeholder="All cashiers"
              />
            </FilterField>
          </FilterRow>

          <FilterRow columns={5}>
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
                placeholder="Cashier name"
              />
            </FilterField>
          </FilterRow>
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} columns={4} /> : undefined}
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
          // cashier_key is unique per row and stable even when created_by is
          // null, which `cashier_id` would not be.
          rowKey={(row) => row.cashier_key}
          searchKeys={['cashier_name']}
          showSerial
          serialHeader="SL"
          emptyMessage="No completed sales in this period"
        />
      )}
    </ReportLayout>
  );
}