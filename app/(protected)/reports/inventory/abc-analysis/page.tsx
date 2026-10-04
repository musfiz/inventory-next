'use client';

import { useState } from 'react';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  PieChart,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import commonService from '@/services/commonService';
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
import type { AbcClass, AbcMetric, AbcAnalysisReport, AbcAnalysisRow } from '@/types/report.types';

const METRICS: { value: AbcMetric; label: string }[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'quantity', label: 'Units Sold' },
  { value: 'profit', label: 'Profit' },
];

const CLASSES: { value: AbcClass; label: string }[] = [
  { value: 'A', label: 'Class A (top 80%)' },
  { value: 'B', label: 'Class B (80–95%)' },
  { value: 'C', label: 'Class C (bottom 5%)' },
];

const CLASS_BADGES: Record<string, string> = {
  A: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  B: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  C: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const PRODUCT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'simple', label: 'Simple' },
  { value: 'variable', label: 'Variable' },
  { value: 'composite', label: 'Composite' },
  { value: 'digital', label: 'Digital' },
  { value: 'service', label: 'Service' },
];

export default function AbcAnalysisPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<AbcAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [category, setCategory] = useState<SelectOption | null>(null);
  const [brand, setBrand] = useState<SelectOption | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [metric, setMetric] = useState<AbcMetric>('revenue');
  const [abcClass, setAbcClass] = useState<AbcClass | ''>('');
  const [productType, setProductType] = useState('');
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;
  const businessTypeId =
    (authUser as any)?.tenant?.business_type?.id ?? (authUser as any)?.business_type?.id ?? undefined;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (category) params.category_id = category.value;
    if (brand) params.brand_id = brand.value;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (metric !== 'revenue') params.metric = metric;
    if (abcClass) params.class = abcClass;
    if (productType) params.product_type = productType;
    if (search.trim()) params.search = search.trim();
    params.include_inactive = includeInactive ? 1 : 0;
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.abcAnalysis(params as any);
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

  /** Clicking an already-active class clears it, so the card toggles. */
  const applyClass = (value: AbcClass) => {
    const next = abcClass === value ? '' : value;
    setAbcClass(next);
    const params = buildParams();
    if (next === '') {
      delete params.class;
    } else {
      params.class = next;
    }
    fetchReport(params);
  };

  const reset = () => {
    setSelectedTenantId('');
    setCategory(null);
    setBrand(null);
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setMetric('revenue');
    setAbcClass('');
    setProductType('');
    setSearch('');
    setIncludeInactive(false);
    setData(null);
    setError(null);
  };

  const loadCategories = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const rows = await commonService.getCategoriesForDropdown({
        search: inputValue,
        tenant_id: scopeTenantId || undefined,
        business_type_id: scopeTenantId ? undefined : businessTypeId,
      });
      return (rows || []).map((c: any) => ({ value: String(c.id), label: c.name }));
    } catch {
      return [];
    }
  };

  const loadBrands = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const rows = await commonService.getBrandsForDropdown({
        search: inputValue,
        tenant_id: scopeTenantId || undefined,
        business_type_id: scopeTenantId ? undefined : businessTypeId,
      });
      return (rows || []).map((b: any) => ({ value: String(b.id), label: b.name }));
    } catch {
      return [];
    }
  };

  const summary = data?.summary;
  const metricLabel = METRICS.find(m => m.value === summary?.metric)?.label ?? 'Revenue';
  const classByKey = (key: AbcClass) => summary?.by_class?.find((b) => b.key === key);

  /** Formats a value in the units of the currently selected metric. */
  const metricValue = (v: number) =>
    summary?.metric === 'quantity' ? formatNumber(v, 0) : formatCurrency(v);

  const cards: SummaryCard[] = summary
    ? [
        {
          label: `Total ${metricLabel}`,
          value: metricValue(summary.metric_total),
          color: 'green',
          icon: Coins,
          subValue: `${formatNumber(summary.total_lines)} SKUs · ${formatNumber(summary.total_units)} units`,
        },
        {
          label: 'Ranked SKUs',
          value: formatNumber(summary.total_lines),
          color: 'purple',
          icon: Layers,
        },
        {
          label: 'Class A',
          value: metricValue(classByKey('A')?.value ?? 0),
          color: 'green',
          icon: TrendingUp,
          subValue: `${formatPercent(classByKey('A')?.share_pct ?? 0)} of ${metricLabel.toLowerCase()} · ${formatNumber(classByKey('A')?.lines ?? 0)} SKUs`,
          onClick: () => applyClass('A'),
          active: abcClass === 'A',
        },
        {
          label: 'Class B',
          value: metricValue(classByKey('B')?.value ?? 0),
          color: 'amber',
          icon: Clock,
          subValue: `${formatPercent(classByKey('B')?.share_pct ?? 0)} · ${formatNumber(classByKey('B')?.lines ?? 0)} SKUs`,
          onClick: () => applyClass('B'),
          active: abcClass === 'B',
        },
        {
          label: 'Class C',
          value: metricValue(classByKey('C')?.value ?? 0),
          color: 'red',
          icon: TrendingDown,
          subValue: `${formatPercent(classByKey('C')?.share_pct ?? 0)} · ${formatNumber(classByKey('C')?.lines ?? 0)} SKUs`,
          onClick: () => applyClass('C'),
          active: abcClass === 'C',
        },
      ]
    : [];

  const columns: ReportColumn<AbcAnalysisRow>[] = [
    { key: 'rank', header: 'Rank', format: 'number', align: 'right' },
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    {
      key: 'sku',
      header: 'SKU',
      cell: (value: string) => <span className="font-mono text-xs">{value}</span>,
    },
    { key: 'category_name', header: 'Category' },
    { key: 'brand_name', header: 'Brand' },
    { key: 'units_sold', header: 'Units Sold', format: 'qty', align: 'right' },
    { key: 'revenue', header: 'Revenue', format: 'currency', align: 'right' },
    { key: 'profit', header: 'Profit', format: 'currency', align: 'right' },
    {
      key: 'cumulative_pct',
      header: 'Cumulative %',
      align: 'right',
      cell: (value: number) => <span>{formatPercent(value, 1)}</span>,
    },
    {
      key: 'class_label',
      header: 'Class',
      align: 'center',
      cell: (_value: unknown, row: AbcAnalysisRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            CLASS_BADGES[row.class] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {row.class_label}
        </span>
      ),
    },
  ];

  const totalsRow = summary
    ? {
        product_name: 'Totals',
        units_sold: formatNumber(summary.total_units, 2),
        revenue: formatCurrency(summary.total_revenue),
        profit: formatCurrency(summary.total_profit),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('inventory', 'abc-analysis', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `Ranked by ${metricLabel.toLowerCase()}`,
        `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Pareto split of what sells: A, B and C class ranks by revenue, units or profit';

  return (
    <ReportLayout
      title="ABC Analysis"
      description={description}
      icon={PieChart}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading} actionsPlacement="below">
          {isSuperAdmin && (
            <FilterRow columns={1}>
              <FilterField label="Tenant" className="max-w-sm">
                <TenantSelect
                  value={selectedTenantId}
                  onChange={(tid) => {
                    setSelectedTenantId(tid || '');
                    setCategory(null);
                    setBrand(null);
                  }}
                  placeholder="Select a tenant"
                  compact
                  isClearable
                />
              </FilterField>
            </FilterRow>
          )}

          <FilterRow columns={3}>
            <FilterField label="Category" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`cat-${scopeTenantId || 'unscoped'}`}
                value={category}
                onChange={setCategory}
                loadOptions={loadCategories}
                defaultOptions={scopeReady}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All categories' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Brand" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`brand-${scopeTenantId || 'unscoped'}`}
                value={brand}
                onChange={setBrand}
                loadOptions={loadBrands}
                defaultOptions={scopeReady}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All brands' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Product Type">
              <select className={filterSelectClass} value={productType} onChange={(e) => setProductType(e.target.value)}>
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FilterField>
          </FilterRow>

          <FilterRow columns={3}>
            <FilterField label="Start Date">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="End Date">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="Rank By">
              <select className={filterSelectClass} value={metric} onChange={(e) => setMetric(e.target.value as AbcMetric)}>
                {METRICS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </FilterField>
          </FilterRow>

          <FilterRow>
            <FilterField label="Class">
              <select
                className={filterSelectClass}
                value={abcClass}
                onChange={(e) => setAbcClass(e.target.value as AbcClass | '')}
              >
                <option value="">All Classes</option>
                {CLASSES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
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
                placeholder="Name, SKU or barcode"
              />
            </FilterField>
            <FilterField label="Options">
              <FilterCheckbox
                label="Include inactive"
                activeHint="Adds archived products to the report"
                checked={includeInactive}
                onChange={setIncludeInactive}
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
        <ReportTable
          columns={columns}
          data={data.data}
          pageSize={25}
          totalsRow={totalsRow}
          rowKey={(row) => row.sku}
          searchKeys={['product_name', 'variation_name', 'sku', 'barcode', 'category_name', 'brand_name']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}
