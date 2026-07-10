'use client';

import { useState, useRef } from 'react';
import { History } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import { ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass, ReportSummaryCards, ReportTable, ReportExportBar } from '@/components/reports';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { StockMovementReport } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function StockMovementPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<StockMovementReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [movementType, setMovementType] = useState('all');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        start_date: startDate,
        end_date: endDate,
        movement_type: movementType === 'all' ? undefined : movementType,
      };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const result = await reportService.stockMovementReport(params);
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
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setMovementType('all');
    setSelectedTenantId('');
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Total In', value: data.summary.total_in, color: 'green' },
        { label: 'Total Out', value: data.summary.total_out, color: 'red' },
        { label: 'Net Change', value: data.summary.net_change, color: 'blue' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'date', header: 'Date', format: 'datetime' },
    { key: 'product_name', header: 'Product', format: 'text' },
    { key: 'sku', header: 'SKU', format: 'text' },
    { key: 'warehouse_name', header: 'Warehouse', format: 'text' },
    { key: 'movement_type', header: 'Type', format: 'text' },
    { key: 'reference_type', header: 'Ref Type', format: 'text' },
    { key: 'reference_number', header: 'Ref #', format: 'text' },
    { key: 'qty_before', header: 'Qty Before', format: 'qty', align: 'right' },
    { key: 'qty_change', header: 'Qty Change', format: 'qty', align: 'right' },
    { key: 'qty_after', header: 'Qty After', format: 'qty', align: 'right' },
    { key: 'reason', header: 'Reason', format: 'text' },
    { key: 'created_by', header: 'Created By', format: 'text' },
  ];

  return (
    <ReportLayout
      title="Stock Movement Ledger"
      icon={History}
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
          <FilterField label="Movement Type">
            <select className={filterSelectClass} value={movementType} onChange={(e) => setMovementType(e.target.value)}>
              <option value="all">All</option>
              <option value="in">In</option>
              <option value="out">Out</option>
              <option value="adjustment">Adjustment</option>
              <option value="transfer">Transfer</option>
              <option value="return">Return</option>
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
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'stock-movement'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'stock-movement', 'Stock Movement'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'stock-movement'); }}
          onPrint={() => printReport('report-print', 'Stock Movement Ledger')}
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
