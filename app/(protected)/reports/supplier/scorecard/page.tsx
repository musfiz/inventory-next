'use client';

import { useState, useRef } from 'react';
import { BarChart3 } from 'lucide-react';
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
import type { SupplierScorecardReport, SupplierScorecardRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function SupplierScorecardPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SupplierScorecardReport | null>(null);
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
      const res = await reportService.supplierScorecard(params);
      setData(res as unknown as SupplierScorecardReport);
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
    { label: 'Avg Score', value: String(data.summary.avg_score.toFixed(1)), color: 'blue' },
    { label: 'Best Supplier', value: data.summary.best_supplier, color: 'green' },
    { label: 'Worst Supplier', value: data.summary.worst_supplier, color: 'red' },
  ] : [];

  const columns: ReportColumn[] = [
    { key: 'supplier_name', header: 'Supplier' },
    { key: 'total_spend', header: 'Total Spend', format: 'currency', align: 'right' },
    { key: 'po_count', header: 'PO Count', format: 'number', align: 'right' },
    { key: 'on_time_pct', header: 'On-Time %', format: 'percent', align: 'right' },
    { key: 'return_rate_pct', header: 'Return Rate', format: 'percent', align: 'right' },
    { key: 'price_competitiveness', header: 'Price Score', format: 'number', align: 'right' },
    { key: 'lead_time_days', header: 'Lead Time (Days)', format: 'number', align: 'right' },
    { key: 'overall_score', header: 'Overall Score', format: 'number', align: 'right' },
  ];

  return (
    <ReportLayout title="Supplier Scorecard" icon={BarChart3}
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
        onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'supplier-scorecard'); }}
        onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'supplier-scorecard', 'Supplier Scorecard'); }}
        onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'supplier-scorecard'); }}
        onPrint={() => printReport('report-print', 'Supplier Scorecard Report')}
        disabled={!data} />}
      printRef={reportRef} printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
