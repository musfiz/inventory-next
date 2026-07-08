'use client';

import { useState, useRef } from 'react';
import { TrendingUp } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency, formatPercent } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV, type ExportColumn } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import { ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass, ReportSummaryCards, ReportTable, ReportExportBar, type ReportColumn, type SummaryCard } from '@/components/reports';
import type { SalesTrendReport, SalesTrendRow } from '@/types/report.types';

export default function SalesTrendPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SalesTrendReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.salesTrend({ start_date: startDate, end_date: endDate, period });
      setData(res);
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
    setPeriod('daily');
    setData(null);
    setError(null);
  };

  const cards: SummaryCard[] = data ? [
    { label: 'Total Revenue', value: formatCurrency(data.summary.total_revenue), color: 'green' },
    { label: 'Avg Daily Revenue', value: formatCurrency(data.summary.avg_daily_revenue), color: 'blue' },
    { label: 'Peak Day Revenue', value: formatCurrency(data.summary.peak_day.revenue), subValue: data.summary.peak_day.date, color: 'amber' },
    { label: 'Growth', value: formatPercent(data.summary.growth_pct), color: 'purple' },
  ] : [];

  const columns: ReportColumn<SalesTrendRow>[] = [
    { key: 'date', header: 'Date', format: 'date' },
    { key: 'pos_revenue', header: 'POS Revenue', format: 'currency', align: 'right' },
    { key: 'so_revenue', header: 'SO Revenue', format: 'currency', align: 'right' },
    { key: 'total_revenue', header: 'Total Revenue', format: 'currency', align: 'right' },
    { key: 'order_count', header: 'Orders', format: 'number', align: 'right' },
    { key: 'avg_order_value', header: 'Avg Order Value', format: 'currency', align: 'right' },
  ];

  const handleExportPDF = async () => { if (!data) return; const el = reportRef.current; if (!el) return; await exportToPDF(el, 'sales-trend'); };
  const handleExportExcel = () => { if (!data) return; exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'sales-trend'); };
  const handleExportCSV = () => { if (!data) return; exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'sales-trend'); };
  const handlePrint = () => printReport('report-print', 'Sales Trend');

  return (
    <ReportLayout title="Sales Trend" icon={TrendingUp}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Start Date">
            <CustomDatePicker value={startDate} onChange={setStartDate} />
          </FilterField>
          <FilterField label="End Date">
            <CustomDatePicker value={endDate} onChange={setEndDate} />
          </FilterField>
          <FilterField label="Period">
            <select className={filterSelectClass} value={period} onChange={e => setPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading} error={error} hasData={!!data}
      actions={<ReportExportBar onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} onExportCSV={handleExportCSV} onPrint={handlePrint} disabled={!data} />}
      printRef={reportRef} printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
