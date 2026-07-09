'use client';

import { useState, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency, formatPercent } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { ReturnAnalysisReport, ReturnAnalysisRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function ReturnAnalysisPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ReturnAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [source, setSource] = useState('all');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.returnAnalysis({
        start_date: startDate,
        end_date: endDate,
        source: source as 'sales_return' | 'pos_refund' | 'all',
      });
      setData(res as unknown as ReturnAnalysisReport);
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
    setData(null);
    setError(null);
  };

  const cards: SummaryCard[] = data ? [
    { label: 'Total Returns', value: formatCurrency(data.summary.total_refund_amount), color: 'red' },
    { label: 'Avg Return Rate', value: formatPercent(data.summary.avg_return_rate), color: 'orange' },
  ] : [];

  const columns: ReportColumn[] = [
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    { key: 'units_sold', header: 'Units Sold', format: 'number', align: 'right' },
    { key: 'units_returned', header: 'Returned', format: 'number', align: 'right' },
    { key: 'return_rate_pct', header: 'Return Rate', format: 'percent', align: 'right' },
    { key: 'refund_amount', header: 'Refund Amount', format: 'currency', align: 'right' },
    { key: 'top_reason', header: 'Top Reason' },
  ];

  return (
    <ReportLayout title="Return Analysis Report" icon={RotateCcw}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Start Date">
            <CustomDatePicker value={startDate} onChange={setStartDate} />
          </FilterField>
          <FilterField label="End Date">
            <CustomDatePicker value={endDate} onChange={setEndDate} />
          </FilterField>
          <FilterField label="Source">
            <select className={filterSelectClass} value={source} onChange={e => setSource(e.target.value)}>
              <option value="all">All Sources</option>
              <option value="sales_return">Sales Return</option>
              <option value="pos_refund">POS Refund</option>
            </select>
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading} error={error} hasData={!!data}
      actions={<ReportExportBar
        onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'return-analysis'); }}
        onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'return-analysis', 'Return Analysis'); }}
        onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'return-analysis'); }}
        onPrint={() => printReport('report-print', 'Return Analysis Report')}
        disabled={!data} />}
      printRef={reportRef} printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
