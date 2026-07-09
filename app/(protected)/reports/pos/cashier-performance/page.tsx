'use client';

import { useState, useRef } from 'react';
import { Users } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { CashierPerformanceReport, CashierPerformanceRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function CashierPerformancePage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CashierPerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.cashierPerformance({
        start_date: startDate,
        end_date: endDate,
      });
      setData(res as unknown as CashierPerformanceReport);
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
    setData(null);
    setError(null);
  };

  const cards: SummaryCard[] = data ? [
    { label: 'Total Sales', value: formatCurrency(data.summary.total_sales), color: 'green' },
    { label: 'Avg Variance', value: formatCurrency(data.summary.avg_variance), color: 'red' },
    { label: 'Top Performer', value: data.summary.top_performer, color: 'purple' },
  ] : [];

  const columns: ReportColumn[] = [
    { key: 'cashier_name', header: 'Cashier' },
    { key: 'register_name', header: 'Register' },
    { key: 'sessions', header: 'Sessions', format: 'number', align: 'right' },
    { key: 'sale_count', header: 'Sales', format: 'number', align: 'right' },
    { key: 'total_sales', header: 'Total Sales', format: 'currency', align: 'right' },
    { key: 'refund_count', header: 'Refunds', format: 'number', align: 'right' },
    { key: 'refund_amount', header: 'Refund Amount', format: 'currency', align: 'right' },
    { key: 'avg_sale', header: 'Avg Sale', format: 'currency', align: 'right' },
    { key: 'cash_variance', header: 'Cash Variance', format: 'currency', align: 'right' },
    { key: 'items_per_sale', header: 'Items/Sale', format: 'number', align: 'right' },
  ];

  return (
    <ReportLayout title="Cashier Performance" icon={Users}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Start Date">
            <CustomDatePicker value={startDate} onChange={setStartDate} />
          </FilterField>
          <FilterField label="End Date">
            <CustomDatePicker value={endDate} onChange={setEndDate} />
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading} error={error} hasData={!!data}
      actions={<ReportExportBar
        onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'cashier-performance'); }}
        onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'cashier-performance', 'Cashier Performance'); }}
        onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'cashier-performance'); }}
        onPrint={() => printReport('report-print', 'Cashier Performance Report')}
        disabled={!data} />}
      printRef={reportRef} printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
