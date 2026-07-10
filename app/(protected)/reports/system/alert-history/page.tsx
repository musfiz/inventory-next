'use client';

import { useState, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { GenericReportResponse } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function AlertHistoryPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<GenericReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [status, setStatus] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        start_date: startDate,
        end_date: endDate,
        status: status || undefined,
      };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const result = await reportService.alertHistory(params);
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
    setStatus('');
    setSelectedTenantId('');
  };

  const cards: SummaryCard[] = data?.summary
    ? [
        { label: 'Total Alerts', value: String((data as any).summary?.total_alerts ?? data.data.length), color: 'red' },
        { label: 'Unresolved', value: String((data as any).summary?.unresolved ?? 0), color: 'orange' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'date', header: 'Date', format: 'datetime' },
    { key: 'alert_type', header: 'Alert Type' },
    { key: 'priority', header: 'Priority' },
    { key: 'title', header: 'Title' },
    { key: 'message', header: 'Message' },
    { key: 'status', header: 'Status' },
    { key: 'resolved_at', header: 'Resolved At', format: 'datetime' },
  ];

  return (
    <ReportLayout
      title="Alert History"
      icon={AlertTriangle}
      description="History of all system-generated alerts"
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
          <FilterField label="Status">
            <select className={filterSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
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
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'alert-history'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'alert-history', 'Alert History'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'alert-history'); }}
          onPrint={() => printReport('report-print', 'Alert History')}
          disabled={!data}
        />
      }
      printRef={reportRef}
      printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
