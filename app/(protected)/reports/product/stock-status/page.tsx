'use client';

import { useState, useRef } from 'react';
import { BarChart3 } from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import reportService from '@/services/reportService';
import { formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV, type ExportColumn } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import { ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass, ReportSummaryCards, ReportTable, ReportExportBar, type ReportColumn, type SummaryCard } from '@/components/reports';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { StockStatusReport, StockStatusRow } from '@/types/report.types';

const statusStyles: Record<string, string> = {
  in_stock: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  low_stock: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  out_of_stock: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
};

export default function StockStatusPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<StockStatusReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockStatus, setStockStatus] = useState<'in_stock' | 'low_stock' | 'out_of_stock' | 'all'>('all');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { stock_status: stockStatus === 'all' ? undefined : stockStatus };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const res = await reportService.stockStatus(params);
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
    setStockStatus('all');
    setSelectedTenantId('');
    setData(null);
    setError(null);
  };

  const cards: SummaryCard[] = data ? [
    { label: 'In Stock', value: String(data.summary.in_stock_count), color: 'green' },
    { label: 'Low Stock', value: String(data.summary.low_stock_count), color: 'orange' },
    { label: 'Out of Stock', value: String(data.summary.out_of_stock_count), color: 'red' },
    { label: 'Total Value', value: formatCurrency(data.summary.total_value), color: 'blue' },
  ] : [];

  const columns: ReportColumn<StockStatusRow>[] = [
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    { key: 'sku', header: 'SKU' },
    { key: 'warehouse_name', header: 'Warehouse' },
    { key: 'on_hand', header: 'On Hand', format: 'qty', align: 'right' },
    { key: 'reserved', header: 'Reserved', format: 'qty', align: 'right' },
    { key: 'available', header: 'Available', format: 'qty', align: 'right' },
    { key: 'reorder_point', header: 'Reorder Point', format: 'qty', align: 'right' },
    {
      key: 'status', header: 'Status',
      cell: (value: string) => (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusStyles[value] || ''}`}>
          {statusLabels[value] || value}
        </span>
      ),
    },
    { key: 'value', header: 'Value', format: 'currency', align: 'right' },
  ];

  const handleExportPDF = async () => { if (!data) return; const el = reportRef.current; if (!el) return; await exportToPDF(el, 'stock-status'); };
  const handleExportExcel = () => { if (!data) return; exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'stock-status'); };
  const handleExportCSV = () => { if (!data) return; exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'stock-status'); };
  const handlePrint = () => printReport('report-print', 'Product Stock Status');

  return (
    <ReportLayout title="Product Stock Status" icon={BarChart3}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          {isSuperAdmin && (
            <FilterField label="Tenant">
              <TenantSelect
                value={selectedTenantId}
                onChange={(tid) => setSelectedTenantId(tid || '')}
                placeholder="All Tenants"
              />
            </FilterField>
          )}
          <FilterField label="Stock Status">
            <select className={filterSelectClass} value={stockStatus} onChange={e => setStockStatus(e.target.value as 'in_stock' | 'low_stock' | 'out_of_stock' | 'all')}>
              <option value="all">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
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
