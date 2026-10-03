'use client';

import { useState } from 'react';
import { BarChart3, Package, PackageCheck, PackageX, Boxes, TrendingUp, AlertTriangle, Coins, Layers } from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import reportService from '@/services/reportService';
import commonService from '@/services/commonService';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
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
import type { StockStatusReport, StockStatusRow, StockStatusValue } from '@/types/report.types';

const STATUS_OPTIONS: { value: StockStatusValue | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'overstock', label: 'Overstock' },
];

const statusStyles: Record<string, string> = {
  in_stock: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  low_stock: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  out_of_stock: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  overstock: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const PRODUCT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'simple', label: 'Simple' },
  { value: 'variable', label: 'Variable' },
  { value: 'composite', label: 'Composite' },
  { value: 'digital', label: 'Digital' },
  { value: 'service', label: 'Service' },
];

export default function StockStatusPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<StockStatusReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [warehouse, setWarehouse] = useState<SelectOption | null>(null);
  const [category, setCategory] = useState<SelectOption | null>(null);
  const [brand, setBrand] = useState<SelectOption | null>(null);
  const [status, setStatus] = useState<StockStatusValue | 'all'>('all');
  const [search, setSearch] = useState('');
  const [productType, setProductType] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // The tenant whose catalogue the category/brand/warehouse dropdowns list.
  // A super admin has no tenant of their own to scope by, so those dropdowns
  // stay inert until one is picked; a tenant user is always scoped to their own.
  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;
  const businessTypeId =
    (authUser as any)?.tenant?.business_type?.id ?? (authUser as any)?.business_type?.id ?? undefined;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (warehouse) params.warehouse_id = warehouse.value;
    if (category) params.category_id = category.value;
    if (brand) params.brand_id = brand.value;
    if (status !== 'all') params.status = [status];
    if (search.trim()) params.search = search.trim();
    if (productType) params.product_type = productType;
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
      const res = await reportService.stockStatus(params);
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

  const applyStatus = (value: StockStatusValue) => {
    const next = status === value ? 'all' : value;
    setStatus(next);
    const params = buildParams();
    if (next === 'all') {
      delete params.status;
    } else {
      params.status = [next];
    }
    fetchReport(params);
  };

  const reset = () => {
    setSelectedTenantId('');
    setWarehouse(null);
    setCategory(null);
    setBrand(null);
    setStatus('all');
    setSearch('');
    setProductType('');
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
        { label: 'Total SKUs', value: formatNumber(summary.total_skus), color: 'gray', icon: Layers },
        { label: 'In Stock', value: formatNumber(summary.in_stock_count), color: 'green', icon: PackageCheck, onClick: () => applyStatus('in_stock'), active: status === 'in_stock' },
        { label: 'Low Stock', value: formatNumber(summary.low_stock_count), color: 'amber', icon: AlertTriangle, onClick: () => applyStatus('low_stock'), active: status === 'low_stock' },
        { label: 'Out of Stock', value: formatNumber(summary.out_of_stock_count), color: 'red', icon: PackageX, onClick: () => applyStatus('out_of_stock'), active: status === 'out_of_stock' },
        { label: 'Overstock', value: formatNumber(summary.overstock_count), color: 'blue', icon: Boxes, onClick: () => applyStatus('overstock'), active: status === 'overstock' },
        { label: 'Units on Hand', value: formatNumber(summary.total_quantity), color: 'purple', icon: Package },
        { label: 'Stock Value (Cost)', value: formatCurrency(summary.total_stock_value), color: 'green', icon: Coins },
        { label: 'Retail Value', value: formatCurrency(summary.total_retail_value), color: 'blue', icon: TrendingUp, subValue: `Potential margin ${formatCurrency(summary.potential_margin)}` },
      ]
    : [];

  const columns: ReportColumn<StockStatusRow>[] = [
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
    { key: 'reorder_point', header: 'Reorder Point', format: 'qty', align: 'right' },
    { key: 'max_quantity', header: 'Max', format: 'qty', align: 'right' },
    { key: 'avg_cost', header: 'Avg Cost', format: 'currency', align: 'right' },
    { key: 'stock_value', header: 'Stock Value', format: 'currency', align: 'right' },
    { key: 'retail_value', header: 'Retail Value', format: 'currency', align: 'right' },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (_: any, row: StockStatusRow) => (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${statusStyles[row.status] || ''}`}>
          {row.status_label || row.status}
        </span>
      ),
    },
    { key: 'last_received_at', header: 'Last Received', format: 'date' },
    { key: 'last_sold_at', header: 'Last Sold', format: 'date' },
  ];

  const totalsRow = summary
    ? {
        product_name: 'Totals',
        on_hand: formatNumber(summary.total_quantity),
        stock_value: formatCurrency(summary.total_stock_value),
        retail_value: formatCurrency(summary.total_retail_value),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('product', 'stock-status', buildParams);

  const generatedAt = data?.generated_at
    ? new Date(data.generated_at).toLocaleString()
    : undefined;

  return (
    <ReportLayout
      title="Stock Status"
      description={generatedAt ? `Data as of ${generatedAt}` : 'All inventory items with their current stock position'}
      icon={BarChart3}
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

          {/* Row 3 — narrow down the result set */}
          <FilterRow>
            <FilterField label="Status">
              <select
                className={filterSelectClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as StockStatusValue | 'all')}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
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
          rowKey={(row) => `${row.sku}-${row.warehouse_name ?? 'none'}`}
          searchKeys={['product_name', 'variation_name', 'sku', 'barcode', 'category_name', 'brand_name']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}
