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
  PackageCheck,
  Undo2,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import supplierService from '@/services/supplierService';
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
  SupplierAgingReport,
  SupplierAgingRow,
  SupplierAgingBucket,
} from '@/types/report.types';

/** Kept in step with App\Reports\Purchase\SupplierAgingReport::BUCKETS. */
const BUCKETS: { value: SupplierAgingBucket; label: string }[] = [
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

const SUPPLIER_STATUSES = [
  { value: '', label: 'All Suppliers' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'blacklisted', label: 'Blacklisted' },
];

export default function SupplierAgingPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<SupplierAgingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [supplier, setSupplier] = useState<SelectOption | null>(null);
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [supplierStatus, setSupplierStatus] = useState('');
  const [search, setSearch] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [bucket, setBucket] = useState<SupplierAgingBucket | ''>('');

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (supplier) params.supplier_id = supplier.value;
    if (asOfDate) params.as_of_date = asOfDate;
    if (supplierStatus) params.supplier_status = supplierStatus;
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
      const res = await reportService.supplierAging(params as any);
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
  const applyBucket = (value: SupplierAgingBucket) => {
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
    setSupplier(null);
    setAsOfDate(todayISO());
    setSupplierStatus('');
    setSearch('');
    setOnlyOverdue(false);
    setBucket('');
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

  const summary = data?.summary;
  const bucketByKey = (key: SupplierAgingBucket) => summary?.by_bucket?.find((b) => b.key === key);

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Total Payable',
          value: formatCurrency(summary.total_payable),
          color: 'red',
          icon: Wallet,
          subValue: `${formatNumber(summary.total_suppliers)} suppliers · ${formatNumber(summary.po_count)} POs`,
        },
        {
          label: 'Total Overdue',
          value: formatCurrency(summary.total_overdue),
          color: 'orange',
          icon: AlertTriangle,
          subValue: `${formatPercent(summary.overdue_pct)} of the book`,
        },
        {
          label: 'Overdue Suppliers',
          value: formatNumber(summary.overdue_supplier_count),
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
          subValue: `${formatNumber(bucketByKey('current')?.suppliers ?? 0)} suppliers`,
          onClick: () => applyBucket('current'),
          active: bucket === 'current',
        },
        {
          label: 'Over Credit Limit',
          value: formatNumber(summary.over_limit_suppliers),
          color: summary.over_limit_suppliers > 0 ? 'red' : 'green',
          icon: ShieldAlert,
          subValue: summary.over_limit_suppliers > 0 ? 'needs a stop on further orders' : 'all within limits',
        },
        {
          label: 'Open Commitments',
          value: formatCurrency(summary.open_commitment_value),
          color: 'blue',
          icon: PackageCheck,
          subValue: 'ordered, not yet received',
        },
        {
          label: '90+ Days',
          value: formatCurrency(bucketByKey('d_90_plus')?.amount ?? 0),
          color: 'red',
          icon: Layers,
          subValue: `${formatNumber(bucketByKey('d_90_plus')?.suppliers ?? 0)} suppliers · ${formatPercent(bucketByKey('d_90_plus')?.share_pct ?? 0)}`,
          onClick: () => applyBucket('d_90_plus'),
          active: bucket === 'd_90_plus',
        },
      ]
    : [];

  /** One card per aging bucket, so the ladder itself is the drill-down. */
  const bucketCards: SummaryCard[] = BUCKETS.map((b) => {
    const stat = bucketByKey(b.value);
    const tone =
      b.value === 'current' ? 'green' : b.value === 'd_90_plus' ? 'red' : b.value === 'd_1_30' ? 'orange' : 'amber';
    return {
      label: b.label,
      value: formatCurrency(stat?.amount ?? 0),
      color: tone,
      subValue: `${formatNumber(stat?.suppliers ?? 0)} suppliers · ${formatPercent(stat?.share_pct ?? 0)}`,
      onClick: () => applyBucket(b.value),
      active: bucket === b.value,
    } as SummaryCard;
  });

  /** Money column, dimmed when the bucket is empty for this supplier. */
  const bucketCell = (value: number) => (
    <span className={value > 0 ? '' : 'text-muted-foreground'}>{formatCurrency(value)}</span>
  );

  const columns: ReportColumn<SupplierAgingRow>[] = [
    { key: 'supplier_name', header: 'Supplier' },
    { key: 'code', header: 'Code' },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email' },
    {
      key: 'total_payable',
      header: 'Total Payable',
      format: 'currency',
      align: 'right',
      cell: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
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
    { key: 'po_count', header: 'POs', format: 'number', align: 'right' },
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
      cell: (_value: unknown, row: SupplierAgingRow) => (
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
        supplier_name: 'Totals',
        total_payable: formatCurrency(summary.total_payable),
        current: formatCurrency(summary.total_current),
        d_1_30: formatCurrency(bucketByKey('d_1_30')?.amount ?? 0),
        d_31_60: formatCurrency(bucketByKey('d_31_60')?.amount ?? 0),
        d_61_90: formatCurrency(bucketByKey('d_61_90')?.amount ?? 0),
        d_90_plus: formatCurrency(bucketByKey('d_90_plus')?.amount ?? 0),
        total_overdue: formatCurrency(summary.total_overdue),
        overdue_pct: formatPercent(summary.overdue_pct, 1),
        po_count: formatNumber(summary.po_count),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('supplier', 'aging', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `Balances as of ${formatDate(summary.as_of_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Who we owe, and how stale the debt is — the payables statement';

  return (
    <ReportLayout
      title="Supplier Aging"
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
                    setSupplier(null);
                  }}
                  placeholder="Select a tenant"
                  compact
                  isClearable
                />
              </FilterField>
            </FilterRow>
          )}

          <FilterRow columns={3}>
            <FilterField label="As Of Date" hint="Payables are aged against this date">
              <CustomDatePicker value={asOfDate} onChange={setAsOfDate} compact />
            </FilterField>
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
            <FilterField label="Supplier Status">
              <select
                className={filterSelectClass}
                value={supplierStatus}
                onChange={(e) => setSupplierStatus(e.target.value)}
              >
                {SUPPLIER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
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
                placeholder="Supplier, code, phone, email or PO no."
              />
            </FilterField>
            <FilterField label="Options">
              <FilterCheckbox
                label="Overdue only"
                activeHint="Hides suppliers whose balance is entirely not yet due"
                checked={onlyOverdue}
                onChange={setOnlyOverdue}
              />
            </FilterField>
          </FilterRow>
        </ReportFilters>
      }
      summaryCards={
        cards.length > 0 && summary ? (
          <>
            <ReportSummaryCards cards={cards} />
            <div className="mt-3">
              <ReportSummaryCards cards={bucketCards} />
            </div>
            {summary.unlinked_return_value > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Undo2 className="h-3.5 w-3.5" aria-hidden />
                {formatCurrency(summary.unlinked_return_value)} in returns could not be tied to a single
                purchase order, so it is excluded from the buckets above.
              </p>
            )}
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
          rowKey={(row) => row.supplier_id}
          searchKeys={['supplier_name', 'code', 'phone', 'email', 'po_numbers']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}