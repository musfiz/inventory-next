'use client';

import { useState, useRef } from 'react';
import { FileBarChart } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV, type ExportColumn } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import { ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass, ReportSummaryCards, ReportTable, ReportExportBar, type ReportColumn, type SummaryCard } from '@/components/reports';
import type { PoSummaryReport, PoSummaryRow } from '@/types/report.types';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ordered: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  partial: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  received: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function PoSummaryPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<PoSummaryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [status, setStatus] = useState('all');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.poSummary({ start_date: startDate, end_date: endDate, status: status === 'all' ? undefined : status });
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
    setStatus('all');
    setData(null);
    setError(null);
  };

  const cards: SummaryCard[] = data ? [
    { label: 'Total PO Value', value: formatCurrency(data.summary.total_po_value), color: 'green' },
    { label: 'Total Paid', value: formatCurrency(data.summary.total_paid), color: 'blue' },
    { label: 'Total Due', value: formatCurrency(data.summary.total_due), color: 'red' },
    { label: 'PO Count', value: String(data.data.length), color: 'purple' },
  ] : [];

  const columns: ReportColumn<PoSummaryRow>[] = [
    { key: 'po_number', header: 'PO #' },
    { key: 'supplier_name', header: 'Supplier' },
    { key: 'warehouse_name', header: 'Warehouse' },
    { key: 'order_date', header: 'Order Date', format: 'date' },
    { key: 'expected_delivery', header: 'Expected Delivery', format: 'date' },
    {
      key: 'status', header: 'Status',
      cell: (value: string) => (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[value] || statusColors.draft}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    { key: 'subtotal', header: 'Subtotal', format: 'currency', align: 'right' },
    { key: 'tax', header: 'Tax', format: 'currency', align: 'right' },
    { key: 'total', header: 'Total', format: 'currency', align: 'right' },
    { key: 'paid', header: 'Paid', format: 'currency', align: 'right' },
    { key: 'due', header: 'Due', format: 'currency', align: 'right' },
    { key: 'payment_status', header: 'Payment Status' },
  ];

  const handleExportPDF = async () => { if (!data) return; const el = reportRef.current; if (!el) return; await exportToPDF(el, 'po-summary'); };
  const handleExportExcel = () => { if (!data) return; exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'po-summary'); };
  const handleExportCSV = () => { if (!data) return; exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'po-summary'); };
  const handlePrint = () => printReport('report-print', 'PO Summary Report');

  return (
    <ReportLayout title="PO Summary Report" icon={FileBarChart}
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
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="ordered">Ordered</option>
              <option value="partial">Partial</option>
              <option value="received">Received</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
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
