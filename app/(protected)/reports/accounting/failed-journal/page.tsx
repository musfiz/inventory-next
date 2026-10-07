'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Ban,
  Repeat,
  Scale,
  Wallet,
  CheckCircle2,
  Bug,
  Layers,
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
  FailedJournalQueueReport,
  FailedJournalQueueRow,
  FailedJournalQueueBucket,
  FailedJournalQueueStatusFilter,
} from '@/types/report.types';

/** Kept in step with App\Reports\Accounting\FailedJournalReport::BUCKETS. */
const BUCKETS: { value: FailedJournalQueueBucket; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'd_1_7', label: '1-7 Days' },
  { value: 'd_8_30', label: '8-30 Days' },
  { value: 'd_31_90', label: '31-90 Days' },
  { value: 'd_90_plus', label: '90+ Days' },
];

const STATUS_OPTIONS: { value: FailedJournalQueueStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Failures' },
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'resolved', label: 'Resolved' },
];

/** Cap the reference-type box: a queue with hundreds of distinct values is a bug elsewhere. */
const MAX_REFERENCE_TYPES = 6;

export default function FailedJournalPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<FailedJournalQueueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [status, setStatus] = useState<FailedJournalQueueStatusFilter>('unresolved');
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [search, setSearch] = useState('');
  const [onlyRecurring, setOnlyRecurring] = useState(false);
  const [bucket, setBucket] = useState<FailedJournalQueueBucket | ''>('');

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (asOfDate) params.as_of_date = asOfDate;
    if (status) params.status = status;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (referenceType.trim()) params.reference_type = referenceType.trim();
    if (search.trim()) params.search = search.trim();
    if (bucket) params.age_bucket = bucket;
    params.only_recurring = onlyRecurring ? 1 : 0;
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.failedJournal(params as any);
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
  const applyBucket = (value: FailedJournalQueueBucket) => {
    const next = bucket === value ? '' : value;
    setBucket(next);
    const params = buildParams();
    if (next === '') {
      delete params.age_bucket;
    } else {
      params.age_bucket = next;
    }
    fetchReport(params);
  };

  const reset = () => {
    setSelectedTenantId('');
    setStatus('unresolved');
    setAsOfDate(todayISO());
    setStartDate('');
    setEndDate('');
    setReferenceType('');
    setSearch('');
    setOnlyRecurring(false);
    setBucket('');
    setData(null);
    setError(null);
  };

  const summary = data?.summary;
  const bucketByKey = (key: FailedJournalQueueBucket) => summary?.by_bucket?.find(b => b.key === key);

  /**
   * The headline cards. `unresolved_value` leads because it is the only figure
   * an accountant needs: the amount the books are out by right now, because
   * something failed to post and nobody has retried it.
   */
  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Value Not Posted',
          value: formatCurrency(summary.unresolved_value),
          color: summary.unresolved_value > 0 ? 'red' : 'green',
          icon: Wallet,
          subValue:
            summary.unresolved_value > 0
              ? 'the ledger is out by this'
              : 'every auto-journal posted',
        },
        {
          label: 'Unresolved',
          value: formatNumber(summary.unresolved_count),
          color: summary.unresolved_count > 0 ? 'orange' : 'green',
          icon: AlertTriangle,
          subValue: `of ${formatNumber(summary.total_count)} failures`,
        },
        {
          label: 'Oldest Open Failure',
          value: summary.oldest_unresolved_days > 0 ? `${formatNumber(summary.oldest_unresolved_days)}d` : '—',
          color: summary.oldest_unresolved_days > 90 ? 'red' : 'blue',
          icon: Clock,
          onClick: summary.oldest_unresolved_days > 90 ? () => applyBucket('d_90_plus') : undefined,
          active: bucket === 'd_90_plus',
        },
        {
          label: 'Unbalanced Entries',
          value: formatNumber(summary.unbalanced_count),
          color: summary.unbalanced_count > 0 ? 'red' : 'green',
          icon: Scale,
          subValue:
            summary.unbalanced_count > 0 ? 'the posting routine is wrong' : 'every entry balanced',
        },
        {
          label: 'Repeated Failures',
          value: formatNumber(summary.recurring_count),
          color: summary.recurring_count > 0 ? 'amber' : 'green',
          icon: Repeat,
          subValue:
            summary.recurring_count > 0 ? 'retrying unchanged will fail' : 'no repeat references',
        },
        {
          label: 'Resolved',
          value: formatNumber(summary.resolved_count),
          color: 'green',
          icon: CheckCircle2,
        },
        {
          label: 'No Tenant',
          value: formatNumber(summary.unattributed_count),
          color: summary.unattributed_count > 0 ? 'amber' : 'green',
          icon: Ban,
          subValue:
            summary.unattributed_count > 0 ? 'failed before a tenant was known' : 'all rows are attributable',
        },
      ]
    : [];

  /** One card per queue-age bucket, so the ladder itself is the drill-down. */
  const bucketCards: SummaryCard[] = BUCKETS.map(b => {
    const stat = bucketByKey(b.value);
    const tone =
      b.value === 'today' ? 'green' : b.value === 'd_90_plus' ? 'red' : b.value === 'd_1_7' ? 'orange' : 'amber';
    return {
      label: b.label,
      value: formatNumber(stat?.count ?? 0),
      color: tone,
      subValue: `${formatCurrency(stat?.value ?? 0)} · ${formatPercent(stat?.share_pct ?? 0)} of open`,
      onClick: () => applyBucket(b.value),
      active: bucket === b.value,
    } as SummaryCard;
  });

  /**
   * Which posting routine is failing, and why. The busiest of each is the first
   * thing worth fixing: one broken account code in a posting path fails every
   * document that goes through it.
   */
  const refTypeCards: SummaryCard[] = (summary?.by_reference_type ?? []).slice(0, MAX_REFERENCE_TYPES).map(g => ({
    label: g.label,
    value: formatNumber(g.count),
    color: g.count > 0 ? 'purple' : 'gray',
    icon: Layers,
    subValue: `${formatCurrency(g.value)} · ${formatPercent(g.share_pct ?? 0)}`,
  }));

  const errorCards: SummaryCard[] = (summary?.by_error_class ?? []).slice(0, MAX_REFERENCE_TYPES).map(g => ({
    label: g.label,
    value: formatNumber(g.count),
    color: g.count > 0 ? 'red' : 'gray',
    icon: Bug,
    subValue: `${formatCurrency(g.value)} · ${formatPercent(g.share_pct ?? 0)}`,
  }));

  /** A datetime cell; the queue is read by when things broke, not by amount. */
  const whenCell = (value: string | null) =>
    value ? <span className="whitespace-nowrap">{formatDate(value, 'datetime')}</span> : null;

  const columns: ReportColumn<FailedJournalQueueRow>[] = [
    { key: 'occurred_at', header: 'Occurred', cell: (_v, row) => whenCell(row.occurred_at) },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (_v, row) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            row.status === 'resolved'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
          }`}
        >
          {row.status === 'resolved' ? 'Resolved' : 'Unresolved'}
        </span>
      ),
    },
    {
      key: 'age_days',
      header: 'In Queue',
      format: 'number',
      align: 'right',
      cell: (value: number) => (
        <span className={value > 90 ? 'font-medium text-red-600 dark:text-red-400' : ''}>
          {value === 0 ? 'today' : `${formatNumber(value)}d`}
        </span>
      ),
    },
    { key: 'reference_type', header: 'Reference Type', align: 'center' },
    { key: 'reference_number', header: 'Reference #' },
    { key: 'reference_id', header: 'Reference ID' },
    { key: 'description', header: 'Description' },
    { key: 'line_count', header: 'Lines', format: 'number', align: 'right' },
    {
      key: 'failed_value',
      header: 'Value Not Posted',
      format: 'currency',
      align: 'right',
      cell: (value: number, row) => (
        <span className={row.status === 'unresolved' ? 'font-medium text-red-600 dark:text-red-400' : ''}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: 'imbalance',
      header: 'Imbalance',
      format: 'currency',
      align: 'right',
      // Zero is the healthy case and reads far better dimmed than as ৳0.00.
      cell: (value: number) =>
        Math.abs(value) > 0.01 ? (
          <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'error_class',
      header: 'Error Type',
      align: 'center',
      cell: (value: string) => (
        <span className="inline-block whitespace-nowrap rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {value}
        </span>
      ),
    },
    { key: 'error_message', header: 'Error Message' },
    {
      key: 'recurring_count',
      header: 'Recurs',
      format: 'number',
      align: 'right',
      cell: (value: number) =>
        value > 1 ? (
          <span className="font-medium text-amber-600 dark:text-amber-400">{formatNumber(value)}×</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: 'resolved_at', header: 'Resolved At', cell: (_v, row) => whenCell(row.resolved_at) },
    { key: 'resolver_name', header: 'Resolved By' },
    { key: 'resolution_note', header: 'Resolution Note' },
  ];

  /**
   * The footer totals the *whole filtered set*, matching the PDF's totals row —
   * so a column total here and the printed one cannot disagree.
   */
  const totalsRow = summary
    ? {
        reference_type: 'Totals',
        failed_value: formatCurrency(summary.total_value),
        line_count: formatNumber(summary.total_lines),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('accounting', 'failed-journal', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `${formatNumber(summary.total_count)} failures as of ${formatDate(summary.as_of_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Auto-journal attempts that never posted — the queue behind the ledger’s gap';

  return (
    <ReportLayout
      title="Failed Journal Queue"
      description={description}
      icon={AlertTriangle}
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
            <FilterField label="Status">
              <select
                className={filterSelectClass}
                value={status}
                onChange={e => setStatus(e.target.value as FailedJournalQueueStatusFilter)}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="As Of Date" hint="Queue ages are measured against this">
              <CustomDatePicker value={asOfDate} onChange={setAsOfDate} compact />
            </FilterField>
            <FilterField label="Reference Type" hint="Any value, not just the journal enum">
              <input
                type="search"
                className={filterInputClass}
                value={referenceType}
                onChange={e => setReferenceType(e.target.value)}
                placeholder="e.g. purchase, pos"
              />
            </FilterField>
          </FilterRow>

          <FilterRow columns={3}>
            <FilterField label="Occurred From" hint="optional">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="Occurred To" hint="optional">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="Search">
              <input
                type="search"
                className={filterInputClass}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Reference number, ID or error"
              />
            </FilterField>
          </FilterRow>

          <FilterRow>
            <FilterField label="Options">
              <FilterCheckbox
                label="Repeated failures only"
                activeHint="Only references that have failed more than once"
                checked={onlyRecurring}
                onChange={setOnlyRecurring}
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
            {refTypeCards.length > 0 && (
              <div className="mt-3">
                <ReportSummaryCards cards={refTypeCards} />
              </div>
            )}
            {errorCards.length > 0 && (
              <div className="mt-3">
                <ReportSummaryCards cards={errorCards} />
              </div>
            )}
          </>
        ) : undefined
      }
      loading={loading}
      error={error}
      hasData={!!data}
      emptyIcon={CheckCircle2}
      emptyTitle="Queue is clear"
      emptyMessage="No auto-journal failures match these filters."
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
          rowKey={row => row.id}
          searchKeys={[
            'reference_type',
            'reference_number',
            'reference_id',
            'description',
            'error_class',
            'error_message',
            'resolution_note',
          ]}
          showSerial
          serialHeader="#"
        />
      )}
    </ReportLayout>
  );
}