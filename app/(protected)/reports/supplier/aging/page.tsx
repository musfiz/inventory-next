'use client';

import { useState, useRef } from 'react';
import { CalendarClock } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { SupplierAgingReport } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function SupplierAgingPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SupplierAgingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState(todayISO());

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportService.supplierAging({ as_of_date: asOfDate });
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
    setAsOfDate(todayISO());
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Total Payable', value: formatCurrency(data.summary.total_payable), color: 'red' },
        { label: 'Overdue Suppliers', value: data.summary.overdue_supplier_count, color: 'orange' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'supplier_name', header: 'Supplier', format: 'text' },
    { key: 'phone', header: 'Phone', format: 'text' },
    { key: 'total_payable', header: 'Total Payable', format: 'currency', align: 'right' },
    { key: 'current', header: 'Current', format: 'currency', align: 'right' },
    { key: 'd_31_60', header: '31-60 Days', format: 'currency', align: 'right' },
    { key: 'd_61_90', header: '61-90 Days', format: 'currency', align: 'right' },
    { key: 'd_90_plus', header: '90+ Days', format: 'currency', align: 'right' },
  ];

  const totalsRow = data
    ? {
        supplier_name: 'Totals',
        total_payable: formatCurrency(data.data.reduce((s, r) => s + r.total_payable, 0)),
        current: formatCurrency(data.data.reduce((s, r) => s + r.current, 0)),
        d_31_60: formatCurrency(data.data.reduce((s, r) => s + r.d_31_60, 0)),
        d_61_90: formatCurrency(data.data.reduce((s, r) => s + r.d_61_90, 0)),
        d_90_plus: formatCurrency(data.data.reduce((s, r) => s + r.d_90_plus, 0)),
      }
    : undefined;

  return (
    <ReportLayout
      title="Supplier Aging"
      icon={CalendarClock}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="As of Date">
            <CustomDatePicker value={asOfDate} onChange={setAsOfDate} />
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        <ReportExportBar
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'supplier-aging'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'supplier-aging', 'Supplier Aging'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'supplier-aging'); }}
          onPrint={() => printReport('report-print', 'Supplier Aging Report')}
          disabled={!data}
        />
      }
      printRef={reportRef}
      printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} totalsRow={totalsRow} />}
      </div>
    </ReportLayout>
  );
}
