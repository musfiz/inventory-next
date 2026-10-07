'use client';

import { useState } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  TrendingUp,
  Landmark,
  AlertOctagon,
  Database,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
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
  TrialBalanceReportResponse,
  TrialBalanceLedgerRow,
  TrialBalanceSide,
} from '@/types/report.types';

/** Kept in step with App\Reports\Accounting\TrialBalanceReport::ACCOUNT_TYPES. */
const ACCOUNT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
  { value: 'contra', label: 'Contra' },
];

const TYPE_BADGES: Record<string, string> = {
  asset: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  liability: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  equity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  revenue: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  expense: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  contra: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const SIDE_BADGES: Record<TrialBalanceSide, string> = {
  debit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  credit: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  flat: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

/** Start of the current month — the backend's own default when no date is sent. */
const monthStartISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

export default function TrialBalancePage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<TrialBalanceReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [startDate, setStartDate] = useState(monthStartISO);
  const [endDate, setEndDate] = useState(todayISO);
  const [accountType, setAccountType] = useState('');
  const [search, setSearch] = useState('');
  const [onlyWithActivity, setOnlyWithActivity] = useState(true);
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);
  const [onlyDrift, setOnlyDrift] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (accountType) params.account_type = accountType;
    if (search.trim()) params.search = search.trim();
    params.only_with_activity = onlyWithActivity ? 1 : 0;
    params.only_abnormal = onlyAbnormal ? 1 : 0;
    params.only_drift = onlyDrift ? 1 : 0;
    params.include_inactive = includeInactive ? 1 : 0;
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.trialBalance(params as any);
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
    // Guarded here rather than left to the API: an end date before the start
    // date is a mistake worth naming before a round trip.
    if (startDate && endDate && startDate > endDate) {
      const msg = 'Start date cannot be after end date.';
      setError(msg);
      notify.error(msg);
      return;
    }
    fetchReport(buildParams());
  };

  /** A summary card toggles its own filter, and re-runs against the new value. */
  const toggle = (key: 'only_abnormal' | 'only_drift') => {
    const next = (key === 'only_abnormal' ? onlyAbnormal : onlyDrift) ? 0 : 1;
    if (key === 'only_abnormal') setOnlyAbnormal(next === 1);
    else setOnlyDrift(next === 1);

    fetchReport({ ...buildParams(), [key]: next });
  };

  const reset = () => {
    setSelectedTenantId('');
    setStartDate(monthStartISO());
    setEndDate(todayISO());
    setAccountType('');
    setSearch('');
    setOnlyWithActivity(true);
    setOnlyAbnormal(false);
    setOnlyDrift(false);
    setIncludeInactive(false);
    setData(null);
    setError(null);
  };

  const summary = data?.summary;

  /**
   * The balance verdict leads, because it is the one thing this report exists to
   * answer. Everything after it explains *why* if the answer is no.
   */
  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Books Balanced',
          value: summary.is_balanced ? 'Yes' : 'No',
          color: summary.is_balanced ? 'green' : 'red',
          icon: summary.is_balanced ? CheckCircle2 : AlertTriangle,
          subValue: summary.is_balanced
            ? 'closing debits equal closing credits'
            : `variance ${formatCurrency(Math.abs(summary.variance))}`,
        },
        {
          label: 'Total Debit',
          value: formatCurrency(summary.total_debit),
          color: 'blue',
          icon: Wallet,
        },
        {
          label: 'Total Credit',
          value: formatCurrency(summary.total_credit),
          color: 'red',
          icon: Landmark,
        },
        {
          label: 'Period Movement',
          value: summary.is_period_balanced ? 'Balanced' : `Off ${formatCurrency(Math.abs(summary.period_variance))}`,
          color: summary.is_period_balanced ? 'green' : 'amber',
          icon: TrendingUp,
          subValue: `${formatCurrency(summary.period_debit)} DR · ${formatCurrency(summary.period_credit)} CR`,
        },
        {
          label: 'Accounts',
          value: formatNumber(summary.account_count),
          color: 'purple',
          subValue: `${formatNumber(summary.active_account_count)} active`,
        },
        {
          label: 'Off-Side Balances',
          value: formatNumber(summary.abnormal_account_count),
          color: summary.abnormal_account_count > 0 ? 'red' : 'green',
          icon: AlertOctagon,
          onClick: () => toggle('only_abnormal'),
          active: onlyAbnormal,
          subValue:
            summary.abnormal_account_count > 0
              ? 'balance on the wrong side'
              : 'every account sits normally',
        },
        {
          label: 'Cache Drift',
          value: formatNumber(summary.drift_account_count),
          color: summary.drift_account_count > 0 ? 'red' : 'green',
          icon: Database,
          onClick: () => toggle('only_drift'),
          active: onlyDrift,
          subValue:
            summary.drift_account_count > 0
              ? `${formatCurrency(Math.abs(summary.total_drift))} off the ledger`
              : 'cached balances agree',
        },
      ]
    : [];

  /**
   * The type ladder: where each account type's closing balances sit.
   *
   * `share_pct` is measured against both sides together — a balanced book
   * double-counts every taka (once on each side), so a per-side percentage would
   * top out at 50% and read as though half the book were missing.
   */
  const bookSize = summary ? summary.total_debit + summary.total_credit : 0;
  const typeCards: SummaryCard[] = (summary?.by_account_type ?? [])
    .filter(t => t.count > 0)
    .map(t => ({
      label: t.label,
      value: formatCurrency(Math.abs(t.balance)),
      color: t.balance >= 0 ? 'blue' : 'red',
      subValue: `${formatNumber(t.count)} accounts · ${formatPercent(
        bookSize > 0 ? (Math.abs(t.balance) / bookSize) * 100 : 0,
      )} of the book`,
    }));

  /** Zero reads better as a dash than as ৳0.00 in a column of money. */
  const money = (value: number) =>
    value === 0 ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      <span className={value < 0 ? 'text-red-600 dark:text-red-400' : ''}>{formatCurrency(Math.abs(value))}</span>
    );

  const columns: ReportColumn<TrialBalanceLedgerRow>[] = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Account' },
    {
      key: 'account_type',
      header: 'Type',
      align: 'center',
      cell: (value: string) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            TYPE_BADGES[value] || TYPE_BADGES.contra
          }`}
        >
          {value}
        </span>
      ),
    },
    { key: 'opening_balance', header: 'Opening', align: 'right', cell: (v: number) => money(v) },
    { key: 'period_debit', header: 'Debit', align: 'right', cell: (v: number) => money(v) },
    { key: 'period_credit', header: 'Credit', align: 'right', cell: (v: number) => money(v) },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      cell: (value: number, row) =>
        value === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="font-medium">
            {row.balance_side === 'debit' ? 'Dr ' : 'Cr '}
            {formatCurrency(Math.abs(value))}
          </span>
        ),
    },
    {
      key: 'balance_side',
      header: 'Side',
      align: 'center',
      cell: (value: TrialBalanceSide) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${SIDE_BADGES[value]}`}
        >
          {value === 'debit' ? 'Debit' : value === 'credit' ? 'Credit' : 'Flat'}
        </span>
      ),
    },
    {
      key: 'is_abnormal',
      header: 'Check',
      align: 'center',
      // Only flag the failures; a column of "OK" is noise.
      cell: (value: boolean) =>
        value ? (
          <span className="inline-block whitespace-nowrap rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Off-side
          </span>
        ) : null,
    },
    { key: 'cached_balance', header: 'Cached', align: 'right', cell: (v: number) => money(v) },
    {
      key: 'drift',
      header: 'Drift',
      align: 'right',
      cell: (value: number) =>
        Math.abs(value) > 0.01 ? (
          <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: 'entry_count', header: 'Entries', format: 'number', align: 'right' },
    { key: 'last_entry_date', header: 'Last Entry', format: 'date' },
  ];

  /**
   * Only the movement pair and the entry count total. The balance columns are
   * signed, so footing them to ~0 would say nothing — the verdict card is where
   * the check lives.
   */
  const totalsRow = summary
    ? {
        code: 'Totals',
        period_debit: formatCurrency(summary.period_debit),
        period_credit: formatCurrency(summary.period_credit),
        entry_count: formatNumber(data?.data.reduce((s, r) => s + r.entry_count, 0) ?? 0),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('accounting', 'trial-balance', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `Closing balances as at ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'The ledger’s own proof that debits equal credits';

  return (
    <ReportLayout
      title="Trial Balance"
      description={description}
      icon={Scale}
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
            <FilterField label="Period From" hint="Opening balance is everything before this">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="To">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="Account Type">
              <select
                className={filterSelectClass}
                value={accountType}
                onChange={e => setAccountType(e.target.value)}
              >
                {ACCOUNT_TYPES.map(t => (
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
                label="Off-side balances only"
                activeHint="Only balances on the wrong side for their type"
                checked={onlyAbnormal}
                onChange={setOnlyAbnormal}
              />
              <FilterCheckbox
                label="Cache drift only"
                activeHint="Only accounts whose cached balance disagrees with the ledger"
                checked={onlyDrift}
                onChange={setOnlyDrift}
              />
              <FilterCheckbox
                label="Hide empty accounts"
                activeHint="Accounts with no movement and no balance are hidden"
                checked={onlyWithActivity}
                onChange={setOnlyWithActivity}
              />
              <FilterCheckbox
                label="Include inactive"
                checked={includeInactive}
                onChange={setIncludeInactive}
              />
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
      emptyIcon={Scale}
      emptyTitle="Nothing to balance"
      emptyMessage="No accounts have movement or a balance in this period. Widen the dates, or post a journal entry."
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
          pageSize={50}
          pageSizes={[25, 50, 100, 200]}
          totalsRow={totalsRow}
          rowKey={row => row.account_id}
          searchKeys={['code', 'name', 'account_type', 'account_subtype']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}