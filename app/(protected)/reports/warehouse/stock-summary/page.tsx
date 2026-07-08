'use client';

import { useState, useRef } from 'react';
import { Warehouse } from 'lucide-react';
import reportService from '@/services/reportService';
import { formatCurrency, formatQty } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { WarehouseStockReport } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function WarehouseStockSummaryPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<WarehouseStockReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportService.warehouseStockSummary({
        warehouse_id: warehouseId ? Number(warehouseId) : undefined,
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
    setWarehouseId('');
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Grand Total Value', value: formatCurrency(data.summary.grand_total_value), color: 'green' },
        { label: 'Grand Total Qty', value: formatQty(data.summary.grand_total_quantity), color: 'blue' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'warehouse_name', header: 'Warehouse', format: 'text' },
    { key: 'product_count', header: 'Products', format: 'number', align: 'right' },
    { key: 'total_quantity', header: 'Total Qty', format: 'qty', align: 'right' },
    { key: 'total_value', header: 'Total Value', format: 'currency', align: 'right' },
    { key: 'low_stock_items', header: 'Low Stock', format: 'number', align: 'right' },
    { key: 'out_of_stock_items', header: 'Out of Stock', format: 'number', align: 'right' },
  ];

  const totalsRow = data
    ? {
        warehouse_name: 'Totals',
        product_count: data.data.reduce((s, r) => s + r.product_count, 0).toLocaleString(),
        total_quantity: formatQty(data.data.reduce((s, r) => s + r.total_quantity, 0)),
        total_value: formatCurrency(data.data.reduce((s, r) => s + r.total_value, 0)),
        low_stock_items: data.data.reduce((s, r) => s + r.low_stock_items, 0).toLocaleString(),
        out_of_stock_items: data.data.reduce((s, r) => s + r.out_of_stock_items, 0).toLocaleString(),
      }
    : undefined;

  return (
    <ReportLayout
      title="Warehouse Stock Summary"
      icon={Warehouse}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Warehouse ID (optional)">
            <input
              type="number"
              className={filterInputClass}
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder="All warehouses"
            />
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        <ReportExportBar
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'warehouse-stock-summary'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'warehouse-stock-summary', 'Warehouse Stock Summary'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'warehouse-stock-summary'); }}
          onPrint={() => printReport('report-print', 'Warehouse Stock Summary Report')}
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
