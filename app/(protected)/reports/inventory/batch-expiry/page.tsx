'use client';

import { useState, useRef } from 'react';
import { CalendarClock } from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import reportService from '@/services/reportService';
import { formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import { ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass, ReportSummaryCards, ReportTable, ReportExportBar } from '@/components/reports';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { BatchExpiryReport } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';
import type { ReactNode } from 'react';

const STATUS_COLORS: Record<string, string> = {
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expiring_7: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  expiring_30: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  expiring_60: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  valid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const STATUS_LABELS: Record<string, string> = {
  expired: 'Expired',
  expiring_7: 'Expiring 7 Days',
  expiring_30: 'Expiring 30 Days',
  expiring_60: 'Expiring 60 Days',
  valid: 'Valid',
};

export default function BatchExpiryPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<BatchExpiryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urgency, setUrgency] = useState('all');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        urgency: urgency as any || undefined,
      };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const result = await reportService.batchExpiryReport(params);
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
    setUrgency('all');
    setSelectedTenantId('');
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Expired Count', value: data.summary.expired_count, color: 'red' },
        { label: 'Expired Value', value: formatCurrency(data.summary.expired_value), color: 'red' },
        { label: 'Expiring 7 Days', value: data.summary.expiring_7_count, color: 'orange' },
        { label: 'Expiring 30 Days', value: data.summary.expiring_30_count, color: 'amber' },
        { label: 'Value at Risk', value: formatCurrency(data.summary.total_value_at_risk), color: 'purple' },
      ]
    : [];

  const statusBadge = (value: string): ReactNode => {
    const colorClass = STATUS_COLORS[value] || STATUS_COLORS.valid;
    const label = STATUS_LABELS[value] || value;
    return (
      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}`}>
        {label}
      </span>
    );
  };

  const columns: ReportColumn[] = [
    { key: 'product_name', header: 'Product', format: 'text' },
    { key: 'batch_number', header: 'Batch #', format: 'text' },
    { key: 'warehouse_name', header: 'Warehouse', format: 'text' },
    { key: 'expiry_date', header: 'Expiry Date', format: 'date' },
    { key: 'days_to_expiry', header: 'Days to Expiry', format: 'number', align: 'right' },
    { key: 'current_qty', header: 'Current Qty', format: 'qty', align: 'right' },
    {
      key: 'status',
      header: 'Status',
      cell: (_: any, row: any) => statusBadge(row.status),
    },
    { key: 'value_at_risk', header: 'Value at Risk', format: 'currency', align: 'right' },
  ];

  return (
    <ReportLayout
      title="Batch & Expiry Report"
      icon={CalendarClock}
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
          <FilterField label="Urgency">
            <select className={filterSelectClass} value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              <option value="all">All</option>
              <option value="expired">Expired</option>
              <option value="7days">Expiring Within 7 Days</option>
              <option value="30days">Expiring Within 30 Days</option>
              <option value="60days">Expiring Within 60 Days</option>
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
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'batch-expiry'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'batch-expiry', 'Batch Expiry'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'batch-expiry'); }}
          onPrint={() => printReport('report-print', 'Batch & Expiry Report')}
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
