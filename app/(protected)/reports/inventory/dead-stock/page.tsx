'use client';

import { useState } from 'react';
import {
  Coins,
  PackageX,
  Layers,
  Clock,
  Archive,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import reportService from '@/services/reportService';
import commonService from '@/services/commonService';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils/format';
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
import type { DeadStockReport, DeadStockRow } from '@/types/report.types';

const PRODUCT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'simple', label: 'Simple' },
  { value: 'variable', label: 'Variable' },
  { value: 'composite', label: 'Composite' },
  { value: 'digital', label: 'Digital' },
  { value: 'service', label: 'Service' },
];

export default function DeadStockPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<DeadStockReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [category, setCategory] = useState<SelectOption | null>(null);
  const [brand, setBrand] = useState<SelectOption | null>(null);
  const [warehouse, setWarehouse] = useState<SelectOption | null>(null);
  const [daysThreshold, setDaysThreshold] = useState('90');
  const [minValue, setMinValue] = useState('');
  const [productType, setProductType] = useState('');
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;
  const businessTypeId =
    (authUser as any)?.tenant?.business_type?.id ?? (authUser as any)?.business_type?.id ?? undefined;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    const days = parseInt(daysThreshold, 10);
    if (!Number.isNaN(days) && days > 0 && days !== 90) params.days_threshold = days;
    const mv = parseFloat(minValue);
    if (!Number.isNaN(mv) && mv > 0) params.min_value = mv;
    if (warehouse) params.warehouse_id = warehouse.value;
    if (category) params.category_id = category.value;
    if (brand) params.brand_id = brand.value;
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
      const res = await reportService.deadStock(params as any);
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
    setWarehouse(null);
    setDaysThreshold('90');
    setMinValue('');
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
          label: 'Dead Stock Value',
          value: formatCurrency(summary.total_value),
          color: 'red',
          icon: Coins,
          subValue: `${formatNumber(summary.total_units)} units idle`,
        },
        {
          label: 'Dead SKUs',
          value: formatNumber(summary.total_skus),
          color: 'orange',
          icon: PackageX,
        },
        {
          label: 'Units Idle',
          value: formatNumber(summary.total_units),
          color: 'purple',
          icon: Layers,
        },
        {
          label: 'Oldest Idle',
          value: summary.oldest_idle_days != null ? `${formatNumber(summary.oldest_idle_days)}d` : '—',
          color: 'amber',
          icon: Clock,
          subValue: `threshold ${summary.days_threshold}d`,
        },
      ]
    : [];

  const columns: ReportColumn<DeadStockRow>[] = [
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
    { key: 'quantity', header: 'Qty', format: 'qty', align: 'right' },
    { key: 'unit_cost', header: 'Unit Cost', format: 'currency', align: 'right' },
    { key: 'total_value', header: 'Total Value', format: 'currency', align: 'right' },
    {
      key: 'last_sale_date',
      header: 'Last Sale',
      cell: (value: string | null) => (value ? formatDate(value) : <span className="text-muted-foreground">Never</span>),
    },
    {
      key: 'days_since_last_sale',
      header: 'Days Since Sale',
      align: 'right',
      cell: (value: number | null) =>
        value != null ? <span>{formatNumber(value)}d</span> : <span className="text-muted-foreground">—</span>,
    },
  ];

  const totalsRow = summary
    ? {
        product_name: 'Totals',
        quantity: formatNumber(summary.total_units, 2),
        total_value: formatCurrency(summary.total_value),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('inventory', 'dead-stock', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `No sales in ${summary.days_threshold}+ days`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Lines holding quantity that have not sold in the chosen idle window';

  return (
    <ReportLayout
      title="Dead Stock Report"
      description={description}
      icon={Archive}
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

          <FilterRow columns={3}>
            <FilterField label="Days Idle">
              <input
                type="number"
                min={1}
                max={3650}
                className={filterInputClass}
                value={daysThreshold}
                onChange={(e) => setDaysThreshold(e.target.value)}
                placeholder="90"
              />
            </FilterField>
            <FilterField label="Min Value">
              <input
                type="number"
                min={0}
                className={filterInputClass}
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                placeholder="0"
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

          <FilterRow>
            <FilterField label="Search">
              <input
                type="search"
                className={filterInputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, SKU, barcode or warehouse"
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
          rowKey={(row) => `${row.sku}-${row.warehouse_name}`}
          searchKeys={['product_name', 'variation_name', 'sku', 'barcode', 'category_name', 'brand_name', 'warehouse_name']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}
