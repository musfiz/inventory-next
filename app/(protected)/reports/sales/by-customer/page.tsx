'use client';

import { useState, useRef } from 'react';
import { Users } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV, type ExportColumn } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import { ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass, ReportSummaryCards, ReportTable, ReportExportBar, type ReportColumn, type SummaryCard } from '@/components/reports';
import type { SalesByCustomerReport, SalesByCustomerRow } from '@/types/report.types';

export default function SalesByCustomerPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SalesByCustomerReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [customerType, setCustomerType] = useState('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.salesByCustomer({ start_date: startDate, end_date: endDate, customer_type: customerType || undefined });
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
    setCustomerType('');
    setData(null);
    setError(null);
  };

  const cards: SummaryCard[] = data ? [
    { label: 'Total Revenue', value: formatCurrency(data.summary.total_revenue), color: 'green' },
    { label: 'Outstanding', value: formatCurrency(data.summary.total_outstanding), color: 'red' },
    { label: 'Customer Count', value: String(data.summary.customer_count), color: 'blue' },
    { label: 'Avg Revenue', value: formatCurrency(data.summary.avg_revenue_per_customer), color: 'purple' },
  ] : [];

  const columns: ReportColumn<SalesByCustomerRow>[] = [
    { key: 'customer_name', header: 'Customer' },
    { key: 'customer_type', header: 'Type' },
    { key: 'phone', header: 'Phone' },
    { key: 'order_count', header: 'Orders', format: 'number', align: 'right' },
    { key: 'total_revenue', header: 'Total Revenue', format: 'currency', align: 'right' },
    { key: 'total_paid', header: 'Total Paid', format: 'currency', align: 'right' },
    { key: 'outstanding', header: 'Outstanding', format: 'currency', align: 'right' },
    { key: 'avg_order_value', header: 'Avg Order Value', format: 'currency', align: 'right' },
    { key: 'last_purchase', header: 'Last Purchase', format: 'date' },
  ];

  const handleExportPDF = async () => { if (!data) return; const el = reportRef.current; if (!el) return; await exportToPDF(el, 'sales-by-customer'); };
  const handleExportExcel = () => { if (!data) return; exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'sales-by-customer'); };
  const handleExportCSV = () => { if (!data) return; exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'sales-by-customer'); };
  const handlePrint = () => printReport('report-print', 'Sales by Customer');

  return (
    <ReportLayout title="Sales by Customer" icon={Users}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Start Date">
            <CustomDatePicker value={startDate} onChange={setStartDate} />
          </FilterField>
          <FilterField label="End Date">
            <CustomDatePicker value={endDate} onChange={setEndDate} />
          </FilterField>
          <FilterField label="Customer Type">
            <input className={filterInputClass} value={customerType} onChange={e => setCustomerType(e.target.value)} placeholder="Filter by type..." />
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
