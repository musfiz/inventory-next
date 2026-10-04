'use client';

import { useState } from 'react';
import {
  Truck,
  Coins,
  Timer,
  PackageCheck,
  RotateCcw,
  AlertTriangle,
  Award,
  AlertOctagon,
  Gauge,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import commonService from '@/services/commonService';
import supplierService from '@/services/supplierService';
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
  SupplierPerformanceReport,
  SupplierPerformanceRow,
  SupplierTier,
} from '@/types/report.types';

/** Kept in step with purchase_orders.status — 'cancelled' is never sent. */
const PO_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'partial', label: 'Partially Received' },
  { value: 'received', label: 'Received' },
  { value: 'completed', label: 'Completed' },
];

const TIER_BADGES: Record<SupplierTier, string> = {
  excellent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  good: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  fair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  poor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const SUPPLIER_STATUS_BADGES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  blacklisted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

/** The composite score's own formula, shown so the number is auditable. */
const SCORE_FORMULA = 'Score = on-time 40% + lead time 35% (100, −3/day past a 14-day target) + returns 25% (100, −2 per 1% returned). Only scored when a delivery has actually been measured.';

export default function SupplierPerformancePage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<SupplierPerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [supplier, setSupplier] = useState<SelectOption | null>(null);
  const [warehouse, setWarehouse] = useState<SelectOption | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [status, setStatus] = useState('');
  const [lateOnly, setLateOnly] = useState(false);
  const [search, setSearch] = useState('');

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (supplier) params.supplier_id = supplier.value;
    if (warehouse) params.warehouse_id = warehouse.value;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (status) params.status = status;
    if (search.trim()) params.search = search.trim();
    params.late_only = lateOnly ? 1 : 0;
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.supplierPerformance(params as any);
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

  /** Clicking an already-active "late" card clears it, so the card toggles. */
  const applyLateOnly = () => {
    const next = !lateOnly;
    setLateOnly(next);
    const params = buildParams();
    if (!next) delete params.late_only;
    else params.late_only = 1;
    fetchReport(params);
  };

  const reset = () => {
    setSelectedTenantId('');
    setSupplier(null);
    setWarehouse(null);
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setStatus('');
    setLateOnly(false);
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

  const loadWarehouses = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const rows = await commonService.getWarehousesByTenant({ search: inputValue, tenant_id: scopeTenantId });
      return (rows || []).map((w: any) => ({ value: String(w.id), label: w.name }));
    } catch {
      return [];
    }
  };

  const summary = data?.summary;

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Purchase Value',
          value: formatCurrency(summary.total_purchase_value),
          color: 'blue',
          icon: Coins,
          subValue: `${formatNumber(summary.total_pos)} POs across ${formatNumber(summary.total_suppliers)} suppliers`,
        },
        {
          label: 'On-Time Delivery',
          value: summary.avg_on_time_rate === null ? '—' : formatPercent(summary.avg_on_time_rate),
          color: (summary.avg_on_time_rate ?? 100) >= 90 ? 'green' : (summary.avg_on_time_rate ?? 0) >= 70 ? 'amber' : 'red',
          icon: PackageCheck,
          subValue:
            summary.delivery_coverage_pct === null
              ? 'no deliveries to measure'
              : `across ${formatNumber(summary.measured_pos)} of ${formatNumber(summary.delivered_pos)} deliveries (${formatPercent(summary.delivery_coverage_pct)} coverage)`,
        },
        {
          label: 'Avg Lead Time',
          value: summary.avg_lead_time_days === null ? '—' : `${formatNumber(summary.avg_lead_time_days, 1)} days`,
          color: 'blue',
          icon: Timer,
          subValue: 'order date to first receipt',
        },
        {
          label: 'Return Rate',
          value: summary.return_rate_pct === null ? '—' : formatPercent(summary.return_rate_pct),
          color: (summary.return_rate_pct ?? 0) > 10 ? 'red' : 'green',
          icon: RotateCcw,
          subValue: `${formatNumber(summary.total_return_count)} returns worth ${formatCurrency(summary.total_return_value)}`,
        },
        {
          label: 'Late Deliveries',
          value: formatNumber(summary.late_pos),
          color: summary.late_pos > 0 ? 'red' : 'green',
          icon: AlertTriangle,
          onClick: applyLateOnly,
          active: lateOnly,
        },
        {
          label: 'Outstanding',
          value: formatCurrency(summary.total_due),
          color: 'amber',
          icon: Gauge,
          subValue: `${formatCurrency(summary.total_paid)} paid so far`,
        },
        {
          label: 'Best Supplier',
          value: summary.best_supplier ?? '—',
          color: 'green',
          icon: Award,
          subValue:
            summary.best_supplier_score === null
              ? 'nothing scored yet'
              : `scored ${formatNumber(summary.best_supplier_score, 1)}`,
        },
        {
          label: 'Worst Supplier',
          value: summary.worst_supplier ?? '—',
          color: 'red',
          icon: AlertOctagon,
          subValue:
            summary.worst_supplier_score === null
              ? 'nothing scored yet'
              : `scored ${formatNumber(summary.worst_supplier_score, 1)}`,
        },
      ]
    : [];

  const columns: ReportColumn<SupplierPerformanceRow>[] = [
    {
      key: 'supplier_name',
      header: 'Supplier',
      cell: (_value: unknown, row: SupplierPerformanceRow) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{row.supplier_name}</span>
            {row.supplier_status && row.supplier_status !== 'active' && (
              <span
                className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium ${SUPPLIER_STATUS_BADGES[row.supplier_status] || SUPPLIER_STATUS_BADGES.inactive}`}
              >
                {row.supplier_status}
              </span>
            )}
          </div>
          {row.email && <div className="truncate text-xs text-muted-foreground">{row.email}</div>}
        </div>
      ),
    },
    { key: 'supplier_code', header: 'Code' },
    { key: 'po_count', header: 'POs', format: 'number', align: 'right' },
    { key: 'total_purchase_value', header: 'Purchase Value', format: 'currency', align: 'right' },
    { key: 'total_paid', header: 'Paid', format: 'currency', align: 'right' },
    {
      key: 'total_due',
      header: 'Due',
      align: 'right',
      cell: (value: number) =>
        value > 0 ? (
          <span className="font-medium text-amber-600 dark:text-amber-400">{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: 'delivered_pos', header: 'Delivered', format: 'number', align: 'right' },
    { key: 'open_pos', header: 'Open', format: 'number', align: 'right' },
    {
      key: 'late_pos',
      header: 'Late',
      format: 'number',
      align: 'right',
      cell: (value: number) =>
        value > 0 ? (
          <span className="font-medium text-red-600 dark:text-red-400">{value}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'measured_pos',
      header: 'Measured',
      format: 'number',
      align: 'right',
      // The coverage count, so the two rates beside it can be read honestly.
      cell: (value: number) => (
        <span className={value === 0 ? 'text-muted-foreground' : undefined}>{value}</span>
      ),
    },
    {
      key: 'on_time_delivery_pct',
      header: 'On-Time %',
      align: 'right',
      cell: (value: number | null) =>
        value === null ? (
          <span className="text-muted-foreground" title="No receipt movements recorded against these orders">
            n/a
          </span>
        ) : (
          <span
            className={
              value >= 90
                ? 'font-medium text-green-600 dark:text-green-400'
                : value >= 70
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'font-medium text-red-600 dark:text-red-400'
            }
          >
            {formatPercent(value)}
          </span>
        ),
    },
    {
      key: 'avg_lead_time_days',
      header: 'Avg Lead Time',
      align: 'right',
      cell: (value: number | null) =>
        value === null ? (
          <span className="text-muted-foreground">n/a</span>
        ) : (
          <span>{formatNumber(value, 1)} d</span>
        ),
    },
    { key: 'return_count', header: 'Returns', format: 'number', align: 'right' },
    {
      key: 'return_value',
      header: 'Return Value',
      align: 'right',
      cell: (value: number) =>
        value > 0 ? (
          <span className="text-red-600 dark:text-red-400">{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'return_rate_pct',
      header: 'Return Rate',
      align: 'right',
      cell: (value: number | null) =>
        value === null ? (
          <span className="text-muted-foreground">n/a</span>
        ) : (
          <span className={value > 10 ? 'font-medium text-red-600 dark:text-red-400' : undefined}>
            {formatPercent(value)}
          </span>
        ),
    },
    {
      key: 'last_purchase_date',
      header: 'Last Purchase',
      cell: (value: string | null) =>
        value ? formatDate(value) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'performance_score',
      header: 'Score',
      align: 'right',
      cell: (value: number | null) =>
        value === null ? (
          <span className="text-muted-foreground" title="No delivery has been measured for this supplier">
            n/a
          </span>
        ) : (
          <span className="font-medium">{formatNumber(value, 1)}</span>
        ),
    },
    {
      key: 'performance_tier',
      header: 'Rating',
      align: 'center',
      cell: (_value: unknown, row: SupplierPerformanceRow) =>
        row.performance_tier ? (
          <span
            className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
              TIER_BADGES[row.performance_tier]
            }`}
          >
            {row.performance_tier.charAt(0).toUpperCase() + row.performance_tier.slice(1)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  const totalsRow = summary
    ? {
        supplier_name: 'Totals',
        po_count: formatNumber(summary.total_pos),
        total_purchase_value: formatCurrency(summary.total_purchase_value),
        total_paid: formatCurrency(summary.total_paid),
        total_due: formatCurrency(summary.total_due),
        delivered_pos: formatNumber(summary.delivered_pos),
        open_pos: formatNumber(summary.open_pos),
        late_pos: formatNumber(summary.late_pos),
        measured_pos: formatNumber(summary.measured_pos),
        on_time_delivery_pct:
          summary.avg_on_time_rate === null ? 'n/a' : formatPercent(summary.avg_on_time_rate),
        avg_lead_time_days:
          summary.avg_lead_time_days === null ? 'n/a' : `${formatNumber(summary.avg_lead_time_days, 1)} d`,
        return_count: formatNumber(summary.total_return_count),
        return_value: formatCurrency(summary.total_return_value),
        return_rate_pct: summary.return_rate_pct === null ? 'n/a' : formatPercent(summary.return_rate_pct),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('purchase', 'supplier-performance', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `${formatNumber(summary.total_suppliers)} suppliers`,
        `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Delivery reliability, lead time, returns and spend, per supplier';

  return (
    <ReportLayout
      title="Supplier Performance"
      description={description}
      icon={Truck}
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
            <FilterField label="Warehouse" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`wh-${scopeTenantId || 'unscoped'}`}
                value={warehouse}
                onChange={setWarehouse}
                loadOptions={loadWarehouses}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All warehouses' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Start Date">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
          </FilterRow>

          <FilterRow columns={3}>
            <FilterField label="End Date">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="PO Status">
              <select className={filterSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                {PO_STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
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
                placeholder="Supplier name, code, email or phone"
              />
            </FilterField>
          </FilterRow>

          <FilterRow>
            <FilterField label="Options">
              <FilterCheckbox
                label="Late deliveries only"
                activeHint="Only suppliers with at least one delivery past its expected date"
                checked={lateOnly}
                onChange={setLateOnly}
              />
            </FilterField>
          </FilterRow>
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} /> : undefined}
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
        <p className="mb-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Score:</span> {SCORE_FORMULA}
        </p>
      )}
      {data && (
        <ReportTable
          columns={columns}
          data={data.data}
          pageSize={25}
          totalsRow={totalsRow}
          rowKey={(row) => row.supplier_id}
          searchKeys={['supplier_name', 'supplier_code', 'email']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}
