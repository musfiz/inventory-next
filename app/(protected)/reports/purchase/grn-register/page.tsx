'use client';

import { useState, useRef } from 'react';
import { Container } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { GrnRegisterReport, GrnRegisterRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function GrnRegisterPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<GrnRegisterReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [supplierId, setSupplierId] = useState('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.grnRegister({
        start_date: startDate,
        end_date: endDate,
        supplier_id: supplierId ? Number(supplierId) : undefined,
      });
      setData(res as unknown as GrnRegisterReport);
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
    setSupplierId('');
    setData(null);
    setError(null);
  };

  const cards: SummaryCard[] = data ? [
    { label: 'Total Receipts', value: formatCurrency(data.summary.total_value), color: 'green' },
    { label: 'Receipt Count', value: String(data.data.length), color: 'blue' },
  ] : [];

  const columns: ReportColumn[] = [
    { key: 'grn_date', header: 'GRN Date', format: 'date' },
    { key: 'po_number', header: 'PO #' },
    { key: 'supplier_name', header: 'Supplier' },
    { key: 'warehouse_name', header: 'Warehouse' },
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    { key: 'qty_received', header: 'Qty Received', format: 'qty', align: 'right' },
    { key: 'unit_cost', header: 'Unit Cost', format: 'currency', align: 'right' },
    { key: 'total_cost', header: 'Total Cost', format: 'currency', align: 'right' },
    { key: 'received_by', header: 'Received By' },
  ];

  return (
    <ReportLayout title="GRN Register" icon={Container}
      description="Goods Received Notes — all stock receipts in a date range"
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Start Date">
            <CustomDatePicker value={startDate} onChange={setStartDate} />
          </FilterField>
          <FilterField label="End Date">
            <CustomDatePicker value={endDate} onChange={setEndDate} />
          </FilterField>
          <FilterField label="Supplier ID">
            <input type="number" className={filterInputClass} value={supplierId} onChange={e => setSupplierId(e.target.value)} placeholder="All suppliers" />
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading} error={error} hasData={!!data}
      actions={<ReportExportBar
        onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'grn-register'); }}
        onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'grn-register', 'GRN Register'); }}
        onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'grn-register'); }}
        onPrint={() => printReport('report-print', 'GRN Register Report')}
        disabled={!data} />}
      printRef={reportRef} printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
