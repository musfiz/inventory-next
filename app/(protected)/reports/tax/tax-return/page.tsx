'use client';

import { useState } from 'react';
import {
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Landmark,
  Wallet,
  CheckCircle2,
  RotateCcw,
  Building2,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { formatCurrency, formatNumber, formatDate, todayISO } from '@/lib/utils/format';
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
  TaxReturnReportResponse,
  TaxReturnRow,
  TaxReturnTaxType,
  TaxReturnSide,
} from '@/types/report.types';

/** Kept in step with App\Reports\Tax\TaxReturnReport::TAX_TYPES. */
const TAX_TYPES: { value: TaxReturnTaxType; label: string }[] = [
  { value: 'vat', label: 'VAT' },
  { value: 'supplementary_duty', label: 'Supplementary Duty' },
  { value: 'income_tax', label: 'Income Tax' },
  { value: 'withholding', label: 'Tax Withholding' },
  { value: 'other', label: 'Other Tax' },
];

const SIDES: { value: TaxReturnSide; label: string }[] = [
  { value: 'output', label: 'Output (owed to authority)' },
  { value: 'input', label: 'Input (reclaimable)' },
];

const TAX_TYPE_BADGES: Record<TaxReturnTaxType, string> = {
  vat: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  supplementary_duty: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  income_tax: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  withholding: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const SIDE_BADGES: Record<TaxReturnSide, string> = {
  output: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  input: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

/** Start of the current month — the backend's own default when no date is sent. */
const monthStartISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

export default function TaxReturnPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<TaxReturnReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [startDate, setStartDate] = useState(monthStartISO);
  const [endDate, setEndDate] = useState(todayISO);
  const [taxType, setTaxType] = useState<TaxReturnTaxType | ''>('');
  const [side, setSide] = useState<TaxReturnSide | ''>('');
  const [search, setSearch] = useState('');
  const [onlyWithActivity, setOnlyWithActivity] = useState(false);

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (taxType) params.tax_type = taxType;
    if (side) params.side = side;
    if (search.trim()) params.search = search.trim();
    params.only_with_activity = onlyWithActivity ? 1 : 0;
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.taxReturn(params as any);
      setData(res);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load report';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const generate = () => {
    // Guarded here rather than left to the API: an end date before the start date
    // is a mistake worth naming before a round trip.
    if (startDate && endDate && startDate > endDate) {
      const msg = 'Start date cannot be after end date.';
      setError(msg);
      notify.error(msg);
      return;
    }
    fetchReport(buildParams());
  };

  const reset = () => {
    setSelectedTenantId('');
    setStartDate(monthStartISO());
    setEndDate(todayISO());
    setTaxType('');
    setSide('');
    setSearch('');
    setOnlyWithActivity(false);
    setData(null);
    setError(null);
  };

  const summary = data?.summary;

  /** A summary card toggles its own filter, and re-runs against the new value. */
  const toggleTaxType = (next: TaxReturnTaxType) => {
    const value = taxType === next ? '' : next;
    setTaxType(value);
    fetchReport({ ...buildParams(), tax_type: value || undefined });
  };

  /**
   * The verdict leads, because it is what the report exists to answer: whether
   * this period's return is a payment or a reclaim. Everything after it explains
   * the number.
   */
  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Net Tax Due',
          value: formatCurrency(Math.abs(summary.net_tax_due)),
          color: summary.direction === 'payable' ? 'red' : summary.direction === 'recoverable' ? 'green' : 'gray',
          icon: summary.direction === 'recoverable' ? RotateCcw : Landmark,
          subValue:
            summary.direction === 'payable'
              ? 'payable to the authority'
              : summary.direction === 'recoverable'
                ? 'recoverable from the authority'
                : 'nothing due for this period',
        },
        {
          label: 'Tax Collected',
          value: formatCurrency(summary.total_tax_collected),
          color: 'blue',
          icon: ArrowUpRight,
          subValue: 'output tax charged out',
        },
        {
          label: 'Tax Paid',
          value: formatCurrency(summary.total_tax_paid),
          color: 'green',
          icon: ArrowDownLeft,
          subValue: 'input tax reclaimable',
        },
        {
          label: 'Refunded / Recovered',
          value: formatCurrency(summary.total_tax_refunded),
          color: 'amber',
          icon: RotateCcw,
        },
        {
          label: 'Opening Payable',
          value: formatCurrency(summary.opening_payable),
          color: 'purple',
          icon: Wallet,
          subValue: 'brought forward from last period',
        },
        {
          label: 'Closing Payable',
          value: formatCurrency(summary.closing_payable),
          color: 'purple',
          icon: CheckCircle2,
          subValue: 'still owed at period end',
        },
        {
          label: 'Carried Forward',
          value: formatCurrency(summary.net_position),
          color: summary.net_position > 0 ? 'red' : 'green',
          icon: Building2,
          subValue: 'net of recoverable input tax',
        },
        {
          label: 'Tax Accounts',
          value: formatNumber(summary.tax_account_count),
          color: 'gray',
          subValue: summary.has_activity ? 'with activity this period' : 'no movement this period',
        },
      ]
    : [];

  /**
   * The per-tax ladder, in filing order.
   *
   * Types with nothing filed are still shown: a return that omits Supplementary
   * Duty because none was charged is not the same document as one that files a
   * nil SD line, and the distinction has to survive to the screen.
   */
  const typeCards: SummaryCard[] = (summary?.by_tax_type ?? []).map(t => ({
    label: t.label,
    value: formatCurrency(Math.abs(t.net_liability)),
    color: t.net_liability > 0 ? 'red' : t.net_liability < 0 ? 'green' : 'gray',
    // Clicking a tax drills into just that tax, and clicking again clears it.
    onClick: () => toggleTaxType(t.key),
    active: taxType === t.key,
    subValue:
      t.net_liability === 0
        ? `${formatNumber(t.account_count)} accounts · nil for this period`
        : `${formatNumber(t.account_count)} accounts · ${t.net_liability > 0 ? 'owed' : 'reclaimable'}`,
  }));

  /** Zero reads better as a dash than as ৳0.00 in a column of money. */
  const money = (value: number) =>
    value === 0 ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      <span className={value < 0 ? 'text-green-600 dark:text-green-400' : ''}>
        {formatCurrency(Math.abs(value))}
      </span>
    );

  const columns: ReportColumn<TaxReturnRow>[] = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Tax Account' },
    {
      key: 'tax_type',
      header: 'Tax Type',
      align: 'center',
      cell: (value: TaxReturnTaxType) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            TAX_TYPE_BADGES[value] || TAX_TYPE_BADGES.other
          }`}
        >
          {TAX_TYPES.find(t => t.value === value)?.label ?? value}
        </span>
      ),
    },
    {
      key: 'side',
      header: 'Side',
      align: 'center',
      cell: (value: TaxReturnSide) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${SIDE_BADGES[value]}`}
        >
          {value === 'output' ? 'Output' : 'Input'}
        </span>
      ),
    },
    { key: 'opening_balance', header: 'Opening', align: 'right', cell: (v: number) => money(v) },
    { key: 'period_debit', header: 'Debit', align: 'right', cell: (v: number) => money(v) },
    { key: 'period_credit', header: 'Credit', align: 'right', cell: (v: number) => money(v) },
    { key: 'tax_collected', header: 'Collected', align: 'right', cell: (v: number) => money(v) },
    { key: 'tax_refunded', header: 'Refunded', align: 'right', cell: (v: number) => money(v) },
    { key: 'tax_paid', header: 'Paid', align: 'right', cell: (v: number) => money(v) },
    {
      key: 'net_liability',
      header: 'Net Liability',
      align: 'right',
      cell: (value: number) =>
        value === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="font-medium">
            {value > 0 ? formatCurrency(value) : `(${formatCurrency(Math.abs(value))})`}
          </span>
        ),
    },
    { key: 'closing_balance', header: 'Closing', align: 'right', cell: (v: number) => money(v) },
    { key: 'entry_count', header: 'Entries', format: 'number', align: 'right' },
    { key: 'last_entry_date', header: 'Last Entry', format: 'date' },
  ];

  /**
   * Only the movement columns foot. Opening and closing are signed balances, so
   * totalling them would say nothing — the "Carried Forward" card is where the
   * single reconciled figure lives.
   */
  const totalsRow = summary
    ? {
        code: 'Totals',
        period_debit: formatCurrency(data?.data.reduce((s, r) => s + r.period_debit, 0) ?? 0),
        period_credit: formatCurrency(data?.data.reduce((s, r) => s + r.period_credit, 0) ?? 0),
        tax_collected: formatCurrency(summary.total_tax_collected),
        tax_refunded: formatCurrency(summary.total_tax_refunded),
        tax_paid: formatCurrency(summary.total_tax_paid),
        net_liability: formatCurrency(Math.abs(summary.net_tax_due)),
        entry_count: formatNumber(data?.data.reduce((s, r) => s + r.entry_count, 0) ?? 0),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport } =
    useServerReportExport('tax', 'tax-return', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `Filing period ${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Tax liability and reclaimable input tax, as the ledger records it';

  return (
    <ReportLayout
      title="Tax Return"
      description={description}
      icon={Receipt}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading} actionsPlacement="below">
          {isSuperAdmin && (
            <FilterRow columns={1}>
              <FilterField label="Tenant" className="max-w-sm">
                <TenantSelect
                  value={selectedTenantId}
                  onChange={tid => setSelectedTenantId(tid || '')}
                  placeholder="Select a tenant"
                  compact
                  isClearable
                />
              </FilterField>
            </FilterRow>
          )}

          <FilterRow columns={3}>
            <FilterField label="Period From" hint="Anything before this is brought forward">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="To">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="Tax Type">
              <select
                className={filterSelectClass}
                value={taxType}
                onChange={e => setTaxType(e.target.value as TaxReturnTaxType | '')}
              >
                <option value="">All Taxes</option>
                {TAX_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FilterField>
          </FilterRow>

          <FilterRow columns={2}>
            <FilterField label="Search">
              <input
                type="search"
                className={filterInputClass}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Account code or name"
              />
            </FilterField>
            <FilterField label="Options">
              <FilterCheckbox
                label="Hide nil accounts"
                activeHint="Tax accounts with no movement and no balance are hidden"
                checked={onlyWithActivity}
                onChange={setOnlyWithActivity}
              />
            </FilterField>
          </FilterRow>

          <FilterRow columns={2}>
            <FilterField label="Side">
              <select
                className={filterSelectClass}
                value={side}
                onChange={e => setSide(e.target.value as TaxReturnSide | '')}
              >
                <option value="">Both Sides</option>
                {SIDES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </FilterField>
          </FilterRow>
        </ReportFilters>
      }
      summaryCards={
        cards.length > 0 ? (
          <>
            <ReportSummaryCards cards={cards} />
            {typeCards.length > 0 && (
              <div className="mt-3">
                <ReportSummaryCards cards={typeCards} />
              </div>
            )}
          </>
        ) : undefined
      }
      loading={loading}
      error={error}
      hasData={!!data}
      emptyIcon={Receipt}
      emptyTitle="Nothing to file"
      emptyMessage="This tenant has no tax accounts set up, or none of them moved in this period. Add a tax account to the chart of accounts to file a return."
      actions={
        <ReportExportBar
          onExportPDF={exportPDF}
          onExportExcel={exportExcel}
          onExportCSV={exportCSV}
          onPrint={printReport}
          loading={!!exportLoading}
          disabled={!data}
        />
      }
    >
      {data && (
        <ReportTable
          columns={columns}
          data={data.data}
          pageSize={50}
          pageSizes={[25, 50, 100, 200]}
          totalsRow={totalsRow}
          rowKey={row => row.account_id}
          searchKeys={['code', 'name', 'tax_type', 'side']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}