'use client';

import { useState } from 'react';
import {
  Coins,
  Package,
  Clock,
  TrendingDown,
  PackageCheck,
  CalendarClock,
  AlertTriangle,
  HelpCircle,
  Layers,
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
  StockAgingBucket,
  StockAgingReport,
  StockAgingRow,
  StockAgingBucketSummary,
} from '@/types/report.types';

/** Kept in step with App\Reports\Inventory\StockAgingReport::BUCKETS. */
const BUCKETS: { value: StockAgingBucket; label: string }[] = [
  { value: '0-30', label: '0-30 Days' },
  { value: '31-60', label: '31-60 Days' },
  { value: '61-90', label: '61-90 Days' },
  { value: '91-180', label: '91-180 Days' },
  { value: '181-365', label: '181-365 Days' },
  { value: '365+', label: '365+ Days' },
  { value: 'unknown', label: 'Unknown Age' },
];

const BUCKET_BADGES: Record<string, string> = {
  '0-30': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  '31-60': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '61-90': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  '91-180': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  '181-365': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  '365+': 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  unknown: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

/** Styled off the stable key, not the label, so rewording can't break the colours. */
const VELOCITY_BADGES: Record<string, string> = {
  fast_moving: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  slow_moving: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  never_sold: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const PRODUCT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'simple', label: 'Simple' },
  { value: 'variable', label: 'Variable' },
  { value: 'composite', label: 'Composite' },
  { value: 'digital', label: 'Digital' },
  { value: 'service', label: 'Service' },
];

/** Sum of several buckets — the cards fold the long tail into "91+ Days". */
function sumBuckets(buckets: StockAgingBucketSummary[] | undefined, keys: StockAgingBucket[]) {
  const wanted = new Set(keys);
  return (buckets ?? [])
    .filter((b) => wanted.has(b.key))
    .reduce(
      (acc, b) => ({
        lines: acc.lines + b.lines,
        quantity: acc.quantity + b.quantity,
        value: acc.value + b.value,
        share_pct: acc.share_pct + b.share_pct,
      }),
      { lines: 0, quantity: 0, value: 0, share_pct: 0 },
    );
}

/**
 * The classic aging profile: one proportional bar showing how the stock value
 * splits across the age buckets. A single glance tells you whether the book is
 * mostly fresh or has gone off.
 */
function AgingProfile({ buckets }: { buckets: StockAgingBucketSummary[] }) {
  const withValue = buckets.filter((b) => b.value > 0);
  if (!withValue.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300">
          <Layers size={13} className="text-indigo-600 dark:text-indigo-400" />
          Aging profile
        </span>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">share of stock value by age</span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        {withValue.map((b) => (
          <div
            key={b.key}
            className={BUCKET_BADGES[b.key]}
            style={{ width: `${Math.min(Math.max(b.share_pct, 0), 100)}%` }}
            title={`${b.label}: ${formatCurrency(b.value)} (${formatPercent(b.share_pct)})`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {withValue.map((b) => (
          <span key={b.key} className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
            <span className={`inline-block h-2 w-2 rounded-sm ${BUCKET_BADGES[b.key]}`} />
            {b.label}
            <span className="font-mono text-gray-900 dark:text-white">{formatPercent(b.share_pct, 0)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function StockAgingPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<StockAgingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [warehouse, setWarehouse] = useState<SelectOption | null>(null);
  const [category, setCategory] = useState<SelectOption | null>(null);
  const [brand, setBrand] = useState<SelectOption | null>(null);
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [slowMovingDays, setSlowMovingDays] = useState('90');
  const [bucket, setBucket] = useState<StockAgingBucket | ''>('');
  const [productType, setProductType] = useState('');
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // The tenant whose catalogue the category/brand/warehouse dropdowns list.
  // A super admin has no tenant of their own to scope by, so those dropdowns
  // stay inert until one is picked; a tenant user is always scoped to their own.
  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;
  const businessTypeId =
    (authUser as any)?.tenant?.business_type?.id ?? (authUser as any)?.business_type?.id ?? undefined;

  const isHistorical = !!data?.summary.is_historical;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (warehouse) params.warehouse_id = warehouse.value;
    if (category) params.category_id = category.value;
    if (brand) params.brand_id = brand.value;
    if (asOfDate) params.as_of_date = asOfDate;
    if (bucket) params.bucket = bucket;
    if (productType) params.product_type = productType;
    if (search.trim()) params.search = search.trim();
    // Number() on a cleared/garbage field yields NaN, which would fail the
    // API's integer rule; fall back to the server's own default instead.
    if (slowMovingDays.trim() && Number.isFinite(Number(slowMovingDays)))
      params.slow_moving_days = Number(slowMovingDays);
    // Always sent so the API gets an explicit boolean. Query strings only carry
    // text, and Laravel's `boolean` rule rejects "true"/"false" — it accepts
    // 1/0, so serialise the flag as a number instead of a JS boolean.
    params.include_inactive = includeInactive ? 1 : 0;
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.stockAging(params);
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
  const applyBucket = (value: StockAgingBucket) => {
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
    setWarehouse(null);
    setCategory(null);
    setBrand(null);
    setAsOfDate(todayISO());
    setSlowMovingDays('90');
    setBucket('');
    setProductType('');
    setSearch('');
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
  const byBucket = summary?.by_bucket;
  const bucketByKey = (key: StockAgingBucket) => byBucket?.find((b) => b.key === key);
  const over90 = sumBuckets(byBucket, ['91-180', '181-365', '365+']);

  const cards: SummaryCard[] = summary
    ? [
        { label: 'Stock Value at Cost', value: formatCurrency(summary.total_stock_value), color: 'green', icon: Coins },
        {
          label: 'Units on Hand',
          value: formatNumber(summary.total_quantity, 2),
          color: 'purple',
          icon: Package,
          subValue: `${formatNumber(summary.total_skus)} SKUs · ${formatNumber(summary.total_lines)} lines`,
        },
        {
          label: 'Average Age',
          value: summary.avg_age_days !== null ? `${formatNumber(summary.avg_age_days)} d` : '—',
          color: 'amber',
          icon: Clock,
          subValue:
            summary.oldest_age_days !== null ? `Oldest ${formatNumber(summary.oldest_age_days)} days` : 'No receipt history',
        },
        {
          label: `No Sale in ${formatNumber(summary.slow_moving_days)}+ Days`,
          value: formatCurrency(summary.slow_moving_value),
          color: 'red',
          icon: TrendingDown,
          subValue: `${formatPercent(summary.slow_moving_share_pct)} of value · ${formatNumber(summary.slow_moving_lines)} lines`,
        },
        // The buckets read left-to-right from fresh to dead, so the colour
        // progression on the row tells the story before you read a number.
        { label: '0-30 Days', value: formatCurrency(bucketByKey('0-30')?.value ?? 0), color: 'green', icon: PackageCheck, onClick: () => applyBucket('0-30'), active: bucket === '0-30' },
        { label: '31-60 Days', value: formatCurrency(bucketByKey('31-60')?.value ?? 0), color: 'blue', icon: CalendarClock, onClick: () => applyBucket('31-60'), active: bucket === '31-60' },
        { label: '61-90 Days', value: formatCurrency(bucketByKey('61-90')?.value ?? 0), color: 'amber', icon: Clock, onClick: () => applyBucket('61-90'), active: bucket === '61-90' },
        { label: '91+ Days', value: formatCurrency(over90.value), color: 'red', icon: AlertTriangle, subValue: `${formatPercent(over90.share_pct)} of value`, active: bucket === '91-180' || bucket === '181-365' || bucket === '365+' },
        // Only surfaced when there is something to fix — otherwise it is noise.
        ...(summary.unknown_age_lines > 0
          ? [
              {
                label: 'Unknown Age',
                value: formatCurrency(bucketByKey('unknown')?.value ?? 0),
                color: 'gray' as const,
                icon: HelpCircle,
                subValue: `${formatNumber(summary.unknown_age_lines)} lines with no receipt date`,
                onClick: () => applyBucket('unknown'),
                active: bucket === 'unknown',
              },
            ]
          : []),
      ]
    : [];

  const columns: ReportColumn<StockAgingRow>[] = [
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
    { key: 'unit_cost', header: 'Unit Cost', format: 'currency', align: 'right' },
    { key: 'stock_value', header: 'Stock Value', format: 'currency', align: 'right' },
    { key: 'last_received_at', header: 'Last Received', format: 'date' },
    { key: 'age_days', header: 'Age (Days)', format: 'number', align: 'right' },
    {
      key: 'bucket_label',
      header: 'Age Bucket',
      align: 'center',
      cell: (_value: unknown, row: StockAgingRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            BUCKET_BADGES[row.bucket] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {row.bucket_label}
        </span>
      ),
    },
    { key: 'last_sold_at', header: 'Last Sold', format: 'date' },
    { key: 'days_since_sold', header: 'Days Since Sale', format: 'number', align: 'right' },
    {
      key: 'velocity',
      header: 'Velocity',
      align: 'center',
      cell: (_value: unknown, row: StockAgingRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            VELOCITY_BADGES[row.velocity_key] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {row.velocity || '—'}
        </span>
      ),
    },
  ];

  const totalsRow = summary
    ? {
        product_name: 'Totals',
        on_hand: formatNumber(summary.total_quantity, 2),
        stock_value: formatCurrency(summary.total_stock_value),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('inventory', 'stock-aging', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `Stock aged as of ${formatDate(summary.as_of_date, 'long')}`,
        isHistorical ? 'replayed from the movement ledger' : null,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'How long stock has been sitting, and how much of it is still moving';

  return (
    <ReportLayout
      title="Stock Aging"
      description={description}
      icon={CalendarClock}
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

          {/* Row 3 — the date the age is measured against, and the rule that
              decides what counts as slow-moving */}
          <FilterRow columns={3}>
            <FilterField label="As Of Date" hint={isHistorical ? 'historical' : undefined}>
              <CustomDatePicker value={asOfDate} onChange={setAsOfDate} compact />
            </FilterField>
            <FilterField label="Slow-Moving After" hint="days without a sale">
              <input
                type="number"
                min={1}
                max={3650}
                className={filterInputClass}
                value={slowMovingDays}
                onChange={(e) => setSlowMovingDays(e.target.value)}
                placeholder="90"
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

          {/* Row 4 — narrow down the result set */}
          <FilterRow>
            <FilterField label="Age Bucket">
              <select
                className={filterSelectClass}
                value={bucket}
                onChange={(e) => setBucket(e.target.value as StockAgingBucket | '')}
              >
                <option value="">All Ages</option>
                {BUCKETS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
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
        <>
          {byBucket && <AgingProfile buckets={byBucket} />}

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