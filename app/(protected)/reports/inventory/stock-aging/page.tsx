'use client';

import { useState, useRef } from 'react';
import { CalendarClock } from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import reportService from '@/services/reportService';
import { formatCurrency, formatQty } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { StockAgingReport, StockAgingRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function StockAgingPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<StockAgingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        warehouse_id: warehouseId ? Number(warehouseId) : undefined,
      };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const result = await reportService.stockAging(params);
      setData(result as unknown as StockAgingReport);
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
    setSelectedTenantId('');
  };

  const cards: SummaryCard[] = data
    ? [
        { label: '0-30 Days Value', value: formatCurrency(data.summary.total_value_0_30), color: 'green' },
        { label: '31-60 Days Value', value: formatCurrency(data.summary.total_value_31_60), color: 'amber' },
        { label: '61-90 Days Value', value: formatCurrency(data.summary.total_value_61_90), color: 'orange' },
        { label: '90+ Days Value', value: formatCurrency(data.summary.total_value_90_plus), color: 'red' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    { key: 'sku', header: 'SKU' },
    { key: 'warehouse_name', header: 'Warehouse' },
    { key: 'quantity', header: 'Qty', format: 'qty', align: 'right' },
    { key: 'last_received_date', header: 'Last Received', format: 'date' },
    { key: 'age_days', header: 'Age (Days)', format: 'number', align: 'right' },
    { key: 'value', header: 'Value', format: 'currency', align: 'right' },
  ];

  const totalsRow = data
    ? {
        product_name: 'Totals',
        quantity: formatQty(data.data.reduce((s, r) => s + r.quantity, 0)),
        value: formatCurrency(data.data.reduce((s, r) => s + r.value, 0)),
      }
    : undefined;

  return (
    <ReportLayout
      title="Stock Aging Report"
      icon={CalendarClock}
      description="Shows how long stock has been sitting in the warehouse"
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
          <FilterField label="Warehouse ID">
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
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'stock-aging'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'stock-aging', 'Stock Aging'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'stock-aging'); }}
          onPrint={() => printReport('report-print', 'Stock Aging Report')}
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
