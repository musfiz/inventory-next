'use client';

import { useState } from 'react';
import {
  Percent,
  TrendingUp,
  TrendingDown,
  Coins,
  Layers,
  PackageX,
  ArrowUpRight,
  ArrowDownRight,
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
import type {
  ProfitMarginReport,
  ProfitMarginRow,
  ProfitMarginGroupBy,
  MarginBand,
} from '@/types/report.types';

/** Kept in step with App\Reports\Sales\SalesProfitMarginReport::GROUPS. */
const GROUPS: { value: ProfitMarginGroupBy; label: string }[] = [
  { value: 'product', label: 'Product / Variation' },
  { value: 'category', label: 'Category' },
  { value: 'brand', label: 'Brand' },
];

/** Kept in step with the report's BANDS constant, worst first. */
const BANDS: { value: MarginBand; label: string }[] = [
  { value: 'loss', label: 'Loss (below 0%)' },
  { value: 'marginal', label: 'Marginal (0-5%)' },
  { value: 'thin', label: 'Thin (5-15%)' },
  { value: 'healthy', label: 'Healthy (15-30%)' },
  { value: 'strong', label: 'Strong (30%+)' },
];

const BAND_BADGES: Record<string, string> = {
  loss: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  marginal: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  thin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  healthy: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
  strong: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const PRODUCT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'simple', label: 'Simple' },
  { value: 'variable', label: 'Variable' },
  { value: 'composite', label: 'Composite' },
  { value: 'digital', label: 'Digital' },
  { value: 'service', label: 'Service' },
];

/** Signed change with an arrow, or an em dash when there is no comparison. */
const changeCell = (value: number | null, suffix = '%') => {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const positive = value > 0;
  const neutral = value === 0;
  return (
    <span
      className={
        neutral
          ? 'text-muted-foreground'
          : positive
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
      }
    >
      {positive ? <ArrowUpRight size={12} className="inline" /> : <ArrowDownRight size={12} className="inline" />}{' '}
      {positive ? '+' : ''}
      {formatNumber(value, 1)}
      {suffix}
    </span>
  );
};

export default function ProfitMarginPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<ProfitMarginReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [category, setCategory] = useState<SelectOption | null>(null);
  const [brand, setBrand] = useState<SelectOption | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [groupBy, setGroupBy] = useState<ProfitMarginGroupBy>('product');
  const [band, setBand] = useState<MarginBand | ''>('');
  const [minMargin, setMinMargin] = useState('');
  const [maxMargin, setMaxMargin] = useState('');
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
    if (groupBy !== 'product') params.group_by = groupBy;
    if (band) params.band = band;
    const min = parseFloat(minMargin);
    if (!Number.isNaN(min) && minMargin.trim() !== '') params.min_margin = min;
    const max = parseFloat(maxMargin);
    if (!Number.isNaN(max) && maxMargin.trim() !== '') params.max_margin = max;
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
      const res = await reportService.profitMargin(params as any);
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
  const applyBand = (value: MarginBand) => {
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
    setCategory(null);
    setBrand(null);
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setGroupBy('product');
    setBand('');
    setMinMargin('');
    setMaxMargin('');
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
  const bandByKey = (key: MarginBand) => summary?.by_band?.find((b) => b.key === key);

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Gross Profit',
          value: formatCurrency(summary.total_gross_profit),
          color: summary.total_gross_profit < 0 ? 'red' : 'green',
          icon: summary.total_gross_profit < 0 ? TrendingDown : TrendingUp,
          subValue: `COGS ${formatCurrency(summary.total_cost)}`,
        },
        {
          label: 'Blended Margin',
          value: formatPercent(summary.margin_pct),
          color: 'blue',
          icon: Percent,
          subValue: `on ${formatCurrency(summary.total_revenue)} revenue`,
        },
        {
          label: 'vs Previous Period',
          value:
            summary.revenue_change_pct !== null
              ? formatPercent(Math.abs(summary.revenue_change_pct))
              : '—',
          color: (summary.revenue_change_pct ?? 0) < 0 ? 'orange' : 'green',
          icon: (summary.revenue_change_pct ?? 0) < 0 ? TrendingDown : TrendingUp,
          subValue: `was ${formatCurrency(summary.prev_revenue)}`,
        },
        {
          label: 'Loss Makers',
          value: formatNumber(summary.loss_groups),
          color: 'red',
          icon: PackageX,
          subValue: `${formatCurrency(summary.loss_value)} lost`,
          onClick: () => applyBand('loss'),
          active: band === 'loss',
        },
        {
          label: 'Marginal + Thin',
          value: formatNumber(
            (bandByKey('marginal')?.groups ?? 0) + (bandByKey('thin')?.groups ?? 0),
            0,
          ),
          color: 'amber',
          icon: Layers,
          subValue: 'under 15% margin',
          onClick: () => applyBand('thin'),
          active: band === 'thin',
        },
        {
          label: 'Healthy + Strong',
          value: formatNumber(
            (bandByKey('healthy')?.groups ?? 0) + (bandByKey('strong')?.groups ?? 0),
            0,
          ),
          color: 'green',
          icon: Coins,
          subValue: '15% margin or better',
          onClick: () => applyBand('strong'),
          active: band === 'strong',
        },
      ]
    : [];

  const columns: ReportColumn<ProfitMarginRow>[] = [
    { key: 'group_name', header: 'Group' },
    {
      key: 'detail',
      header: 'Detail',
      cell: (value: string | null) =>
        value ? <span className="text-xs text-muted-foreground">{value}</span> : null,
    },
    { key: 'units_sold', header: 'Units', format: 'qty', align: 'right' },
    { key: 'revenue', header: 'Revenue', format: 'currency', align: 'right' },
    { key: 'cost', header: 'COGS', format: 'currency', align: 'right' },
    {
      key: 'gross_profit',
      header: 'Gross Profit',
      format: 'currency',
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
                ? 'font-medium text-amber-600 dark:text-amber-400'
                : ''
          }
        >
          {formatPercent(value, 1)}
        </span>
      ),
    },
    { key: 'avg_selling_price', header: 'Avg Price', format: 'currency', align: 'right' },
    { key: 'avg_unit_cost', header: 'Avg Cost', format: 'currency', align: 'right' },
    { key: 'prev_revenue', header: 'Prev Revenue', format: 'currency', align: 'right' },
    { key: 'revenue_change_pct', header: 'Rev Δ', align: 'right', cell: (value: number | null) => changeCell(value) },
    { key: 'prev_margin_pct', header: 'Prev Margin', align: 'right', cell: (value: number | null) => (value === null ? <span className="text-muted-foreground">—</span> : formatPercent(value, 1)) },
    {
      key: 'margin_change_pts',
      header: 'Margin Δ',
      align: 'right',
      cell: (value: number | null) => changeCell(value, ' pts'),
    },
    {
      key: 'margin_band',
      header: 'Band',
      align: 'center',
      cell: (_value: unknown, row: ProfitMarginRow) => (
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
        group_name: 'Totals',
        units_sold: formatNumber(summary.total_units, 2),
        revenue: formatCurrency(summary.total_revenue),
        cost: formatCurrency(summary.total_cost),
        gross_profit: formatCurrency(summary.total_gross_profit),
        margin_pct: formatPercent(summary.margin_pct, 1),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('sales', 'profit-margin', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;
  const groupLabel = GROUPS.find((g) => g.value === (summary?.group_by ?? 'product'))?.label ?? 'Product';

  const description = summary
    ? [
        `By ${groupLabel.toLowerCase()}`,
        `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Realised gross margin by product line, category or brand, against the previous period';

  return (
    <ReportLayout
      title="Profit Margin Analysis"
      description={description}
      icon={Percent}
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
            <FilterField label="Group By">
              <select
                className={filterSelectClass}
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as ProfitMarginGroupBy)}
              >
                {GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Start Date">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="End Date">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
          </FilterRow>

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
            <FilterField label="Margin Band">
              <select className={filterSelectClass} value={band} onChange={(e) => setBand(e.target.value as MarginBand | '')}>
                <option value="">All Bands</option>
                {BANDS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </FilterField>
          </FilterRow>

          <FilterRow>
            <FilterField label="Margin %" hint="Leave blank for no bound">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={-100}
                  max={100}
                  className={filterInputClass}
                  value={minMargin}
                  onChange={(e) => setMinMargin(e.target.value)}
                  placeholder="Min"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="number"
                  min={-100}
                  max={100}
                  className={filterInputClass}
                  value={maxMargin}
                  onChange={(e) => setMaxMargin(e.target.value)}
                  placeholder="Max"
                />
              </div>
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
            <FilterField label="Search">
              <input
                type="search"
                className={filterInputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Group or detail"
              />
            </FilterField>
          </FilterRow>

          <FilterRow>
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
          rowKey={(row) => `${row.group_name}-${row.detail ?? ''}`}
          searchKeys={['group_name', 'detail']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}