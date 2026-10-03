'use client';

import { useState } from 'react';
import { BarChart3, Coins, TrendingDown, TrendingUp, Percent } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import reportService from '@/services/reportService';
import commonService from '@/services/commonService';
import { todayISO, firstDayOfMonthISO, formatCurrency, formatPercent } from '@/lib/utils/format';
import { notify } from '@/lib/notifications';
import {
  ReportLayout,
  ReportFilters,
  FilterRow,
  FilterField,
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
import type { SalesByProductReport, SalesByProductRow } from '@/types/report.types';

/** Derived from the service so the page can never drift from the API contract. */
type SalesByProductParams = Parameters<typeof reportService.salesByProduct>[0];

export default function SalesByProductPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const [data, setData] = useState<SalesByProductReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [source, setSource] = useState<'pos' | 'so' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity' | 'profit'>('revenue');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [category, setCategory] = useState<SelectOption | null>(null);
  const [brand, setBrand] = useState<SelectOption | null>(null);

  const businessTypeId =
    (authUser as any)?.tenant?.business_type?.id ?? (authUser as any)?.business_type?.id ?? undefined;

  const buildParams = (): SalesByProductParams => {
    const params: SalesByProductParams = { start_date: startDate, end_date: endDate, source, sort_by: sortBy };
    if (category) params.category_id = category.value;
    if (brand) params.brand_id = brand.value;
    const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
    if (tenantId) params.tenant_id = tenantId;
    return params;
  };

  const fetchReport = async (params: SalesByProductParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.salesByProduct(params);
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
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setSource('all');
    setSortBy('revenue');
    setSelectedTenantId('');
    setCategory(null);
    setBrand(null);
    setData(null);
    setError(null);
  };

  const loadCategories = async (inputValue: string): Promise<SelectOption[]> => {
    try {
      const rows = await commonService.getCategoriesForDropdown({ search: inputValue, business_type_id: businessTypeId });
      return (rows || []).map((c: any) => ({ value: String(c.id), label: c.name }));
    } catch {
      return [];
    }
  };

  const loadBrands = async (inputValue: string): Promise<SelectOption[]> => {
    try {
      const rows = await commonService.getBrandsForDropdown({ search: inputValue, business_type_id: businessTypeId });
      return (rows || []).map((b: any) => ({ value: String(b.id), label: b.name }));
    } catch {
      return [];
    }
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Total Revenue', value: formatCurrency(data.summary.total_revenue), color: 'green', icon: Coins },
        { label: 'Total COGS', value: formatCurrency(data.summary.total_cogs), color: 'red', icon: TrendingDown },
        { label: 'Gross Profit', value: formatCurrency(data.summary.total_gross_profit), color: 'blue', icon: TrendingUp },
        { label: 'Avg Margin', value: formatPercent(data.summary.avg_margin), color: 'purple', icon: Percent },
      ]
    : [];

  const columns: ReportColumn<SalesByProductRow>[] = [
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    {
      key: 'sku',
      header: 'SKU',
      cell: (value: string) => <span className="font-mono text-xs">{value}</span>,
    },
    { key: 'category_name', header: 'Category' },
    { key: 'units_sold', header: 'Units Sold', format: 'qty', align: 'right' },
    { key: 'gross_revenue', header: 'Gross Revenue', format: 'currency', align: 'right' },
    { key: 'discount', header: 'Discount', format: 'currency', align: 'right' },
    { key: 'net_revenue', header: 'Net Revenue', format: 'currency', align: 'right' },
    { key: 'cogs', header: 'COGS', format: 'currency', align: 'right' },
    { key: 'gross_profit', header: 'Gross Profit', format: 'currency', align: 'right' },
    { key: 'margin_pct', header: 'Margin %', format: 'percent', align: 'right' },
  ];

  const totalsRow = data
    ? {
        product_name: 'Totals',
        net_revenue: formatCurrency(data.summary.total_revenue),
        cogs: formatCurrency(data.summary.total_cogs),
        gross_profit: formatCurrency(data.summary.total_gross_profit),
        margin_pct: formatPercent(data.summary.avg_margin),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('sales', 'by-product', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  return (
    <ReportLayout
      title="Sales by Product"
      icon={BarChart3}
      description={
        generatedAt ? `Period ${startDate} to ${endDate} · data as of ${generatedAt}` : 'Units, revenue and margin per product'
      }
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading} actionsPlacement="below">
          {/* Row 1 — scope the report */}
          <FilterRow>
            {isSuperAdmin && (
              <FilterField label="Tenant">
                <TenantSelect
                  value={selectedTenantId}
                  onChange={(tid) => setSelectedTenantId(tid || '')}
                  placeholder="All Tenants"
                  compact
                />
              </FilterField>
            )}
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
                onChange={(e) => setSource(e.target.value as 'pos' | 'so' | 'all')}
              >
                <option value="all">All Sources</option>
                <option value="pos">POS</option>
                <option value="so">Sales Order</option>
              </select>
            </FilterField>
          </FilterRow>

          {/* Row 2 — narrow down the result set */}
          <FilterRow>
            <FilterField label="Category">
              <CustomSelect
                value={category}
                onChange={setCategory}
                loadOptions={loadCategories}
                defaultOptions
                isClearable
                compact
                placeholder="All categories"
              />
            </FilterField>
            <FilterField label="Brand">
              <CustomSelect
                value={brand}
                onChange={setBrand}
                loadOptions={loadBrands}
                defaultOptions
                isClearable
                compact
                placeholder="All brands"
              />
            </FilterField>
            <FilterField label="Sort By">
              <select
                className={filterSelectClass}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'revenue' | 'quantity' | 'profit')}
              >
                <option value="revenue">Revenue</option>
                <option value="quantity">Quantity</option>
                <option value="profit">Profit</option>
              </select>
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
          rowKey={(row) => `${row.sku}-${row.variation_name ?? 'base'}`}
          searchKeys={['product_name', 'variation_name', 'sku', 'category_name']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}
