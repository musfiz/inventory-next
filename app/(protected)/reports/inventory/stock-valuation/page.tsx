'use client';

import { useState } from 'react';
import {
  Coins,
  TrendingUp,
  Layers,
  Package,
  Scale,
  Lock,
  PieChart,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import commonService from '@/services/commonService';
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
  CostingMethod,
  StockValuationReport,
  StockValuationRow,
  ValuationBreakdownRow,
} from '@/types/report.types';

/** Kept in step with App\Reports\Inventory\StockValuationReport::COSTING_METHODS. */
const COSTING_METHODS: { value: CostingMethod; label: string; hint: string }[] = [
  { value: 'weighted_avg', label: 'Weighted Average', hint: 'Maintained moving average cost' },
  { value: 'fifo', label: 'FIFO', hint: 'Oldest inbound cost layer' },
  { value: 'lifo', label: 'LIFO', hint: 'Newest inbound cost layer' },
  { value: 'standard', label: 'Standard Cost', hint: 'Product master standard cost' },
];

const PRODUCT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'simple', label: 'Simple' },
  { value: 'variable', label: 'Variable' },
  { value: 'composite', label: 'Composite' },
  { value: 'digital', label: 'Digital' },
  { value: 'service', label: 'Service' },
];

const COST_BASIS_STYLES: Record<string, string> = {
  Costed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'No cost': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'No stock': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

/** "Where the money sits" — value by category / by warehouse, with share bars. */
function ValueBreakdown({
  title,
  rows,
}: {
  title: string;
  rows: ValuationBreakdownRow[];
}) {
  if (!rows?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <ChevronRight size={13} className="text-indigo-600 dark:text-indigo-400" />
        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{title}</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate text-gray-700 dark:text-gray-300">{r.name}</span>
              <span className="shrink-0 font-mono text-gray-900 dark:text-white">
                {formatCurrency(r.value)}
                <span className="ml-1 text-gray-400">{formatPercent(r.share_pct, 0)}</span>
              </span>
            </div>
            <div className="mt-0.5 h-1 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded bg-indigo-500/70"
                style={{ width: `${Math.min(Math.max(r.share_pct, 0), 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StockValuationPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<StockValuationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [warehouse, setWarehouse] = useState<SelectOption | null>(null);
  const [category, setCategory] = useState<SelectOption | null>(null);
  const [brand, setBrand] = useState<SelectOption | null>(null);
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [costingMethod, setCostingMethod] = useState<CostingMethod>('weighted_avg');
  const [productType, setProductType] = useState('');
  const [search, setSearch] = useState('');
  const [minValue, setMinValue] = useState('');
  const [includeZeroStock, setIncludeZeroStock] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  // The tenant whose catalogue the category/brand/warehouse dropdowns list.
  // A super admin has no tenant of their own to scope by, so those dropdowns
  // stay inert until one is picked; a tenant user is always scoped to their own.
  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;
  const businessTypeId =
    (authUser as any)?.tenant?.business_type?.id ?? (authUser as any)?.business_type?.id ?? undefined;

  const costingLabel = COSTING_METHODS.find(m => m.value === costingMethod)?.label ?? 'Weighted Average';
  const isHistorical = !!data?.summary.is_historical;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (warehouse) params.warehouse_id = warehouse.value;
    if (category) params.category_id = category.value;
    if (brand) params.brand_id = brand.value;
    if (asOfDate) params.as_of_date = asOfDate;
    if (costingMethod) params.costing_method = costingMethod;
    if (productType) params.product_type = productType;
    if (search.trim()) params.search = search.trim();
    // Number() on a cleared/garbage field yields NaN, which would serialise into
    // the query string and fail the API's numeric rule.
    if (minValue.trim() && Number.isFinite(Number(minValue))) params.min_value = Number(minValue);
    // Always sent so the API gets an explicit boolean. Query strings only carry
    // text, and Laravel's `boolean` rule rejects "true"/"false" — it accepts
    // 1/0, so serialise the flags as numbers instead of JS booleans.
    params.include_zero_stock = includeZeroStock ? 1 : 0;
    params.include_inactive = includeInactive ? 1 : 0;
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.stockValuation(params);
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
    setWarehouse(null);
    setCategory(null);
    setBrand(null);
    setAsOfDate(todayISO());
    setCostingMethod('weighted_avg');
    setProductType('');
    setSearch('');
    setMinValue('');
    setIncludeZeroStock(false);
    setIncludeInactive(false);
    setData(null);
    setError(null);
  };

  const loadWarehouses = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const rows = await commonService.getWarehousesByTenant({ search: inputValue, tenant_id: scopeTenantId });
      return (rows || []).map((w: any) => ({ value: String(w.id), label: w.code ? `${w.name} (${w.code})` : w.name }));
    } catch {
      return [];
    }
  };

  // Categories and brands are resolved tenant-wise: the server maps tenant_id
  // to its business_type_id, so the list matches the tenant being reported on.
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
          label: 'Stock Value (Cost)',
          value: formatCurrency(summary.total_stock_value),
          color: 'green',
          icon: Coins,
          subValue: `${costingLabel} costing`,
        },
        {
          label: 'Retail Value',
          value: formatCurrency(summary.total_retail_value),
          color: 'blue',
          icon: TrendingUp,
          subValue: `Margin ${formatCurrency(summary.potential_margin)}${
            summary.margin_pct !== null ? ` (${formatPercent(summary.margin_pct)})` : ''
          }`,
        },
        { label: 'Total SKUs', value: formatNumber(summary.total_skus), color: 'gray', icon: Layers, subValue: `${formatNumber(summary.total_lines)} valuation lines` },
        { label: 'Units on Hand', value: formatNumber(summary.total_quantity, 2), color: 'purple', icon: Package },
        { label: 'Avg Unit Cost', value: formatCurrency(summary.avg_unit_cost), color: 'amber', icon: Scale, subValue: `Avg ${formatCurrency(summary.avg_value_per_line)} per line` },
        {
          label: 'Reserved Value',
          value: formatCurrency(summary.total_reserved_value),
          color: 'purple',
          icon: Lock,
          subValue: `${formatNumber(summary.total_reserved, 2)} units reserved`,
        },
        {
          label: `Top ${summary.concentration_rows} Share`,
          value: formatPercent(summary.concentration_share_pct),
          color: 'blue',
          icon: PieChart,
          subValue: 'of total stock value',
        },
        // Only surfaced when there is something to fix — otherwise it is noise.
        ...(summary.uncosted_lines > 0
          ? [
              {
                label: 'Uncosted Lines',
                value: formatNumber(summary.uncosted_lines),
                color: 'red' as const,
                icon: AlertTriangle,
                subValue: 'Stock with no cost on record',
              },
            ]
          : []),
      ]
    : [];

  const columns: ReportColumn<StockValuationRow>[] = [
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    {
      key: 'sku',
      header: 'SKU',
      cell: (value: string) => <span className="font-mono text-xs">{value}</span>,
    },
    { key: 'category_name', header: 'Category' },
    { key: 'brand_name', header: 'Brand' },
    { key: 'warehouse_name', header: 'Warehouse' },
    { key: 'unit_name', header: 'Unit' },
    { key: 'on_hand', header: 'On Hand', format: 'qty', align: 'right' },
    { key: 'reserved', header: 'Reserved', format: 'qty', align: 'right' },
    { key: 'available', header: 'Available', format: 'qty', align: 'right' },
    { key: 'unit_cost', header: 'Unit Cost', format: 'currency', align: 'right' },
    { key: 'stock_value', header: 'Stock Value', format: 'currency', align: 'right' },
    { key: 'selling_price', header: 'Retail Price', format: 'currency', align: 'right' },
    { key: 'retail_value', header: 'Retail Value', format: 'currency', align: 'right' },
    { key: 'margin', header: 'Margin', format: 'currency', align: 'right' },
    { key: 'margin_pct', header: 'Margin %', format: 'percent', align: 'right' },
    {
      key: 'cost_basis',
      header: 'Cost Basis',
      align: 'center',
      cell: (value: string) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            COST_BASIS_STYLES[value] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {value || '—'}
        </span>
      ),
    },
    { key: 'last_received_at', header: 'Last Received', format: 'date' },
  ];

  const totalsRow = summary
    ? {
        product_name: 'Totals',
        on_hand: formatNumber(summary.total_quantity, 2),
        available: formatNumber(summary.total_quantity - summary.total_reserved, 2),
        stock_value: formatCurrency(summary.total_stock_value),
        retail_value: formatCurrency(summary.total_retail_value),
        margin: formatCurrency(summary.potential_margin),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('inventory', 'stock-valuation', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `Stock value as of ${formatDate(summary.as_of_date, 'long')}`,
        isHistorical ? 'replayed from the movement ledger' : null,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'What the inventory on hand is worth, priced with a selectable costing method';

  return (
    <ReportLayout
      title="Stock Valuation"
      description={description}
      icon={Coins}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading} actionsPlacement="below">
          {/* Row 1 — super admin only: pick the tenant whose stock the rest of
              the filters are scoped to. Its own row so it reads as the scope
              selector rather than one more filter. */}
          {isSuperAdmin && (
            <FilterRow columns={1}>
              <FilterField label="Tenant" className="max-w-sm">
                <TenantSelect
                  value={selectedTenantId}
                  onChange={(tid) => {
                    setSelectedTenantId(tid || '');
                    // Category/brand/warehouse belong to the previous tenant,
                    // so they must not survive a tenant switch.
                    setWarehouse(null);
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

          {/* Row 2 — narrow down the catalogue and where it is stored */}
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
            <FilterField label="Warehouse" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`wh-${scopeTenantId || 'unscoped'}`}
                value={warehouse}
                onChange={setWarehouse}
                loadOptions={loadWarehouses}
                defaultOptions={scopeReady}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All warehouses' : 'Select a tenant first'}
              />
            </FilterField>
          </FilterRow>

          {/* Row 3 — how the valuation is priced */}
          <FilterRow columns={3}>
            <FilterField label="As of Date" hint={isHistorical ? 'historical' : undefined}>
              <CustomDatePicker value={asOfDate} onChange={setAsOfDate} compact />
            </FilterField>
            <FilterField label="Costing Method" hint={COSTING_METHODS.find(m => m.value === costingMethod)?.hint}>
              <select
                className={filterSelectClass}
                value={costingMethod}
                onChange={(e) => setCostingMethod(e.target.value as CostingMethod)}
              >
                {COSTING_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
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

          {/* Row 4 — narrow down the result set */}
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
            <FilterField label="Min Stock Value">
              <input
                type="number"
                min={0}
                step="any"
                className={filterInputClass}
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                placeholder="0.00"
              />
            </FilterField>
            <FilterField label="Options">
              <div className="flex flex-wrap items-center gap-3">
                <FilterCheckbox
                  label="Include zero stock"
                  activeHint="Lists SKUs with no quantity"
                  checked={includeZeroStock}
                  onChange={setIncludeZeroStock}
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
        <>
          {/* Where the value sits — the two views a valuation report is always
              read alongside the detail table. */}
          {(summary?.by_category?.length || summary?.by_warehouse?.length) && (
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              <ValueBreakdown title="Value by category (top 8)" rows={summary?.by_category ?? []} />
              <ValueBreakdown title="Value by warehouse (top 8)" rows={summary?.by_warehouse ?? []} />
            </div>
          )}

          <ReportTable
            columns={columns}
            data={data.data}
            pageSize={25}
            totalsRow={totalsRow}
            rowKey={(row) => `${row.sku}-${row.warehouse_name ?? 'none'}`}
            searchKeys={['product_name', 'variation_name', 'sku', 'barcode', 'category_name', 'brand_name']}
            showSerial
            serialHeader="SL"
          />
        </>
      )}
    </ReportLayout>
  );
}