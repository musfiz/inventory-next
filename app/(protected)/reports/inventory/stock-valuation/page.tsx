'use client';

import { useState, useRef } from 'react';
import { Coins } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import reportService from '@/services/reportService';
import { todayISO, formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import { ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass, ReportSummaryCards, ReportTable, ReportExportBar } from '@/components/reports';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { StockValuationReport } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function StockValuationPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<StockValuationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [costingMethod, setCostingMethod] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        as_of_date: asOfDate,
        costing_method: costingMethod as any || undefined,
      };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const result = await reportService.stockValuation(params);
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
    setCostingMethod('');
    setSelectedTenantId('');
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Total SKUs', value: data.summary.total_skus, color: 'blue' },
        { label: 'Total Qty', value: data.summary.total_quantity, color: 'purple' },
        { label: 'Total Value', value: formatCurrency(data.summary.total_value), color: 'green' },
        { label: 'Avg Cost', value: formatCurrency(data.summary.avg_cost), color: 'amber' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'product_name', header: 'Product', format: 'text' },
    { key: 'variation_name', header: 'Variation', format: 'text' },
    { key: 'sku', header: 'SKU', format: 'text' },
    { key: 'warehouse_name', header: 'Warehouse', format: 'text' },
    { key: 'quantity', header: 'Qty', format: 'qty', align: 'right' },
    { key: 'reserved_quantity', header: 'Reserved', format: 'qty', align: 'right' },
    { key: 'available_quantity', header: 'Available', format: 'qty', align: 'right' },
    { key: 'unit_cost', header: 'Unit Cost', format: 'currency', align: 'right' },
    { key: 'total_value', header: 'Total Value', format: 'currency', align: 'right' },
  ];

  const totalsRow = data
    ? {
        product_name: 'Totals',
        total_value: formatCurrency(data.summary.total_value),
        quantity: data.summary.total_quantity.toLocaleString(),
      }
    : undefined;

  return (
    <ReportLayout
      title="Stock Valuation Report"
      icon={Coins}
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
          <FilterField label="As of Date">
            <CustomDatePicker value={asOfDate} onChange={setAsOfDate} />
          </FilterField>
          <FilterField label="Costing Method">
            <select className={filterSelectClass} value={costingMethod} onChange={(e) => setCostingMethod(e.target.value)}>
              <option value="">All</option>
              <option value="fifo">FIFO</option>
              <option value="lifo">LIFO</option>
              <option value="weighted_avg">Weighted Average</option>
              <option value="standard">Standard</option>
            </select>
          </FilterField>
        </ReportFilters>
      }
      summaryCards={<ReportSummaryCards cards={cards} />}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        <ReportExportBar
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'stock-valuation'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'stock-valuation', 'Stock Valuation'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'stock-valuation'); }}
          onPrint={() => printReport('report-print', 'Stock Valuation Report')}
          disabled={!data}
        />
      }
      printRef={reportRef}
      printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        <ReportTable columns={columns} data={data?.data ?? []} pageSize={25} totalsRow={totalsRow} />
      </div>
    </ReportLayout>
  );
}
