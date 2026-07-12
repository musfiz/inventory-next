'use client';

import { useState, useRef } from 'react';
import { PieChart } from 'lucide-react';
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
import type { AbcAnalysisReport, AbcAnalysisRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function AbcAnalysisPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<AbcAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [metric, setMetric] = useState<'revenue' | 'quantity' | 'profit'>('revenue');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        start_date: startDate,
        end_date: endDate,
        metric,
      };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const result = await reportService.abcAnalysis(params);
      setData(result as unknown as AbcAnalysisReport);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to generate report';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setMetric('revenue');
    setSelectedTenantId('');
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'A-Class Count', value: String(data.summary.a_count), color: 'green' },
        { label: 'A-Class Value', value: formatCurrency(data.summary.a_value), color: 'green' },
        { label: 'B-Class Count', value: String(data.summary.b_count), color: 'amber' },
        { label: 'C-Class Count', value: String(data.summary.c_count), color: 'red' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'rank', header: 'Rank', format: 'number', align: 'right' },
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    { key: 'sku', header: 'SKU' },
    { key: 'revenue', header: 'Revenue', format: 'currency', align: 'right' },
    { key: 'cumulative_pct', header: 'Cumulative %', format: 'percent', align: 'right' },
    {
      key: 'class', header: 'Class',
      cell: (value: string) => {
        const colors: Record<string, string> = {
          A: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          B: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          C: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        return (
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${colors[value] || ''}`}>
            {value}
          </span>
        );
      },
    },
  ];

  return (
    <ReportLayout
      title="ABC Analysis"
      icon={PieChart}
      description="Pareto analysis — classify products by value contribution"
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
          <FilterField label="Metric">
            <select className={filterSelectClass} value={metric} onChange={(e) => setMetric(e.target.value as 'revenue' | 'quantity' | 'profit')}>
              <option value="revenue">Revenue</option>
              <option value="quantity">Quantity</option>
              <option value="profit">Profit</option>
            </select>
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        <ReportExportBar
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'abc-analysis'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'abc-analysis', 'ABC Analysis'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'abc-analysis'); }}
          onPrint={() => printReport('report-print', 'ABC Analysis')}
          disabled={!data}
        />
      }
      printRef={reportRef}
      printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
