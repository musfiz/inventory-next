'use client';

import { useState } from 'react';
import {
  TrendingUp,
  Coins,
  Award,
  TrendingDown,
  Wallet,
  Percent,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import customerService from '@/services/customerService';
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
  CustomerProfitabilityReport,
  CustomerProfitabilityRow,
  CustomerMarginBand,
} from '@/types/report.types';

/** Kept in step with App\Reports\Sales\CustomerProfitabilityReport::BANDS. */
const BANDS: { value: CustomerMarginBand; label: string }[] = [
  { value: 'loss', label: 'Loss-making' },
  { value: 'thin', label: 'Thin (0-15%)' },
  { value: 'healthy', label: 'Healthy (15-30%)' },
  { value: 'strong', label: 'Strong (30%+)' },
];

const BAND_BADGES: Record<string, string> = {
  loss: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  thin: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  healthy: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
  strong: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const CUSTOMER_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'retail', label: 'Retail' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'own', label: 'Own' },
];

export default function CustomerProfitabilityPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<CustomerProfitabilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [customer, setCustomer] = useState<SelectOption | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [band, setBand] = useState<CustomerMarginBand | ''>('');
  const [minMargin, setMinMargin] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [includeZeroRevenue, setIncludeZeroRevenue] = useState(false);

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (customer) params.customer_id = customer.value;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (band) params.band = band;
    const min = parseFloat(minMargin);
    if (!Number.isNaN(min) && minMargin.trim() !== '') params.min_margin = min;
    if (customerType) params.customer_type = customerType;
    if (status) params.status = status;
    if (search.trim()) params.search = search.trim();
    params.include_zero_revenue = includeZeroRevenue ? 1 : 0;
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.customerProfitability(params as any);
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

  /** Clicking an already-active band clears it, so the card toggles. */
  const applyBand = (value: CustomerMarginBand) => {
    const next = band === value ? '' : value;
    setBand(next);
    const params = buildParams();
    if (next === '') {
      delete params.band;
    } else {
      params.band = next;
    }
    fetchReport(params);
  };

  const reset = () => {
    setSelectedTenantId('');
    setCustomer(null);
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setBand('');
    setMinMargin('');
    setCustomerType('');
    setStatus('');
    setSearch('');
    setIncludeZeroRevenue(false);
    setData(null);
    setError(null);
  };

  const loadCustomers = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const res = await customerService.getCustomers({
        search: inputValue,
        per_page: 25,
        ...(scopeTenantId ? { tenant_id: scopeTenantId } : {}),
      });
      const rows = res?.data?.data ?? res?.data ?? [];
      return (Array.isArray(rows) ? rows : []).map((c: any) => ({
        value: String(c.id),
        label: c.name,
      }));
    } catch {
      return [];
    }
  };

  const summary = data?.summary;
  const bandByKey = (key: CustomerMarginBand) => summary?.by_band?.find((b) => b.key === key);

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Net Profit',
          value: formatCurrency(summary.total_profit),
          color: summary.total_profit < 0 ? 'red' : 'green',
          icon: summary.total_profit < 0 ? TrendingDown : TrendingUp,
          subValue: `${formatNumber(summary.total_customers)} customers · ${formatNumber(summary.order_count)} orders`,
        },
        {
          label: 'Blended Margin',
          value: formatPercent(summary.margin_pct),
          color: 'blue',
          icon: Percent,
          subValue: `on ${formatCurrency(summary.revenue)} net revenue`,
        },
        {
          label: 'Net Revenue',
          value: formatCurrency(summary.revenue),
          color: 'purple',
          icon: Coins,
          subValue: `${formatCurrency(summary.discounts)} discounts · ${formatCurrency(summary.returns_value)} returns`,
        },
        {
          label: 'Top Customer',
          value: summary.top_customer?.name ?? '—',
          color: 'green',
          icon: Award,
          subValue: summary.top_customer
            ? `${formatCurrency(summary.top_customer.profit)} profit`
            : 'no sales in range',
        },
        {
          label: 'Loss-Making',
          value: formatNumber(summary.loss_customers),
          color: summary.loss_customers > 0 ? 'red' : 'green',
          icon: TrendingDown,
          subValue: `${formatCurrency(summary.loss_value)} lost`,
        },
        {
          label: 'Owed to You',
          value: formatCurrency(summary.total_outstanding),
          color: 'orange',
          icon: Wallet,
          subValue: `${formatNumber(summary.avg_revenue_per_customer)} avg per customer`,
        },
      ]
    : [];

  /** One card per margin band, so the band itself is the drill-down. */
  const bandCards: SummaryCard[] = BANDS.map((b) => {
    const stat = bandByKey(b.value);
    const tone =
      b.value === 'loss' ? 'red' : b.value === 'thin' ? 'orange' : b.value === 'healthy' ? 'amber' : 'green';
    return {
      label: b.label,
      value: formatCurrency(stat?.profit ?? 0),
      color: tone,
      subValue: `${formatNumber(stat?.customers ?? 0)} customers · ${formatCurrency(stat?.revenue ?? 0)} revenue`,
      onClick: () => applyBand(b.value),
      active: band === b.value,
    } as SummaryCard;
  });

  /** Money column, dimmed when nothing was returned. */
  const moneyCell = (value: number) => (
    <span className={value > 0 ? '' : 'text-muted-foreground'}>{formatCurrency(value)}</span>
  );

  const columns: ReportColumn<CustomerProfitabilityRow>[] = [
    { key: 'customer_name', header: 'Customer' },
    { key: 'phone', header: 'Phone' },
    { key: 'customer_type', header: 'Type' },
    { key: 'order_count', header: 'Orders', format: 'number', align: 'right' },
    { key: 'units', header: 'Units', format: 'qty', align: 'right' },
    { key: 'avg_order_value', header: 'Avg Order', format: 'currency', align: 'right' },
    { key: 'gross_revenue', header: 'Gross Revenue', format: 'currency', align: 'right' },
    { key: 'discounts', header: 'Discounts', align: 'right', cell: (value: number) => moneyCell(value) },
    { key: 'returns_value', header: 'Returns', align: 'right', cell: (value: number) => moneyCell(value) },
    { key: 'revenue', header: 'Net Revenue', format: 'currency', align: 'right' },
    { key: 'cogs', header: 'COGS', format: 'currency', align: 'right' },
    {
      key: 'gross_profit',
      header: 'Gross Profit',
      align: 'right',
      cell: (value: number) => (
        <span className={value < 0 ? 'font-medium text-red-600 dark:text-red-400' : 'font-medium'}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: 'margin_pct',
      header: 'Margin %',
      align: 'right',
      cell: (value: number) => (
        <span
          className={
            value < 0
              ? 'font-medium text-red-600 dark:text-red-400'
              : value < 15
                ? 'font-medium text-orange-600 dark:text-orange-400'
                : ''
          }
        >
          {formatPercent(value, 1)}
        </span>
      ),
    },
    { key: 'return_rate_pct', header: 'Return Rate %', format: 'percent', align: 'right' },
    {
      key: 'last_order_date',
      header: 'Last Order',
      cell: (value: string | null) => (value ? formatDate(value) : <span className="text-muted-foreground">—</span>),
    },
    { key: 'days_since_last_order', header: 'Days Since', format: 'number', align: 'right' },
    {
      key: 'outstanding_balance',
      header: 'Outstanding',
      align: 'right',
      cell: (value: number) =>
        value > 0 ? (
          <span className="font-medium text-orange-600 dark:text-orange-400">{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: 'credit_limit', header: 'Credit Limit', format: 'currency', align: 'right' },
    {
      key: 'available_credit',
      header: 'Available Credit',
      align: 'right',
      cell: (value: number | null) =>
        value === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className={value < 0 ? 'font-medium text-red-600 dark:text-red-400' : ''}>
            {formatCurrency(value)}
          </span>
        ),
    },
    {
      key: 'margin_band',
      header: 'Margin',
      align: 'center',
      cell: (_value: unknown, row: CustomerProfitabilityRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            BAND_BADGES[row.margin_band] || BAND_BADGES.healthy
          }`}
        >
          {row.band_label}
        </span>
      ),
    },
  ];

  const totalsRow = summary
    ? {
        customer_name: 'Totals',
        order_count: formatNumber(summary.order_count),
        units: formatNumber(summary.total_units, 2),
        gross_revenue: formatCurrency(summary.gross_revenue),
        discounts: formatCurrency(summary.discounts),
        returns_value: formatCurrency(summary.returns_value),
        revenue: formatCurrency(summary.revenue),
        cogs: formatCurrency(summary.total_cogs),
        gross_profit: formatCurrency(summary.total_profit),
        margin_pct: formatPercent(summary.margin_pct, 1),
        outstanding_balance: formatCurrency(summary.total_outstanding),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('customer', 'profitability', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Which customers make money, which cost you, and what they still owe';

  return (
    <ReportLayout
      title="Customer Profitability"
      description={description}
      icon={TrendingUp}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading} actionsPlacement="below">
          {isSuperAdmin && (
            <FilterRow columns={1}>
              <FilterField label="Tenant" className="max-w-sm">
                <TenantSelect
                  value={selectedTenantId}
                  onChange={(tid) => {
                    setSelectedTenantId(tid || '');
                    setCustomer(null);
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
            <FilterField label="Customer" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`cust-${scopeTenantId || 'unscoped'}`}
                value={customer}
                onChange={setCustomer}
                loadOptions={loadCustomers}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All customers' : 'Select a tenant first'}
              />
            </FilterField>
          </FilterRow>

          <FilterRow columns={3}>
            <FilterField label="Margin Band">
              <select
                className={filterSelectClass}
                value={band}
                onChange={(e) => setBand(e.target.value as CustomerMarginBand | '')}
              >
                <option value="">All Bands</option>
                {BANDS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Min Margin %" hint="Leave blank for no bound">
              <input
                type="number"
                min={-100}
                max={100}
                className={filterInputClass}
                value={minMargin}
                onChange={(e) => setMinMargin(e.target.value)}
                placeholder="Any"
              />
            </FilterField>
            <FilterField label="Customer Type">
              <select className={filterSelectClass} value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
                {CUSTOMER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FilterField>
          </FilterRow>

          <FilterRow>
            <FilterField label="Status">
              <select className={filterSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Customers</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FilterField>
            <FilterField label="Search">
              <input
                type="search"
                className={filterInputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Customer, phone or email"
              />
            </FilterField>
            <FilterField label="Options">
              <FilterCheckbox
                label="Include non-buyers"
                activeHint="Adds customers with no purchases in the period"
                checked={includeZeroRevenue}
                onChange={setIncludeZeroRevenue}
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
              <ReportSummaryCards cards={bandCards} />
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
          rowKey={(row) => row.customer_id}
          searchKeys={['customer_name', 'phone', 'email', 'customer_type']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}