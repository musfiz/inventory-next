'use client';

import { useState, useRef } from 'react';
import { PackageCheck } from 'lucide-react';
import reportService from '@/services/reportService';
import { formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import { ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass, ReportSummaryCards, ReportTable, ReportExportBar } from '@/components/reports';
import type { ReorderReport } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';
import type { ReactNode } from 'react';

export default function ReorderPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ReorderReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState('all');
  const [warehouseId, setWarehouseId] = useState('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportService.reorderReport({
        severity: severity as any || undefined,
        warehouse_id: warehouseId ? Number(warehouseId) : null,
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
    setSeverity('all');
    setWarehouseId('');
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Critical Items', value: data.summary.critical_count, color: 'red' },
        { label: 'Low Items', value: data.summary.low_count, color: 'orange' },
        { label: 'Suggested Value', value: formatCurrency(data.summary.total_suggested_value), color: 'purple' },
      ]
    : [];

  const severityBadge = (value: string): ReactNode => {
    const color = value === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    return (
      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${color}`}>
        {value}
      </span>
    );
  };

  const columns: ReportColumn[] = [
    { key: 'product_name', header: 'Product', format: 'text' },
    { key: 'variation_name', header: 'Variation', format: 'text' },
    { key: 'sku', header: 'SKU', format: 'text' },
    { key: 'warehouse_name', header: 'Warehouse', format: 'text' },
    { key: 'current_qty', header: 'Current Qty', format: 'qty', align: 'right' },
    { key: 'reorder_point', header: 'Reorder Point', format: 'qty', align: 'right' },
    { key: 'suggested_reorder_qty', header: 'Suggested Qty', format: 'qty', align: 'right' },
    { key: 'last_received_date', header: 'Last Received', format: 'date' },
    { key: 'supplier_name', header: 'Supplier', format: 'text' },
    {
      key: 'severity',
      header: 'Severity',
      cell: (_: any, row: any) => severityBadge(row.severity),
    },
  ];

  return (
    <ReportLayout
      title="Reorder & Low Stock Report"
      icon={PackageCheck}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Severity">
            <select className={filterSelectClass} value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="low">Low</option>
            </select>
          </FilterField>
          <FilterField label="Warehouse ID (optional)">
            <input className={filterInputClass} type="text" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder="e.g. 1" />
          </FilterField>
        </ReportFilters>
      }
      summaryCards={<ReportSummaryCards cards={cards} />}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        <ReportExportBar
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'reorder-report'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'reorder-report', 'Reorder Report'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'reorder-report'); }}
          onPrint={() => printReport('report-print', 'Reorder & Low Stock Report')}
          disabled={!data}
        />
      }
      printRef={reportRef}
      printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        <ReportTable columns={columns} data={data?.data ?? []} pageSize={25} />
      </div>
    </ReportLayout>
  );
}
