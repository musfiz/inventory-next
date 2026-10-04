'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Coins,
  Layers,
  PackageX,
  XCircle,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import reportService from '@/services/reportService';
import commonService from '@/services/commonService';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/format';
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
import type { LowStockReport, LowStockRow, LowStockStatus } from '@/types/report.types';

/** Kept in step with App\Reports\Inventory\LowStockReport::STATUSES. */
const STATUSES: { value: LowStockStatus; label: string }[] = [
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'critical', label: 'Critical (under 50% of min)' },
  { value: 'low', label: 'Low (below min)' },
];

const STATUS_BADGES: Record<string, string> = {
  out_of_stock: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  critical: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  low: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const STATUS_LABELS: Record<string, string> = {
  out_of_stock: 'Out of Stock',
  critical: 'Critical',
  low: 'Low',
};

/** Fill-rate bar colour: red when nearly empty, amber when under the minimum. */
const fillBar = (pct: number) => {
  const width = Math.max(0, Math.min(100, pct));
  const tone =
    width <= 0
      ? 'bg-red-600'
      : width < 50
        ? 'bg-red-500'
        : width < 100
          ? 'bg-amber-500'
          : 'bg-green-500';

  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
      <span className="tabular-nums">{formatPercent(pct, 0)}</span>
    </div>
  );
};

const PRODUCT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'simple', label: 'Simple' },
  { value: 'variable', label: 'Variable' },
  { value: 'composite', label: 'Composite' },
  { value: 'digital', label: 'Digital' },
  { value: 'service', label: 'Service' },
];

export default function LowStockPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<LowStockReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [category, setCategory] = useState<SelectOption | null>(null);
  const [brand, setBrand] = useState<SelectOption | null>(null);
  const [warehouse, setWarehouse] = useState<SelectOption | null>(null);
  const [status, setStatus] = useState<LowStockStatus | ''>('');
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
    if (warehouse) params.warehouse_id = warehouse.value;
    if (status) params.status = status;
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
      const res = await reportService.lowStockReport(params as any);
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

  /** Clicking an already-active status clears it, so the card toggles. */
  const applyStatus = (value: LowStockStatus) => {
    const next = status === value ? '' : value;
    setStatus(next);
    const params = buildParams();
    if (next === '') {
      delete params.status;
    } else {
      params.status = next;
    }
    fetchReport(params);
  };

  const reset = () => {
    setSelectedTenantId('');
    setCategory(null);
    setBrand(null);
    setWarehouse(null);
    setStatus('');
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
  const statusByKey = (key: LowStockStatus) => summary?.by_status?.find((s) => s.key === key);

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Shortfall Value',
          value: formatCurrency(summary.total_shortfall_value),
          color: 'red',
          icon: Coins,
          subValue: `${formatNumber(summary.total_shortfall_qty, 2)} units below minimum`,
        },
        {
          label: 'Lines Below Min',
          value: formatNumber(summary.total_lines),
          color: 'orange',
          icon: Layers,
        },
        {
          label: 'Out of Stock',
          value: formatNumber(statusByKey('out_of_stock')?.lines ?? 0),
          color: 'red',
          icon: XCircle,
          subValue: formatCurrency(statusByKey('out_of_stock')?.shortfall_value ?? 0),
          onClick: () => applyStatus('out_of_stock'),
          active: status === 'out_of_stock',
        },
        {
          label: 'Critical',
          value: formatNumber(statusByKey('critical')?.lines ?? 0),
          color: 'orange',
          icon: AlertTriangle,
          subValue: `${formatCurrency(statusByKey('critical')?.shortfall_value ?? 0)} · ${formatPercent(statusByKey('critical')?.share_pct ?? 0)}`,
          onClick: () => applyStatus('critical'),
          active: status === 'critical',
        },
        {
          label: 'Low',
          value: formatNumber(statusByKey('low')?.lines ?? 0),
          color: 'amber',
          icon: PackageX,
          subValue: `${formatCurrency(statusByKey('low')?.shortfall_value ?? 0)} · ${formatPercent(statusByKey('low')?.share_pct ?? 0)}`,
          onClick: () => applyStatus('low'),
          active: status === 'low',
        },
      ]
    : [];

  const columns: ReportColumn<LowStockRow>[] = [
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    {
      key: 'sku',
      header: 'SKU',
      cell: (value: string) => <span className="font-mono text-xs">{value}</span>,
    },
    { key: 'warehouse_name', header: 'Warehouse' },
    { key: 'current_qty', header: 'Current Qty', format: 'qty', align: 'right' },
    { key: 'reserved_qty', header: 'Reserved', format: 'qty', align: 'right' },
    { key: 'available_qty', header: 'Available', format: 'qty', align: 'right' },
    { key: 'min_quantity', header: 'Min Qty', format: 'qty', align: 'right' },
    { key: 'shortfall_qty', header: 'Shortfall', format: 'qty', align: 'right' },
    { key: 'fill_pct', header: 'Fill %', align: 'right', cell: (value: number) => fillBar(value) },
    { key: 'unit_cost', header: 'Unit Cost', format: 'currency', align: 'right' },
    { key: 'shortfall_value', header: 'Shortfall Value', format: 'currency', align: 'right' },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (_value: unknown, row: LowStockRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            STATUS_BADGES[row.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {STATUS_LABELS[row.status] || row.status}
        </span>
      ),
    },
  ];

  const totalsRow = summary
    ? {
        product_name: 'Totals',
        current_qty: formatNumber(
          data.data.reduce((s, r) => s + r.current_qty, 0),
          2,
        ),
        shortfall_qty: formatNumber(summary.total_shortfall_qty, 2),
        shortfall_value: formatCurrency(summary.total_shortfall_value),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('inventory', 'low-stock', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `${formatNumber(summary.total_lines)} lines below their minimum`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Stock that still exists but has fallen to or below its minimum level';

  return (
    <ReportLayout
      title="Low Stock"
      description={description}
      icon={AlertTriangle}
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

          <FilterRow>
            <FilterField label="Status">
              <select
                className={filterSelectClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as LowStockStatus | '')}
              >
                <option value="">All Statuses</option>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
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
          rowKey={(row) => `${row.sku}-${row.warehouse_name}`}
          searchKeys={['product_name', 'variation_name', 'sku', 'barcode', 'warehouse_name']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}