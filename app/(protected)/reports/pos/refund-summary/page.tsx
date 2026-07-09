'use client';

import { useState, useRef } from 'react';
import { Undo2 } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency, formatPercent } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { PosRefundSummaryReport, PosRefundSummaryRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function PosRefundSummaryPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<PosRefundSummaryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [status, setStatus] = useState('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.posRefundSummary({
        start_date: startDate,
        end_date: endDate,
        status: status || undefined,
      });
      setData(res as unknown as PosRefundSummaryReport);
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
    setStatus('');
    setData(null);
    setError(null);
  };

  const cards: SummaryCard[] = data ? [
    { label: 'Total Refunds', value: formatCurrency(data.summary.total_refunds), color: 'red' },
    { label: 'Refund Rate', value: formatPercent(data.summary.refund_rate), color: 'orange' },
  ] : [];

  const columns: ReportColumn[] = [
    { key: 'refund_number', header: 'Refund #' },
    { key: 'date', header: 'Date', format: 'date' },
    { key: 'original_order', header: 'Original Order' },
    { key: 'customer_name', header: 'Customer' },
    { key: 'reason', header: 'Reason' },
    { key: 'refund_method', header: 'Refund Method' },
    { key: 'amount', header: 'Amount', format: 'currency', align: 'right' },
    { key: 'status', header: 'Status' },
    { key: 'approved_by', header: 'Approved By' },
  ];

  return (
    <ReportLayout title="POS Refund Summary" icon={Undo2}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Start Date">
            <CustomDatePicker value={startDate} onChange={setStartDate} />
          </FilterField>
          <FilterField label="End Date">
            <CustomDatePicker value={endDate} onChange={setEndDate} />
          </FilterField>
          <FilterField label="Status">
            <select className={filterSelectClass} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading} error={error} hasData={!!data}
      actions={<ReportExportBar
        onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'pos-refund-summary'); }}
        onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'pos-refund-summary', 'POS Refund Summary'); }}
        onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'pos-refund-summary'); }}
        onPrint={() => printReport('report-print', 'POS Refund Summary')}
        disabled={!data} />}
      printRef={reportRef} printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
