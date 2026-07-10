'use client';

import { useState, useRef } from 'react';
import { Scale } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { StockAdjustmentReport, StockAdjustmentRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function StockAdjustmentPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<StockAdjustmentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [adjType, setAdjType] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        start_date: startDate,
        end_date: endDate,
        adjustment_type: adjType || undefined,
      };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const result = await reportService.stockAdjustmentReport(params);
      setData(result as unknown as StockAdjustmentReport);
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
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setAdjType('');
    setSelectedTenantId('');
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Adjustment Value', value: formatCurrency(data.summary.total_adjustment_value), color: 'blue' },
        { label: 'Damage Value', value: formatCurrency(data.summary.total_damage_value), color: 'red' },
        { label: 'Expiry Value', value: formatCurrency(data.summary.total_expiry_value), color: 'orange' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'date', header: 'Date', format: 'date' },
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    { key: 'sku', header: 'SKU' },
    { key: 'warehouse_name', header: 'Warehouse' },
    { key: 'adjustment_type', header: 'Type' },
    { key: 'qty_change', header: 'Qty Change', format: 'qty', align: 'right' },
    { key: 'value', header: 'Value', format: 'currency', align: 'right' },
    { key: 'reason', header: 'Reason' },
    { key: 'approved_by', header: 'Approved By' },
  ];

  const totalsRow = data
    ? {
        product_name: 'Totals',
        value: formatCurrency(data.data.reduce((s, r) => s + r.value, 0)),
      }
    : undefined;

  return (
    <ReportLayout
      title="Stock Adjustment Report"
      icon={Scale}
      description="Summary of all manual adjustments, damages, and write-offs"
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
          <FilterField label="Start Date">
            <CustomDatePicker value={startDate} onChange={setStartDate} />
          </FilterField>
          <FilterField label="End Date">
            <CustomDatePicker value={endDate} onChange={setEndDate} />
          </FilterField>
          <FilterField label="Adjustment Type">
            <select className={filterSelectClass} value={adjType} onChange={(e) => setAdjType(e.target.value)}>
              <option value="">All Types</option>
              <option value="adjustment">Adjustment</option>
              <option value="damage">Damage</option>
              <option value="expiry">Expiry</option>
            </select>
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        <ReportExportBar
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'stock-adjustment'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'stock-adjustment', 'Stock Adjustment'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'stock-adjustment'); }}
          onPrint={() => printReport('report-print', 'Stock Adjustment Report')}
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
