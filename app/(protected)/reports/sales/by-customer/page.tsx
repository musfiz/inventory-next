'use client';

import { useState } from 'react';
import { Users, Coins, Clock, UserCheck, TrendingUp } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import reportService from '@/services/reportService';
import commonService from '@/services/commonService';
import { todayISO, firstDayOfMonthISO, formatCurrency, formatNumber } from '@/lib/utils/format';
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
import type { SalesByCustomerReport, SalesByCustomerRow } from '@/types/report.types';

/** Derived from the service so the page can never drift from the API contract. */
type SalesByCustomerParams = Parameters<typeof reportService.salesByCustomer>[0];

export default function SalesByCustomerPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const [data, setData] = useState<SalesByCustomerReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [source, setSource] = useState<'pos' | 'so' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'revenue' | 'orders' | 'outstanding' | 'last_purchase'>('revenue');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [customerType, setCustomerType] = useState<SelectOption | null>(null);

  // No catalogue-scoped dropdowns here (category/brand/warehouse are all
  // product concepts), so there is nothing to gate on tenant selection — the
  // tenant select only decides whose sales are reported.
  const buildParams = (): SalesByCustomerParams => {
    const params: SalesByCustomerParams = { start_date: startDate, end_date: endDate, source, sort_by: sortBy };
    if (customerType) params.customer_type = customerType.value;
    const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
    if (tenantId) params.tenant_id = tenantId;
    return params;
  };

  const fetchReport = async (params: SalesByCustomerParams) => {
    setLoading(true);
    setError(null);
    try {
      setData(await reportService.salesByCustomer(params));
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
    setCustomerType(null);
    setData(null);
    setError(null);
  };

  // The segment list is a fixed enum, not tenant-scoped, so this loads once
  // and stays populated regardless of which tenant is selected.
  const loadCustomerTypes = async (inputValue: string): Promise<SelectOption[]> => {
    try {
      const rows = await commonService.getCustomerTypesForDropdown({ search: inputValue });
      return (rows || []).map((t) => ({ value: t.value, label: t.label }));
    } catch {
      return [];
    }
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Total Revenue', value: formatCurrency(data.summary.total_revenue), color: 'green', icon: Coins },
        { label: 'Outstanding', value: formatCurrency(data.summary.total_outstanding), color: 'red', icon: Clock },
        { label: 'Customers', value: formatNumber(data.summary.customer_count, 0), color: 'blue', icon: UserCheck },
        { label: 'Avg Revenue', value: formatCurrency(data.summary.avg_revenue_per_customer), color: 'purple', icon: TrendingUp },
      ]
    : [];

  const columns: ReportColumn<SalesByCustomerRow>[] = [
    { key: 'customer_name', header: 'Customer' },
    {
      key: 'customer_type',
      header: 'Type',
      // Till orders captured without a customer record have no segment; show a
      // dash rather than an empty cell so the row still reads as complete.
      cell: (value: string | null) =>
        value ? (
          <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700 dark:bg-gray-700 dark:text-gray-200">
            {value}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    { key: 'phone', header: 'Phone', cell: (value: string | null) => value || <span className="text-gray-400">—</span> },
    { key: 'order_count', header: 'Orders', format: 'number', align: 'right' },
    { key: 'total_revenue', header: 'Total Revenue', format: 'currency', align: 'right' },
    { key: 'total_paid', header: 'Total Paid', format: 'currency', align: 'right' },
    { key: 'outstanding', header: 'Outstanding', format: 'currency', align: 'right' },
    { key: 'avg_order_value', header: 'Avg Order Value', format: 'currency', align: 'right' },
    { key: 'last_purchase', header: 'Last Purchase', format: 'date' },
  ];

  // outstanding is a balance, not period activity, and avg_order_value /
  // last_purchase have no meaningful total, so the totals row carries only
  // the period flows.
  const totalsRow = data
    ? {
        customer_name: 'Totals',
        order_count: formatNumber(data.data.reduce((sum, r) => sum + (r.order_count || 0), 0), 0),
        total_revenue: formatCurrency(data.summary.total_revenue),
        total_paid: formatCurrency(data.summary.total_paid),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('sales', 'by-customer', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  return (
    <ReportLayout
      title="Sales by Customer"
      icon={Users}
      description={
        generatedAt
          ? `Period ${startDate} to ${endDate} · data as of ${generatedAt}`
          : 'Revenue, payments and balances per customer'
      }
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading} actionsPlacement="below">
          {/* Row 1 — super admin only: pick the tenant whose sales are reported.
              Its own row so it reads as the scope selector rather than one more
              filter. */}
          {isSuperAdmin && (
            <FilterRow columns={1}>
              <FilterField label="Tenant" className="max-w-sm">
                <TenantSelect
                  value={selectedTenantId}
                  onChange={(tid) => setSelectedTenantId(tid || '')}
                  placeholder="Select a tenant"
                  compact
                  isClearable
                />
              </FilterField>
            </FilterRow>
          )}

          {/* Row 2 — which customers, and through which channel */}
          <FilterRow columns={2}>
            <FilterField label="Customer Type">
              <CustomSelect
                value={customerType}
                onChange={setCustomerType}
                loadOptions={loadCustomerTypes}
                defaultOptions
                isClearable
                compact
                placeholder="All customer types"
              />
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

          {/* Row 3 — the period and the ordering */}
          <FilterRow columns={3}>
            <FilterField label="Start Date">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="End Date">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="Sort By">
              <select
                className={filterSelectClass}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'revenue' | 'orders' | 'outstanding' | 'last_purchase')}
              >
                <option value="revenue">Revenue</option>
                <option value="orders">Orders</option>
                <option value="outstanding">Outstanding</option>
                <option value="last_purchase">Last Purchase</option>
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
          rowKey={(row, i) => `${row.customer_name}-${row.phone ?? 'nophone'}-${i}`}
          searchKeys={['customer_name', 'customer_type', 'phone']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}