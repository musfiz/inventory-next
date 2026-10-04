'use client';

import { useState } from 'react';
import {
  Scale,
  Coins,
  PackageX,
  AlertTriangle,
  CalendarX,
  TrendingDown,
  Layers,
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
  StockAdjustmentReport,
  StockAdjustmentRow,
  StockAdjustmentType,
} from '@/types/report.types';

/** Kept in step with App\Reports\Inventory\StockAdjustmentReport::TYPES. */
const TYPES: { value: StockAdjustmentType; label: string }[] = [
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'damage', label: 'Damage' },
  { value: 'expiry', label: 'Expiry' },
];

const TYPE_BADGES: Record<string, string> = {
  adjustment: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  damage: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expiry: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const PRODUCT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'simple', label: 'Simple' },
  { value: 'variable', label: 'Variable' },
  { value: 'composite', label: 'Composite' },
  { value: 'digital', label: 'Digital' },
  { value: 'service', label: 'Service' },
];

export default function StockAdjustmentPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<StockAdjustmentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [category, setCategory] = useState<SelectOption | null>(null);
  const [brand, setBrand] = useState<SelectOption | null>(null);
  const [warehouse, setWarehouse] = useState<SelectOption | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [adjType, setAdjType] = useState<StockAdjustmentType | ''>('');
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
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (adjType) params.adjustment_type = adjType;
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
      const res = await reportService.stockAdjustmentReport(params as any);
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

  /** Clicking an already-active type clears it, so the card toggles. */
  const applyType = (value: StockAdjustmentType) => {
    const next = adjType === value ? '' : value;
    setAdjType(next);
    const params = buildParams();
    if (next === '') {
      delete params.adjustment_type;
    } else {
      params.adjustment_type = next;
    }
    fetchReport(params);
  };

  const reset = () => {
    setSelectedTenantId('');
    setCategory(null);
    setBrand(null);
    setWarehouse(null);
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setAdjType('');
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
  const typeByKey = (key: StockAdjustmentType) => summary?.by_type?.find((t) => t.key === key);

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Written Off Value',
          value: formatCurrency(summary.written_off_value),
          color: 'red',
          icon: TrendingDown,
          subValue: `${formatNumber(summary.total_lines)} lines in period`,
        },
        {
          label: 'Gross Movement Value',
          value: formatCurrency(summary.total_value),
          color: 'blue',
          icon: Coins,
        },
        {
          label: 'Net Qty Change',
          value: formatNumber(summary.net_qty_change, 2),
          color: summary.net_qty_change < 0 ? 'orange' : 'green',
          icon: Layers,
        },
        {
          label: 'Adjustment',
          value: formatCurrency(typeByKey('adjustment')?.value ?? 0),
          color: 'blue',
          icon: Scale,
          subValue: `${formatNumber(typeByKey('adjustment')?.count ?? 0)} lines · ${formatPercent(typeByKey('adjustment')?.share_pct ?? 0)}`,
          onClick: () => applyType('adjustment'),
          active: adjType === 'adjustment',
        },
        {
          label: 'Damage',
          value: formatCurrency(typeByKey('damage')?.value ?? 0),
          color: 'red',
          icon: PackageX,
          subValue: `${formatNumber(typeByKey('damage')?.count ?? 0)} lines · ${formatPercent(typeByKey('damage')?.share_pct ?? 0)}`,
          onClick: () => applyType('damage'),
          active: adjType === 'damage',
        },
        {
          label: 'Expiry',
          value: formatCurrency(typeByKey('expiry')?.value ?? 0),
          color: 'orange',
          icon: CalendarX,
          subValue: `${formatNumber(typeByKey('expiry')?.count ?? 0)} lines · ${formatPercent(typeByKey('expiry')?.share_pct ?? 0)}`,
          onClick: () => applyType('expiry'),
          active: adjType === 'expiry',
        },
      ]
    : [];

  const columns: ReportColumn<StockAdjustmentRow>[] = [
    {
      key: 'date',
      header: 'Date',
      cell: (value: string) => <span>{value ? formatDate(value, 'long') : '—'}</span>,
    },
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    {
      key: 'sku',
      header: 'SKU',
      cell: (value: string) => <span className="font-mono text-xs">{value}</span>,
    },
    { key: 'warehouse_name', header: 'Warehouse' },
    {
      key: 'adjustment_type',
      header: 'Type',
      align: 'center',
      cell: (_value: unknown, row: StockAdjustmentRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            TYPE_BADGES[row.adjustment_type] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {row.type_label}
        </span>
      ),
    },
    {
      key: 'qty_change',
      header: 'Qty Change',
      align: 'right',
      cell: (value: number) => (
        <span className={value < 0 ? 'font-medium text-red-600 dark:text-red-400' : 'font-medium text-green-600 dark:text-green-400'}>
          {value > 0 ? '+' : ''}
          {formatNumber(value, 2)}
        </span>
      ),
    },
    { key: 'value', header: 'Value', format: 'currency', align: 'right' },
    { key: 'reason', header: 'Reason' },
    { key: 'approved_by', header: 'Approved By' },
  ];

  const totalsRow = summary
    ? {
        product_name: 'Totals',
        qty_change: formatNumber(summary.net_qty_change, 2),
        value: formatCurrency(summary.total_value),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('inventory', 'stock-adjustment', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Manual adjustments, damages and write-offs posted to the stock ledger';

  return (
    <ReportLayout
      title="Stock Adjustment Report"
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

          <FilterRow columns={3}>
            <FilterField label="Start Date">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="End Date">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="Movement Type">
              <select className={filterSelectClass} value={adjType} onChange={(e) => setAdjType(e.target.value as StockAdjustmentType | '')}>
                <option value="">All Types</option>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FilterField>
          </FilterRow>

          <FilterRow>
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
                placeholder="Name, SKU, reason or reference"
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
          rowKey={(row) => `${row.date}-${row.sku}-${row.adjustment_type}`}
          searchKeys={['product_name', 'variation_name', 'sku', 'barcode', 'warehouse_name', 'reason', 'approved_by']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}