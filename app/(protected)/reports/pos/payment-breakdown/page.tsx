'use client';

import { useState, useRef } from 'react';
import { HandCoins } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency, formatPercent } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { PaymentBreakdownReport, PaymentBreakdownRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function PaymentBreakdownPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<PaymentBreakdownReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.paymentBreakdown({
        start_date: startDate,
        end_date: endDate,
      });
      setData(res as unknown as PaymentBreakdownReport);
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
    { label: 'Total Collected', value: formatCurrency(data.summary.total_collected), color: 'green' },
    { label: 'Cash %', value: formatPercent(data.summary.cash_pct), color: 'blue' },
    { label: 'Digital %', value: formatPercent(data.summary.digital_pct), color: 'purple' },
  ] : [];

  const columns: ReportColumn[] = [
    { key: 'payment_method', header: 'Payment Method' },
    { key: 'transaction_count', header: 'Transactions', format: 'number', align: 'right' },
    { key: 'total_amount', header: 'Total Amount', format: 'currency', align: 'right' },
    { key: 'processing_fees', header: 'Processing Fees', format: 'currency', align: 'right' },
    { key: 'net_amount', header: 'Net Amount', format: 'currency', align: 'right' },
    { key: 'pct_of_total', header: '% of Total', format: 'percent', align: 'right' },
  ];

  return (
    <ReportLayout title="Payment Breakdown" icon={HandCoins}
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
        onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'payment-breakdown'); }}
        onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'payment-breakdown', 'Payment Breakdown'); }}
        onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'payment-breakdown'); }}
        onPrint={() => printReport('report-print', 'Payment Breakdown Report')}
        disabled={!data} />}
      printRef={reportRef} printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
