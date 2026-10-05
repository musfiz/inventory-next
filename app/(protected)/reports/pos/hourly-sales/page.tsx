'use client';

import { Clock, Coins, ShoppingCart, TrendingUp, Layers } from 'lucide-react';
import { useState } from 'react';
import {
  ReportLayout,
  ReportFilters,
  FilterRow,
  FilterField,
  ReportSummaryCards,
  ReportTable,
  ReportExportBar,
  filterSearchInputClass,
  type ReportColumn,
  type SummaryCard,
} from '@/components/reports';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import { useServerReportExport } from '@/hooks/reports/use-server-report-export';
import { usePermissions } from '@/hooks/use-permissions';
import { notify } from '@/lib/notifications';
import { formatCurrency, formatDate, formatNumber, formatPercent, todayISO, firstDayOfMonthISO } from '@/lib/utils/format';
import { posRegisterService } from '@/services';
import reportService from '@/services/reportService';
import { useAuthStore } from '@/stores/auth-store';
import type { HourlySalesReport, HourlySalesRow } from '@/types/report.types';

export default function HourlySalesPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<HourlySalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [register, setRegister] = useState<SelectOption | null>(null);
  const [search, setSearch] = useState('');

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  /** Registers are per-tenant, so the dropdown follows the selected tenant. */
  const scopeReady = !isSuperAdmin || !!selectedTenantId;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (register) params.register_id = register.value;
    if (search.trim()) params.search = search.trim();
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const loadRegisters = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const rows = await posRegisterService.dropdown(scopeTenantId || undefined);
      const q = inputValue.trim().toLowerCase();
      return (rows || [])
        .map((r: any) => ({ value: String(r.id), label: r.name }))
        .filter((o: SelectOption) => !q || o.label.toLowerCase().includes(q));
    } catch {
      return [];
    }
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.hourlySales(params as any);
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
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setRegister(null);
    setSearch('');
    setData(null);
    setError(null);
  };

  const summary = data?.summary;
  const busiest = summary?.busiest_hour?.[0];

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Revenue',
          value: formatCurrency(summary.total_revenue),
          color: 'green',
          icon: Coins,
          subValue: `${formatCurrency(summary.gross_profit)} gross profit`,
        },
        {
          label: 'Orders',
          value: formatNumber(summary.order_count),
          color: 'blue',
          icon: ShoppingCart,
          subValue: `${formatNumber(summary.total_units)} units`,
        },
        {
          label: 'Avg Order',
          value: formatCurrency(summary.avg_order_value),
          color: 'purple',
          icon: TrendingUp,
        },
        {
          label: 'Busiest Hour',
          value: busiest?.label ?? '—',
          color: 'orange',
          icon: Clock,
          subValue: busiest
            ? `${formatCurrency(busiest.value)}${
                busiest.share_pct != null ? ` · ${formatPercent(busiest.share_pct)} of revenue` : ''
              }`
            : 'no sales in range',
        },
        {
          label: 'Trading Hours',
          value: formatNumber(summary.trading_hours),
          color: 'amber',
          icon: Layers,
          subValue: `${formatCurrency(summary.avg_hourly_revenue)} per trading hour`,
        },
      ]
    : [];

  const columns: ReportColumn<HourlySalesRow>[] = [
    {
      key: 'hour_label',
      header: 'Hour',
      cell: (value: string) => <span className="font-mono text-xs font-medium">{value}</span>,
    },
    { key: 'order_count', header: 'Orders', format: 'number', align: 'right' },
    { key: 'units_sold', header: 'Units', format: 'qty', align: 'right' },
    {
      key: 'revenue',
      header: 'Revenue',
      format: 'currency',
      align: 'right',
      cell: (value: number) => (
        <span className={value > 0 ? 'font-medium' : 'text-muted-foreground'}>
          {formatCurrency(value)}
        </span>
      ),
    },
    { key: 'cost', header: 'Cost', format: 'currency', align: 'right' },
    { key: 'gross_profit', header: 'Gross Profit', format: 'currency', align: 'right' },
    { key: 'avg_order_value', header: 'Avg Order', format: 'currency', align: 'right' },
    { key: 'units_per_order', header: 'Units / Order', format: 'number', align: 'right' },
    { key: 'share_pct', header: 'Share %', format: 'percent', align: 'right' },
  ];

  const totalsRow = summary
    ? {
        hour_label: 'Totals',
        order_count: formatNumber(summary.order_count),
        units_sold: formatNumber(summary.total_units, 2),
        revenue: formatCurrency(summary.total_revenue),
        cost: formatCurrency(summary.total_cost),
        gross_profit: formatCurrency(summary.gross_profit),
        avg_order_value: formatCurrency(summary.avg_order_value),
        share_pct: formatPercent(100, 0),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('pos', 'hourly-sales', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'When the counter trades, hour by hour — for shift planning and staffing';

  return (
    <ReportLayout
      title="Hourly Sales"
      description={description}
      icon={Clock}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading} actionsPlacement="below">
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

          <FilterRow columns={4}>
            <FilterField label="Start Date">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="End Date">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="Register" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`reg-${scopeTenantId || 'unscoped'}`}
                value={register}
                onChange={setRegister}
                loadOptions={loadRegisters}
                defaultOptions={scopeReady}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All registers' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Search" hint="matches the hour label">
              <input
                type="search"
                className={filterSearchInputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Hour, e.g. 14"
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
          pageSize={24}
          totalsRow={totalsRow}
          rowKey={(row) => row.hour_label}
          searchKeys={['hour_label']}
          showSerial={false}
        />
      )}
    </ReportLayout>
  );
}