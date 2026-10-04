'use client';

import { useState } from 'react';
import {
  RotateCcw,
  Undo2,
  Coins,
  Layers,
  AlertTriangle,
  TrendingUp,
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
import type { ReturnAnalysisReport, ReturnAnalysisRow, ReturnSource } from '@/types/report.types';

const SOURCES: { value: ReturnSource; label: string }[] = [
  { value: 'sales_return', label: 'Sales Returns' },
  { value: 'pos_refund', label: 'POS Refunds' },
];

const RISK_BADGES: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  normal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const PRODUCT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'simple', label: 'Simple' },
  { value: 'variable', label: 'Variable' },
  { value: 'composite', label: 'Composite' },
  { value: 'digital', label: 'Digital' },
  { value: 'service', label: 'Service' },
];

export default function ReturnAnalysisPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<ReturnAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [category, setCategory] = useState<SelectOption | null>(null);
  const [brand, setBrand] = useState<SelectOption | null>(null);
  const [warehouse, setWarehouse] = useState<SelectOption | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [source, setSource] = useState<ReturnSource | ''>('');
  const [minReturnRate, setMinReturnRate] = useState('');
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
    // Warehouse applies to sales returns only — POS orders carry a register.
    if (warehouse && !source) params.warehouse_id = warehouse.value;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (source) params.source = source;
    const rate = parseFloat(minReturnRate);
    if (!Number.isNaN(rate) && minReturnRate.trim() !== '') params.min_return_rate = rate;
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
      const res = await reportService.returnAnalysis(params as any);
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

  /** Clicking an already-active source clears it, so the card toggles. */
  const applySource = (value: ReturnSource) => {
    const next = source === value ? '' : value;
    setSource(next);
    if (next === 'pos_refund') setWarehouse(null);
    const params = buildParams();
    if (next === '') {
      delete params.source;
    } else {
      params.source = next;
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
    setSource('');
    setMinReturnRate('');
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
          label: 'Total Credit',
          value: formatCurrency(summary.total_credit),
          color: 'red',
          icon: Undo2,
          subValue: `${formatNumber(summary.total_units_returned)} units returned`,
        },
        {
          label: 'Return Rate',
          value: formatPercent(summary.return_rate_pct),
          color: summary.return_rate_pct >= summary.high_return_threshold ? 'orange' : 'green',
          icon: TrendingUp,
          subValue: `${formatNumber(summary.total_units_returned)} of ${formatNumber(summary.total_units_sold)} units`,
        },
        {
          label: 'Net Revenue',
          value: formatCurrency(summary.total_net_revenue),
          color: summary.total_net_revenue < 0 ? 'red' : 'blue',
          icon: Coins,
          subValue: `gross ${formatCurrency(summary.total_revenue)}`,
        },
        {
          label: 'High Return Lines',
          value: formatNumber(summary.high_return_products),
          color: 'red',
          icon: AlertTriangle,
          subValue: `at or above ${formatPercent(summary.high_return_threshold, 0)} · ${formatCurrency(summary.high_return_credit)}`,
        },
        {
          label: 'Sales Returns',
          value: formatNumber(
            data.data.reduce((sum, r) => sum + r.sales_return_units, 0),
            0,
          ),
          color: 'purple',
          icon: RotateCcw,
          subValue: 'units via sales orders',
          onClick: () => applySource('sales_return'),
          active: source === 'sales_return',
        },
        {
          label: 'POS Refunds',
          value: formatNumber(
            data.data.reduce((sum, r) => sum + r.pos_refund_units, 0),
            0,
          ),
          color: 'orange',
          icon: Layers,
          subValue: 'units via the counter',
          onClick: () => applySource('pos_refund'),
          active: source === 'pos_refund',
        },
      ]
    : [];

  const columns: ReportColumn<ReturnAnalysisRow>[] = [
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    {
      key: 'sku',
      header: 'SKU',
      cell: (value: string) => <span className="font-mono text-xs">{value}</span>,
    },
    { key: 'category_name', header: 'Category' },
    { key: 'units_sold', header: 'Units Sold', format: 'qty', align: 'right' },
    {
      key: 'units_returned',
      header: 'Returned',
      format: 'qty',
      align: 'right',
      cell: (value: number) => (
        <span className={value > 0 ? 'font-medium text-red-600 dark:text-red-400' : ''}>
          {formatNumber(value, 2)}
        </span>
      ),
    },
    { key: 'sales_return_units', header: 'Sales Rtn', format: 'qty', align: 'right' },
    { key: 'pos_refund_units', header: 'POS Ref', format: 'qty', align: 'right' },
    {
      key: 'return_rate_pct',
      header: 'Return Rate',
      align: 'right',
      cell: (value: number) => (
        <span
          className={
            value >= (summary?.high_return_threshold ?? 10)
              ? 'font-medium text-red-600 dark:text-red-400'
              : ''
          }
        >
          {formatPercent(value, 1)}
        </span>
      ),
    },
    { key: 'credit_value', header: 'Credit Value', format: 'currency', align: 'right' },
    { key: 'revenue', header: 'Gross Revenue', format: 'currency', align: 'right' },
    { key: 'net_revenue', header: 'Net Revenue', format: 'currency', align: 'right' },
    {
      key: 'top_reason',
      header: 'Top Reason',
      cell: (value: string | null) =>
        value ? value : <span className="text-muted-foreground">Not recorded</span>,
    },
    {
      key: 'risk',
      header: 'Risk',
      align: 'center',
      cell: (_value: unknown, row: ReturnAnalysisRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            RISK_BADGES[row.risk] || RISK_BADGES.normal
          }`}
        >
          {row.risk === 'high' ? 'High' : 'Normal'}
        </span>
      ),
    },
  ];

  const totalsRow = summary
    ? {
        product_name: 'Totals',
        units_sold: formatNumber(summary.total_units_sold, 2),
        units_returned: formatNumber(summary.total_units_returned, 2),
        return_rate_pct: formatPercent(summary.return_rate_pct, 1),
        credit_value: formatCurrency(summary.total_credit),
        revenue: formatCurrency(summary.total_revenue),
        net_revenue: formatCurrency(summary.total_net_revenue),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('sales', 'return-analysis', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        summary.by_reason.length ? `top reason: ${summary.by_reason[0].reason}` : null,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'How often each product comes back, from sales returns and counter refunds';

  return (
    <ReportLayout
      title="Return Analysis"
      description={description}
      icon={RotateCcw}
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
            <FilterField label="Start Date">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="End Date">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="Source">
              <select
                className={filterSelectClass}
                value={source}
                onChange={(e) => setSource(e.target.value as ReturnSource | '')}
              >
                <option value="">All Sources</option>
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
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
            <FilterField
              label="Warehouse"
              hint={source === 'pos_refund' ? 'applies to sales returns only' : scopeReady ? undefined : 'select a tenant first'}
            >
              <CustomSelect
                key={`wh-${scopeTenantId || 'unscoped'}`}
                value={warehouse}
                onChange={setWarehouse}
                loadOptions={loadWarehouses}
                defaultOptions={scopeReady}
                isClearable
                isDisabled={!scopeReady || source === 'pos_refund'}
                compact
                placeholder={scopeReady ? 'All warehouses' : 'Select a tenant first'}
              />
            </FilterField>
          </FilterRow>

          <FilterRow>
            <FilterField label="Min Return Rate %" hint="Flags products coming back too often">
              <input
                type="number"
                min={0}
                max={100}
                className={filterInputClass}
                value={minReturnRate}
                onChange={(e) => setMinReturnRate(e.target.value)}
                placeholder="Any"
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
            <FilterField label="Search">
              <input
                type="search"
                className={filterInputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Product, SKU or reason"
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
          rowKey={(row) => row.sku}
          searchKeys={['product_name', 'variation_name', 'sku', 'barcode', 'category_name', 'brand_name', 'top_reason']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}