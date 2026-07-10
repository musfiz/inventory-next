'use client';

import { useState, useRef } from 'react';
import { BarChart3 } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency, formatPercent } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { SalesByCategoryReport, SalesByCategoryRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function SalesByCategoryPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SalesByCategoryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [source, setSource] = useState('all');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        start_date: startDate,
        end_date: endDate,
        source: source as 'pos' | 'so' | 'all',
      };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const res = await reportService.salesByCategory(params);
      setData(res as unknown as SalesByCategoryReport);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load report';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setSource('all');
    setSelectedTenantId('');
    setData(null);
    setError(null);
  };

  const cards: SummaryCard[] = data ? [
    { label: 'Total Revenue', value: formatCurrency(data.summary.total_revenue), color: 'green' },
    { label: 'Total Profit', value: formatCurrency(data.summary.total_profit), color: 'blue' },
  ] : [];

  const columns: ReportColumn[] = [
    { key: 'category_name', header: 'Category' },
    { key: 'product_count', header: 'Products', format: 'number', align: 'right' },
    { key: 'units_sold', header: 'Units Sold', format: 'number', align: 'right' },
    { key: 'revenue', header: 'Revenue', format: 'currency', align: 'right' },
    { key: 'cogs', header: 'COGS', format: 'currency', align: 'right' },
    { key: 'gross_profit', header: 'Gross Profit', format: 'currency', align: 'right' },
    { key: 'margin_pct', header: 'Margin %', format: 'percent', align: 'right' },
    { key: 'revenue_share_pct', header: 'Revenue Share', format: 'percent', align: 'right' },
  ];

  return (
    <ReportLayout title="Sales by Category" icon={BarChart3}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          {isSuperAdmin && (
            <FilterField label="Tenant">
              <TenantSelect
                value={selectedTenantId}
                onChange={(tid) => setSelectedTenantId(tid || '')}
                placeholder="All Tenants"
              />
            </FilterField>
          )}
          <FilterField label="Start Date">
            <CustomDatePicker value={startDate} onChange={setStartDate} />
          </FilterField>
          <FilterField label="End Date">
            <CustomDatePicker value={endDate} onChange={setEndDate} />
          </FilterField>
          <FilterField label="Source">
            <select className={filterSelectClass} value={source} onChange={e => setSource(e.target.value)}>
              <option value="all">All Sources</option>
              <option value="pos">POS</option>
              <option value="so">Sales Order</option>
            </select>
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading} error={error} hasData={!!data}
      actions={<ReportExportBar
        onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'sales-by-category'); }}
        onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'sales-by-category', 'Sales by Category'); }}
        onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'sales-by-category'); }}
        onPrint={() => printReport('report-print', 'Sales by Category Report')}
        disabled={!data} />}
      printRef={reportRef} printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
