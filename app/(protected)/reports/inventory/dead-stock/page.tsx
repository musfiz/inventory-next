'use client';

import { useState, useRef } from 'react';
import { Archive } from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import reportService from '@/services/reportService';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { DeadStockReport, DeadStockRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function DeadStockPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<DeadStockReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [daysThreshold, setDaysThreshold] = useState('90');
  const [warehouseId, setWarehouseId] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        days_threshold: Number(daysThreshold),
        warehouse_id: warehouseId ? Number(warehouseId) : undefined,
      };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const result = await reportService.deadStock(params);
      setData(result as unknown as DeadStockReport);
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
    setDaysThreshold('90');
    setWarehouseId('');
    setSelectedTenantId('');
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Total Dead Stock Value', value: formatCurrency(data.summary.total_value), color: 'red' },
        { label: 'Dead SKUs', value: String(data.summary.total_skus), color: 'orange' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    { key: 'sku', header: 'SKU' },
    { key: 'warehouse_name', header: 'Warehouse' },
    { key: 'quantity', header: 'Qty', format: 'qty', align: 'right' },
    { key: 'unit_cost', header: 'Unit Cost', format: 'currency', align: 'right' },
    { key: 'total_value', header: 'Total Value', format: 'currency', align: 'right' },
    { key: 'last_sale_date', header: 'Last Sale', format: 'date' },
    { key: 'days_since_last_sale', header: 'Days Since Sale', format: 'number', align: 'right' },
  ];

  const totalsRow = data
    ? {
        product_name: 'Totals',
        quantity: formatNumber(data.data.reduce((s, r) => s + r.quantity, 0)),
        total_value: formatCurrency(data.data.reduce((s, r) => s + r.total_value, 0)),
      }
    : undefined;

  return (
    <ReportLayout
      title="Dead Stock Report"
      icon={Archive}
      description="Products with zero sales movement in N days"
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
          <FilterField label="Days Threshold">
            <input
              type="number"
              className={filterInputClass}
              value={daysThreshold}
              onChange={(e) => setDaysThreshold(e.target.value)}
              placeholder="90"
            />
          </FilterField>
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
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'dead-stock'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'dead-stock', 'Dead Stock'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'dead-stock'); }}
          onPrint={() => printReport('report-print', 'Dead Stock Report')}
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
