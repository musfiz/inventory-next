'use client';

import { useState, useRef } from 'react';
import { TrendingUp } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency, formatPercent } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { CustomerProfitabilityReport, CustomerProfitabilityRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function CustomerProfitabilityPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CustomerProfitabilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.customerProfitability({
        start_date: startDate,
        end_date: endDate,
      });
      setData(res as unknown as CustomerProfitabilityReport);
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
    { label: 'Total Profit', value: formatCurrency(data.summary.total_profit), color: 'green' },
    { label: 'Avg Margin', value: formatPercent(data.summary.avg_margin), color: 'blue' },
    { label: 'Top Customer', value: data.summary.top_customer, color: 'purple' },
  ] : [];

  const columns: ReportColumn[] = [
    { key: 'customer_name', header: 'Customer' },
    { key: 'revenue', header: 'Revenue', format: 'currency', align: 'right' },
    { key: 'cogs', header: 'COGS', format: 'currency', align: 'right' },
    { key: 'gross_profit', header: 'Gross Profit', format: 'currency', align: 'right' },
    { key: 'margin_pct', header: 'Margin %', format: 'percent', align: 'right' },
    { key: 'order_count', header: 'Orders', format: 'number', align: 'right' },
    { key: 'returns', header: 'Returns', format: 'number', align: 'right' },
    { key: 'net_profit', header: 'Net Profit', format: 'currency', align: 'right' },
  ];

  return (
    <ReportLayout title="Customer Profitability" icon={TrendingUp}
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
        onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'customer-profitability'); }}
        onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'customer-profitability', 'Customer Profitability'); }}
        onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'customer-profitability'); }}
        onPrint={() => printReport('report-print', 'Customer Profitability Report')}
        disabled={!data} />}
      printRef={reportRef} printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
