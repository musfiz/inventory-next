'use client';

import { useState } from 'react';
import {
  CalendarClock,
  Wallet,
  AlertTriangle,
  Users,
  Layers,
  BadgeCheck,
  ShieldAlert,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import customerService from '@/services/customerService';
import { formatCurrency, formatDate, formatNumber, formatPercent, todayISO } from '@/lib/utils/format';
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
  CustomerAgingReport,
  CustomerAgingRow,
  CustomerAgingBucket,
} from '@/types/report.types';

/** Kept in step with App\Reports\Sales\CustomerAgingReport::BUCKETS. */
const BUCKETS: { value: CustomerAgingBucket; label: string }[] = [
  { value: 'current', label: 'Current (not yet due)' },
  { value: 'd_1_30', label: '1-30 Days Overdue' },
  { value: 'd_31_60', label: '31-60 Days Overdue' },
  { value: 'd_61_90', label: '61-90 Days Overdue' },
  { value: 'd_90_plus', label: '90+ Days Overdue' },
];

const CREDIT_BADGES: Record<string, string> = {
  within_limit: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  over_limit: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  no_limit: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const CREDIT_LABELS: Record<string, string> = {
  within_limit: 'Within Limit',
  over_limit: 'Over Limit',
  no_limit: 'No Limit Set',
};

const CUSTOMER_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'retail', label: 'Retail' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'own', label: 'Own' },
];

export default function CustomerAgingPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<CustomerAgingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [customer, setCustomer] = useState<SelectOption | null>(null);
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [customerType, setCustomerType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [bucket, setBucket] = useState<CustomerAgingBucket | ''>('');

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (customer) params.customer_id = customer.value;
    if (asOfDate) params.as_of_date = asOfDate;
    if (customerType) params.customer_type = customerType;
    if (status) params.status = status;
    if (search.trim()) params.search = search.trim();
    if (bucket) params.bucket = bucket;
    params.only_overdue = onlyOverdue ? 1 : 0;
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.customerAging(params as any);
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

  /** Clicking an already-active bucket clears it, so the card toggles. */
  const applyBucket = (value: CustomerAgingBucket) => {
    const next = bucket === value ? '' : value;
    setBucket(next);
    const params = buildParams();
    if (next === '') {
      delete params.bucket;
    } else {
      params.bucket = next;
    }
    fetchReport(params);
  };

  const reset = () => {
    setSelectedTenantId('');
    setCustomer(null);
    setAsOfDate(todayISO());
    setCustomerType('');
    setStatus('');
    setSearch('');
    setOnlyOverdue(false);
    setBucket('');
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
  const bucketByKey = (key: CustomerAgingBucket) => summary?.by_bucket?.find((b) => b.key === key);

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Total Outstanding',
          value: formatCurrency(summary.total_outstanding),
          color: 'red',
          icon: Wallet,
          subValue: `${formatNumber(summary.total_customers)} customers · ${formatNumber(summary.invoice_count)} invoices`,
        },
        {
          label: 'Total Overdue',
          value: formatCurrency(summary.total_overdue),
          color: 'orange',
          icon: AlertTriangle,
          subValue: `${formatPercent(summary.overdue_pct)} of the book`,
        },
        {
          label: 'Overdue Customers',
          value: formatNumber(summary.overdue_customer_count),
          color: 'amber',
          icon: Users,
        },
        {
          label: 'Oldest Debt',
          value: summary.oldest_days_overdue > 0 ? `${formatNumber(summary.oldest_days_overdue)}d` : '—',
          color: summary.oldest_days_overdue > 90 ? 'red' : 'blue',
          icon: CalendarClock,
        },
        {
          label: 'Current (Not Due)',
          value: formatCurrency(summary.total_current),
          color: 'green',
          icon: BadgeCheck,
          subValue: `${formatNumber(bucketByKey('current')?.customers ?? 0)} customers`,
          onClick: () => applyBucket('current'),
          active: bucket === 'current',
        },
        {
          label: 'Over Credit Limit',
          value: formatNumber(summary.over_limit_customers),
          color: summary.over_limit_customers > 0 ? 'red' : 'green',
          icon: ShieldAlert,
          subValue: summary.over_limit_customers > 0 ? 'needs a stop on further sales' : 'all within limits',
        },
        {
          label: '90+ Days',
          value: formatCurrency(bucketByKey('d_90_plus')?.amount ?? 0),
          color: 'red',
          icon: Layers,
          subValue: `${formatNumber(bucketByKey('d_90_plus')?.customers ?? 0)} customers · ${formatPercent(bucketByKey('d_90_plus')?.share_pct ?? 0)}`,
          onClick: () => applyBucket('d_90_plus'),
          active: bucket === 'd_90_plus',
        },
      ]
    : [];

  /** One card per aging bucket, so the ladder itself is the drill-down. */
  const bucketCards: SummaryCard[] = BUCKETS.map((b) => {
    const stat = bucketByKey(b.value);
    const tone = b.value === 'current' ? 'green' : b.value === 'd_90_plus' ? 'red' : b.value === 'd_1_30' ? 'orange' : 'amber';
    return {
      label: b.label,
      value: formatCurrency(stat?.amount ?? 0),
      color: tone,
      subValue: `${formatNumber(stat?.customers ?? 0)} customers · ${formatPercent(stat?.share_pct ?? 0)}`,
      onClick: () => applyBucket(b.value),
      active: bucket === b.value,
    } as SummaryCard;
  });

  /** Money column, dimmed when the bucket is empty for this customer. */
  const bucketCell = (value: number) => (
    <span className={value > 0 ? '' : 'text-muted-foreground'}>{formatCurrency(value)}</span>
  );

  const columns: ReportColumn<CustomerAgingRow>[] = [
    { key: 'customer_name', header: 'Customer' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'total_outstanding',
      header: 'Total Outstanding',
      format: 'currency',
      align: 'right',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    { key: 'current', header: 'Current', align: 'right', cell: (value: number) => bucketCell(value) },
    { key: 'd_1_30', header: '1-30 Days', align: 'right', cell: (value: number) => bucketCell(value) },
    { key: 'd_31_60', header: '31-60 Days', align: 'right', cell: (value: number) => bucketCell(value) },
    { key: 'd_61_90', header: '61-90 Days', align: 'right', cell: (value: number) => bucketCell(value) },
    { key: 'd_90_plus', header: '90+ Days', align: 'right', cell: (value: number) => bucketCell(value) },
    {
      key: 'total_overdue',
      header: 'Total Overdue',
      align: 'right',
      cell: (value: number) => (
        <span className={value > 0 ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground'}>
          {formatCurrency(value)}
        </span>
      ),
    },
    { key: 'overdue_pct', header: 'Overdue %', format: 'percent', align: 'right' },
    { key: 'oldest_days_overdue', header: 'Oldest Days', format: 'number', align: 'right' },
    { key: 'invoice_count', header: 'Invoices', format: 'number', align: 'right' },
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
      key: 'credit_status',
      header: 'Credit',
      align: 'center',
      cell: (_value: unknown, row: CustomerAgingRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            CREDIT_BADGES[row.credit_status] || CREDIT_BADGES.no_limit
          }`}
        >
          {CREDIT_LABELS[row.credit_status] || row.credit_status}
        </span>
      ),
    },
  ];

  const totalsRow = summary
    ? {
        customer_name: 'Totals',
        total_outstanding: formatCurrency(summary.total_outstanding),
        current: formatCurrency(summary.total_current),
        d_1_30: formatCurrency(bucketByKey('d_1_30')?.amount ?? 0),
        d_31_60: formatCurrency(bucketByKey('d_31_60')?.amount ?? 0),
        d_61_90: formatCurrency(bucketByKey('d_61_90')?.amount ?? 0),
        d_90_plus: formatCurrency(bucketByKey('d_90_plus')?.amount ?? 0),
        total_overdue: formatCurrency(summary.total_overdue),
        overdue_pct: formatPercent(summary.overdue_pct, 1),
        invoice_count: formatNumber(summary.invoice_count),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('customer', 'aging', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `Balances as of ${formatDate(summary.as_of_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Who owes what, and how stale the debt is — the receivables statement';

  return (
    <ReportLayout
      title="Customer Aging"
      description={description}
      icon={CalendarClock}
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
            <FilterField label="As Of Date" hint="Debt is aged against this date">
              <CustomDatePicker value={asOfDate} onChange={setAsOfDate} compact />
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
                placeholder="Customer, phone, email or invoice no."
              />
            </FilterField>
            <FilterField label="Options">
              <FilterCheckbox
                label="Overdue only"
                activeHint="Hides customers whose balance is entirely not yet due"
                checked={onlyOverdue}
                onChange={setOnlyOverdue}
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
              <ReportSummaryCards cards={bucketCards} />
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
          searchKeys={['customer_name', 'phone', 'email', 'invoice_numbers']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}