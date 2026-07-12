'use client';

import { useState, useRef } from 'react';
import { Truck } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency, formatPercent } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { SupplierPerformanceReport, SupplierPerformanceRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function SupplierPerformancePage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SupplierPerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        start_date: startDate,
        end_date: endDate,
      };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const res = await reportService.supplierPerformance(params);
      setData(res as unknown as SupplierPerformanceReport);
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
    setSelectedTenantId('');
    setData(null);
    setError(null);
  };

  const cards: SummaryCard[] = data ? [
    { label: 'Avg On-Time Rate', value: formatPercent(data.summary.avg_on_time_rate), color: 'green' },
    { label: 'Avg Lead Time', value: `${data.summary.avg_lead_time} days`, color: 'blue' },
    { label: 'Best Supplier', value: data.summary.best_supplier, color: 'purple' },
  ] : [];

  const columns: ReportColumn[] = [
    { key: 'supplier_name', header: 'Supplier' },
    { key: 'total_pos', header: 'Total POs', format: 'number', align: 'right' },
    { key: 'on_time_delivery_pct', header: 'On-Time %', format: 'percent', align: 'right' },
    { key: 'avg_lead_time_days', header: 'Avg Lead Time', format: 'number', align: 'right' },
    { key: 'total_purchase_value', header: 'Total Purchase', format: 'currency', align: 'right' },
    { key: 'return_rate_pct', header: 'Return Rate', format: 'percent', align: 'right' },
    { key: 'quality_score', header: 'Quality Score', format: 'number', align: 'right' },
  ];

  return (
    <ReportLayout title="Supplier Performance Report" icon={Truck}
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
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading} error={error} hasData={!!data}
      actions={<ReportExportBar
        onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'supplier-performance'); }}
        onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'supplier-performance', 'Supplier Performance'); }}
        onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'supplier-performance'); }}
        onPrint={() => printReport('report-print', 'Supplier Performance Report')}
        disabled={!data} />}
      printRef={reportRef} printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
