'use client';

import { useState, useRef } from 'react';
import { Truck } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { GenericReportResponse } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function StockTransferPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<GenericReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportService.stockTransfer({
        start_date: startDate,
        end_date: endDate,
      });
      setData(result);
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
  };

  const cards: SummaryCard[] = data?.summary
    ? [
        { label: 'Total Transfers', value: String((data as any).summary?.total_transfers ?? data.data.length), color: 'blue' },
        { label: 'Total Value', value: formatCurrency((data as any).summary?.total_value ?? 0), color: 'green' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'date', header: 'Date', format: 'date' },
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    { key: 'from_warehouse', header: 'From Warehouse' },
    { key: 'to_warehouse', header: 'To Warehouse' },
    { key: 'quantity', header: 'Qty', format: 'qty', align: 'right' },
    { key: 'value', header: 'Value', format: 'currency', align: 'right' },
    { key: 'transfer_by', header: 'Transfer By' },
  ];

  return (
    <ReportLayout
      title="Stock Transfer Report"
      icon={Truck}
      description="All inter-warehouse stock transfers"
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
      summaryCards={cards.length ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        <ReportExportBar
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'stock-transfer'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'stock-transfer', 'Stock Transfer'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'stock-transfer'); }}
          onPrint={() => printReport('report-print', 'Stock Transfer Report')}
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
