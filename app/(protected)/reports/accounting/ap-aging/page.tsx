'use client';

import { useState, useRef } from 'react';
import { HandCoins } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import type { PayablesReport } from '@/types/report.types';
import { ReportLayout, ReportFilters, FilterField, ReportSummaryCards, ReportTable, ReportExportBar } from '@/components/reports';
import type { SummaryCard } from '@/components/reports';
import type { ExportColumn } from '@/lib/utils/export';

export default function APAgingPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<PayablesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState(todayISO());

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportService.payables({ as_of_date: asOfDate });
      setData(result);
      notify.success('Report generated');
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
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Total Outstanding', value: formatCurrency(data.total_outstanding), color: 'red' },
        { label: 'Current (0-30)', value: formatCurrency(data.total_current), color: 'green' },
        { label: '31-60 Days', value: formatCurrency(data.total_31_60), color: 'orange' },
        { label: '61-90 Days', value: formatCurrency(data.total_61_90), color: 'amber' },
        { label: '90+ Days', value: formatCurrency(data.total_90_plus), color: 'red' },
        { label: 'Supplier Count', value: data.supplier_count, color: 'blue' },
      ]
    : [];

  const columns = [
    { key: 'supplier_name', header: 'Supplier', format: 'text' as const },
    { key: 'supplier_phone', header: 'Phone', format: 'text' as const },
    { key: 'po_count', header: 'POs', format: 'number' as const, align: 'right' as const },
    { key: 'current', header: 'Current', format: 'currency' as const, align: 'right' as const, accessor: (row: any) => row.aging.current },
    { key: 'd_31_60', header: '31-60', format: 'currency' as const, align: 'right' as const, accessor: (row: any) => row.aging.d_31_60 },
    { key: 'd_61_90', header: '61-90', format: 'currency' as const, align: 'right' as const, accessor: (row: any) => row.aging.d_61_90 },
    { key: 'd_90_plus', header: '90+', format: 'currency' as const, align: 'right' as const, accessor: (row: any) => row.aging.d_90_plus },
    { key: 'total', header: 'Total', format: 'currency' as const, align: 'right' as const, accessor: (row: any) => row.aging.total },
  ];

  const exportColumns: ExportColumn[] = [
    { key: 'supplier_name', label: 'Supplier' },
    { key: 'supplier_phone', label: 'Phone' },
    { key: 'po_count', label: 'POs' },
    { key: 'aging.current', label: 'Current' },
    { key: 'aging.d_31_60', label: '31-60' },
    { key: 'aging.d_61_90', label: '61-90' },
    { key: 'aging.d_90_plus', label: '90+' },
    { key: 'aging.total', label: 'Total' },
  ];

  const exportData = data?.suppliers.map((s) => ({
    supplier_name: s.supplier_name,
    supplier_phone: s.supplier_phone ?? '',
    po_count: s.po_count,
    'aging.current': s.aging.current,
    'aging.d_31_60': s.aging.d_31_60,
    'aging.d_61_90': s.aging.d_61_90,
    'aging.d_90_plus': s.aging.d_90_plus,
    'aging.total': s.aging.total,
  })) ?? [];

  const filename = `AP_Aging_${asOfDate}`;

  const totalsRow = data
    ? {
        supplier_name: 'Totals',
        supplier_phone: '',
        po_count: data.supplier_count,
        current: formatCurrency(data.total_current),
        d_31_60: formatCurrency(data.total_31_60),
        d_61_90: formatCurrency(data.total_61_90),
        d_90_plus: formatCurrency(data.total_90_plus),
        total: formatCurrency(data.total_outstanding),
      }
    : undefined;

  return (
    <ReportLayout
      title="AP Aging (Payables)"
      icon={HandCoins}
      description="Accounts Payable Aging Summary"
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="As of Date">
            <CustomDatePicker value={asOfDate} onChange={setAsOfDate} />
          </FilterField>
        </ReportFilters>
      }
      summaryCards={<ReportSummaryCards cards={cards} />}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        data ? (
          <ReportExportBar
            onExportPDF={async () => { if (reportRef.current) await exportToPDF(reportRef.current, filename); }}
            onExportExcel={() => exportColumnsToExcel(exportData, exportColumns, filename)}
            onExportCSV={() => exportColumnsToCSV(exportData, exportColumns, filename)}
            onPrint={() => printReport('report-print', 'AP Aging (Payables)')}
          />
        ) : undefined
      }
      printRef={reportRef}
      printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        <ReportTable columns={columns} data={data?.suppliers ?? []} pageSize={25} totalsRow={totalsRow} />
      </div>
    </ReportLayout>
  );
}
