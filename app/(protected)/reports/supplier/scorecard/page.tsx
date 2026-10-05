'use client';

import { useState } from 'react';
import {
  Trophy,
  Award,
  AlertTriangle,
  Gauge,
  TrendingUp,
  Package,
  Ban,
  Percent,
  Scale,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import supplierService from '@/services/supplierService';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDate,
  todayISO,
  firstDayOfMonthISO,
} from '@/lib/utils/format';
import { notify } from '@/lib/notifications';
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
import { useServerReportExport } from '@/hooks/reports/use-server-report-export';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type {
  SupplierScorecardReport,
  SupplierScorecardRow,
  SupplierGrade,
} from '@/types/report.types';

/** Kept in step with App\Reports\Purchase\SupplierScorecardReport::GRADES. */
const GRADES: SupplierGrade[] = ['excellent', 'good', 'fair', 'poor'];

const GRADE_BADGES: Record<SupplierGrade, string> = {
  excellent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  fair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  poor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const GRADE_CARD_COLOR: Record<SupplierGrade, SummaryCard['color']> = {
  excellent: 'green',
  good: 'blue',
  fair: 'amber',
  poor: 'red',
};

/** Zero or absent readings stay quiet so real signals stand out. */
const muted = 'text-muted-foreground';

function points(value: number | null): string {
  return value === null ? '—' : formatNumber(value, 0);
}

/**
 * A percentage that is null (unmeasurable) is meaningfully different from 0%.
 * Rendering both as "0%" is how a supplier with no delivery record ends up
 * looking perfect.
 */
function pct(value: number | null): string {
  return value === null ? '—' : formatPercent(value);
}

function shiftDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

const PERIOD_PRESETS = [
  { label: 'This Month', from: () => firstDayOfMonthISO(), to: () => todayISO() },
  { label: 'Last 30 Days', from: () => shiftDays(-30), to: () => todayISO() },
  { label: 'Last 90 Days', from: () => shiftDays(-90), to: () => todayISO() },
  { label: 'Last 180 Days', from: () => shiftDays(-180), to: () => todayISO() },
  { label: 'This Year', from: () => `${todayISO().slice(0, 4)}-01-01`, to: () => todayISO() },
];

export default function SupplierScorecardPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<SupplierScorecardReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [supplier, setSupplier] = useState<SelectOption | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [grade, setGrade] = useState<SupplierGrade | ''>('');
  const [search, setSearch] = useState('');

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (supplier) params.supplier_id = supplier.value;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (grade) params.grade = grade;
    if (search.trim()) params.search = search.trim();
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      setData(await reportService.supplierScorecard(params));
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load report';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const generate = () => fetchReport(buildParams());

  /** Clicking the active grade clears it, so the cards toggle. */
  const applyGrade = (value: SupplierGrade) => {
    const next = grade === value ? '' : value;
    setGrade(next);
    const params = buildParams();
    if (next === '') {
      delete params.grade;
    } else {
      params.grade = next;
    }
    fetchReport(params);
  };

  const reset = () => {
    setSelectedTenantId('');
    setSupplier(null);
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setGrade('');
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

  const summary = data?.summary;
  const rows = data?.data ?? [];

  const headline: SummaryCard[] = summary
    ? [
        {
          label: 'Avg Score',
          value: summary.avg_score === null ? '—' : formatNumber(summary.avg_score, 1),
          color: 'blue',
          icon: Gauge,
          subValue: `${formatNumber(summary.scored_suppliers)} of ${formatNumber(summary.total_suppliers)} scored`,
        },
        {
          label: 'Best Supplier',
          value: summary.best_supplier ?? '—',
          color: 'green',
          icon: Trophy,
          subValue:
            summary.best_supplier_score === null
              ? 'no measurable deliveries'
              : `scored ${formatNumber(summary.best_supplier_score, 1)}`,
        },
        {
          label: 'Needs Attention',
          value: formatNumber(summary.needs_attention),
          color: summary.needs_attention > 0 ? 'red' : 'green',
          icon: AlertTriangle,
          subValue: `${formatNumber(summary.unscored_suppliers)} unscorable`,
        },
        {
          label: 'Purchase Value',
          value: formatCurrency(summary.total_purchase_value),
          color: 'purple',
          icon: TrendingUp,
          subValue: `${formatNumber(summary.total_pos)} purchase orders`,
        },
      ]
    : [];

  /**
   * One card per grade, doubling as the grade filter. Counts come from the
   * summary so they always total with the unscorable row rather than only
   * covering whoever is currently filtered into view.
   */
  const gradeCards: SummaryCard[] = summary
    ? GRADES.map((g) => {
        const entry = summary.by_grade.find((b) => b.grade === g);
        return {
          label: entry?.label ?? g,
          value: formatNumber(entry?.value ?? 0),
          color: GRADE_CARD_COLOR[g],
          subValue: 'suppliers',
          onClick: () => applyGrade(g),
          active: grade === g,
        } as SummaryCard;
      })
    : [];

  const columns: ReportColumn<SupplierScorecardRow>[] = [
    { key: 'supplier_name', header: 'Supplier' },
    {
      key: 'grade',
      header: 'Grade',
      align: 'center',
      cell: (_value: unknown, row: SupplierScorecardRow) =>
        row.grade ? (
          <span
            className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium capitalize ${GRADE_BADGES[row.grade]}`}
          >
            {row.grade}
          </span>
        ) : (
          <span className={`text-xs ${muted}`}>unscored</span>
        ),
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      cell: (value: number | null) =>
        value === null ? (
          <span className={muted}>—</span>
        ) : (
          <span className="font-semibold">{formatNumber(value, 1)}</span>
        ),
    },
    {
      key: 'on_time_points',
      header: 'On-Time Pts',
      align: 'right',
      cell: (value: number | null) => <span className={value === null ? muted : ''}>{points(value)}</span>,
    },
    {
      key: 'lead_time_points',
      header: 'Lead Pts',
      align: 'right',
      cell: (value: number | null) => <span className={value === null ? muted : ''}>{points(value)}</span>,
    },
    {
      key: 'returns_points',
      header: 'Returns Pts',
      align: 'right',
      cell: (value: number | null) => <span className={value === null ? muted : ''}>{points(value)}</span>,
    },
    {
      key: 'price_points',
      header: 'Price Pts',
      align: 'right',
      cell: (value: number | null) => <span className={value === null ? muted : ''}>{points(value)}</span>,
    },
    {
      key: 'on_time_delivery_pct',
      header: 'On-Time %',
      align: 'right',
      cell: (value: number | null) => <span className={value === null ? muted : ''}>{pct(value)}</span>,
    },
    {
      key: 'avg_lead_time_days',
      header: 'Lead Time',
      align: 'right',
      cell: (value: number | null) => (
        <span className={value === null ? muted : ''}>
          {value === null ? '—' : `${formatNumber(value, 1)}d`}
        </span>
      ),
    },
    {
      key: 'return_rate_pct',
      header: 'Return Rate',
      align: 'right',
      cell: (value: number | null) => <span className={value === null ? muted : ''}>{pct(value)}</span>,
    },
    {
      key: 'price_index_pct',
      header: 'Price Index',
      align: 'right',
      // Above 100 means dearer than peers; the colour says so at a glance.
      cell: (value: number | null) => (
        <span
          className={
            value === null
              ? muted
              : value > 105
                ? 'font-medium text-red-700 dark:text-red-400'
                : value < 95
                  ? 'font-medium text-green-700 dark:text-green-400'
                  : ''
          }
        >
          {pct(value)}
        </span>
      ),
    },
    { key: 'po_count', header: 'POs', format: 'number', align: 'right' },
    { key: 'total_purchase_value', header: 'Purchase Value', format: 'currency', align: 'right' },
    {
      key: 'flag_list',
      header: 'Flags',
      cell: (value: string[]) =>
        value?.length ? (
          <span className="flex flex-wrap gap-1">
            {value.map((flag) => (
              <span
                key={flag}
                className="inline-block whitespace-nowrap rounded bg-orange-100 px-1.5 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
              >
                {flag}
              </span>
            ))}
          </span>
        ) : (
          <span className={muted}>—</span>
        ),
    },
  ];

  const totalsRow = summary
    ? {
        po_count: formatNumber(summary.total_pos, 0),
        total_purchase_value: formatCurrency(summary.total_purchase_value),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport } =
    useServerReportExport('supplier', 'scorecard', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Delivery reliability, returns and relative price, scored and ranked per supplier';

  return (
    <ReportLayout
      title="Supplier Scorecard"
      description={description}
      icon={Award}
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

          <FilterRow columns={4}>
            <FilterField
              label="Supplier"
              hint={scopeReady ? 'optional' : 'select a tenant first'}
            >
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
            <FilterField label="Start Date">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="End Date">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="Grade">
              <select
                className={filterSelectClass}
                value={grade}
                onChange={(e) => setGrade(e.target.value as SupplierGrade | '')}
              >
                <option value="">All Grades</option>
                {GRADES.map((g) => (
                  <option key={g} value={g} className="capitalize">
                    {g}
                  </option>
                ))}
              </select>
            </FilterField>
          </FilterRow>

          <FilterRow>
            <FilterField label="Period">
              <div className="flex flex-wrap gap-1.5">
                {PERIOD_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setStartDate(p.from());
                      setEndDate(p.to());
                    }}
                    className="rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </FilterField>
            <FilterField label="Search">
              <input
                type="search"
                className={filterInputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Supplier name"
              />
            </FilterField>
          </FilterRow>
        </ReportFilters>
      }
      summaryCards={
        headline.length > 0 ? (
          <>
            <ReportSummaryCards cards={headline} />
            <div className="mt-3">
              <ReportSummaryCards cards={gradeCards} />
            </div>
            {summary && (
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" aria-hidden />
                  Delivery evidence for{' '}
                  {summary.delivery_coverage_pct === null ? 'no deliveries' : formatPercent(summary.delivery_coverage_pct)}
                </span>
                <span className="flex items-center gap-1">
                  <Scale className="h-3.5 w-3.5" aria-hidden />
                  Price benchmark for{' '}
                  {summary.price_coverage_pct === null ? 'no spend' : formatPercent(summary.price_coverage_pct)}
                </span>
                {summary.unscored_suppliers > 0 && (
                  <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                    <Ban className="h-3.5 w-3.5" aria-hidden />
                    {formatNumber(summary.unscored_suppliers)} supplier
                    {summary.unscored_suppliers === 1 ? '' : 's'} had no receipts to score
                  </span>
                )}
                {summary.return_rate_pct !== null && (
                  <span className="flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5" aria-hidden />
                    {formatPercent(summary.return_rate_pct)} of spend returned
                  </span>
                )}
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
          onPrint={printReport}
          loading={!!exportLoading}
          disabled={!data}
        />
      }
    >
      {data && (
        <ReportTable
          columns={columns}
          data={rows}
          pageSize={25}
          totalsRow={totalsRow}
          rowKey={(row) => row.supplier_id}
          showSerial
          serialHeader="#"
          emptyMessage="No purchase orders in this period, so there is nothing to score."
        />
      )}
    </ReportLayout>
  );
}