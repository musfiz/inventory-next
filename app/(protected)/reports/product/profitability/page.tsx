'use client';

import { useState } from 'react';
import {
  BarChart3,
  Coins,
  TrendingUp,
  TrendingDown,
  Layers,
  PackageX,
  Scale,
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
  ProductProfitabilityReport,
  ProductProfitabilityRow,
  ProfitabilityResult,
} from '@/types/report.types';

const RESULT_BADGES: Record<string, string> = {
  profit: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  breakeven: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  loss: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const RESULT_LABELS: Record<ProfitabilityResult, string> = {
  profit: 'Profit',
  breakeven: 'Break-even',
  loss: 'Loss',
};

const PRODUCT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'simple', label: 'Simple' },
  { value: 'variable', label: 'Variable' },
  { value: 'composite', label: 'Composite' },
  { value: 'digital', label: 'Digital' },
  { value: 'service', label: 'Service' },
];

export default function ProductProfitabilityPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<ProductProfitabilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [category, setCategory] = useState<SelectOption | null>(null);
  const [brand, setBrand] = useState<SelectOption | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [minMargin, setMinMargin] = useState('');
  const [maxMargin, setMaxMargin] = useState('');
  const [productType, setProductType] = useState('');
  const [search, setSearch] = useState('');
  const [includeUnsold, setIncludeUnsold] = useState(false);
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
    // The inputs are percentages; an empty or unparseable field means "no bound".
    const min = parseFloat(minMargin);
    if (!Number.isNaN(min) && minMargin.trim() !== '') params.min_margin = min;
    const max = parseFloat(maxMargin);
    if (!Number.isNaN(max) && maxMargin.trim() !== '') params.max_margin = max;
    if (productType) params.product_type = productType;
    if (search.trim()) params.search = search.trim();
    params.include_unsold = includeUnsold ? 1 : 0;
    params.include_inactive = includeInactive ? 1 : 0;
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.productProfitability(params as any);
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

  const reset = () => {
    setSelectedTenantId('');
    setCategory(null);
    setBrand(null);
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setMinMargin('');
    setMaxMargin('');
    setProductType('');
    setSearch('');
    setIncludeUnsold(false);
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

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Net Profit',
          value: formatCurrency(summary.total_profit),
          color: summary.total_profit < 0 ? 'red' : 'green',
          icon: summary.total_profit < 0 ? TrendingDown : TrendingUp,
          subValue: `${formatNumber(summary.total_units)} units · ${formatNumber(summary.total_products)} products`,
        },
        {
          label: 'Blended Margin',
          value: formatPercent(summary.margin_pct),
          color: 'blue',
          icon: Scale,
          subValue: 'profit ÷ revenue',
        },
        {
          label: 'Revenue',
          value: formatCurrency(summary.total_revenue),
          color: 'purple',
          icon: Coins,
          subValue: `cost ${formatCurrency(summary.total_cost)}`,
        },
        {
          label: 'Loss Makers',
          value: formatNumber(summary.loss_makers),
          color: 'red',
          icon: PackageX,
          subValue: `${formatCurrency(summary.loss_value)} lost`,
        },
        {
          label: 'Capital in Stock',
          value: formatCurrency(summary.total_stock_value),
          color: 'orange',
          icon: Layers,
          subValue: 'value still on the shelf',
        },
      ]
    : [];

  const columns: ReportColumn<ProductProfitabilityRow>[] = [
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    {
      key: 'sku',
      header: 'SKU',
      cell: (value: string) => <span className="font-mono text-xs">{value}</span>,
    },
    { key: 'category_name', header: 'Category' },
    { key: 'units_sold', header: 'Units Sold', format: 'qty', align: 'right' },
    { key: 'revenue', header: 'Revenue', format: 'currency', align: 'right' },
    { key: 'cost', header: 'Cost', format: 'currency', align: 'right' },
    {
      key: 'profit',
      header: 'Profit',
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
              : value === 0
                ? 'text-muted-foreground'
                : ''
          }
        >
          {formatPercent(value, 1)}
        </span>
      ),
    },
    { key: 'avg_selling_price', header: 'Avg Price', format: 'currency', align: 'right' },
    { key: 'avg_unit_cost', header: 'Avg Cost', format: 'currency', align: 'right' },
    { key: 'stock_on_hand', header: 'Stock', format: 'qty', align: 'right' },
    { key: 'stock_value', header: 'Stock Value', format: 'currency', align: 'right' },
    {
      key: 'profitability',
      header: 'Result',
      align: 'center',
      cell: (_value: unknown, row: ProductProfitabilityRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            RESULT_BADGES[row.profitability] || RESULT_BADGES.breakeven
          }`}
        >
          {RESULT_LABELS[row.profitability] || row.profitability}
        </span>
      ),
    },
  ];

  const totalsRow = summary
    ? {
        product_name: 'Totals',
        units_sold: formatNumber(summary.total_units, 2),
        revenue: formatCurrency(summary.total_revenue),
        cost: formatCurrency(summary.total_cost),
        profit: formatCurrency(summary.total_profit),
        margin_pct: formatPercent(summary.margin_pct, 1),
        stock_value: formatCurrency(summary.total_stock_value),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('product', 'profitability', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Realised margin per variation, from the order lines rather than the price list';

  return (
    <ReportLayout
      title="Product Profitability"
      description={description}
      icon={BarChart3}
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
          </FilterRow>

          <FilterRow>
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
              <div className="flex flex-wrap items-center gap-4">
                <FilterCheckbox
                  label="Include never-sold"
                  activeHint="Adds catalogue items with no sales in the period"
                  checked={includeUnsold}
                  onChange={setIncludeUnsold}
                />
                <FilterCheckbox
                  label="Include inactive"
                  activeHint="Adds archived products to the report"
                  checked={includeInactive}
                  onChange={setIncludeInactive}
                />
              </div>
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