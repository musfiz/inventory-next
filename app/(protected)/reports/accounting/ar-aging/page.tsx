'use client';

import { useState, useRef } from 'react';
import { HandCoins } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import reportService from '@/services/reportService';
import { todayISO, formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import type { ReceivablesReport } from '@/types/accounting.types';
import { ReportLayout, ReportFilters, FilterField, ReportSummaryCards, ReportTable, ReportExportBar } from '@/components/reports';
import type { SummaryCard } from '@/components/reports';
import type { ExportColumn } from '@/lib/utils/export';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';

export default function ARAgingPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ReceivablesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { as_of_date: string; tenant_id?: string } = { as_of_date: asOfDate };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const result = await reportService.receivables(params);
      setData(result);
      notify.success('Report generated');
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
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Total Outstanding', value: formatCurrency(data.total_outstanding), color: 'red' },
        { label: 'Current (0-30)', value: formatCurrency(data.total_current), color: 'green' },
        { label: '31-60 Days', value: formatCurrency(data.total_31_60), color: 'orange' },
        { label: '61-90 Days', value: formatCurrency(data.total_61_90), color: 'amber' },
        { label: '90+ Days', value: formatCurrency(data.total_90_plus), color: 'red' },
        { label: 'Customer Count', value: data.customer_count, color: 'blue' },
      ]
    : [];

  const columns = [
    { key: 'customer_name', header: 'Customer', format: 'text' as const },
    { key: 'customer_phone', header: 'Phone', format: 'text' as const },
    { key: 'invoice_count', header: 'Invoices', format: 'number' as const, align: 'right' as const },
    { key: 'current', header: 'Current', format: 'currency' as const, align: 'right' as const, accessor: (row: any) => row.aging.current },
    { key: 'd_31_60', header: '31-60', format: 'currency' as const, align: 'right' as const, accessor: (row: any) => row.aging.d_31_60 },
    { key: 'd_61_90', header: '61-90', format: 'currency' as const, align: 'right' as const, accessor: (row: any) => row.aging.d_61_90 },
    { key: 'd_90_plus', header: '90+', format: 'currency' as const, align: 'right' as const, accessor: (row: any) => row.aging.d_90_plus },
    { key: 'total', header: 'Total', format: 'currency' as const, align: 'right' as const, accessor: (row: any) => row.aging.total },
  ];

  const exportColumns: ExportColumn[] = [
    { key: 'customer_name', label: 'Customer' },
    { key: 'customer_phone', label: 'Phone' },
    { key: 'invoice_count', label: 'Invoices' },
    { key: 'aging.current', label: 'Current' },
    { key: 'aging.d_31_60', label: '31-60' },
    { key: 'aging.d_61_90', label: '61-90' },
    { key: 'aging.d_90_plus', label: '90+' },
    { key: 'aging.total', label: 'Total' },
  ];

  const exportData = data?.customers.map((c) => ({
    customer_name: c.customer_name,
    customer_phone: c.customer_phone ?? '',
    invoice_count: c.invoice_count,
    'aging.current': c.aging.current,
    'aging.d_31_60': c.aging.d_31_60,
    'aging.d_61_90': c.aging.d_61_90,
    'aging.d_90_plus': c.aging.d_90_plus,
    'aging.total': c.aging.total,
  })) ?? [];

  const filename = `AR_Aging_${asOfDate}`;

  const totalsRow = data
    ? {
        customer_name: 'Totals',
        customer_phone: '',
        invoice_count: data.customer_count,
        current: formatCurrency(data.total_current),
        d_31_60: formatCurrency(data.total_31_60),
        d_61_90: formatCurrency(data.total_61_90),
        d_90_plus: formatCurrency(data.total_90_plus),
        total: formatCurrency(data.total_outstanding),
      }
    : undefined;

  return (
    <ReportLayout
      title="AR Aging (Receivables)"
      icon={HandCoins}
      description="Accounts Receivable Aging Summary"
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
        </ReportFilters>
      }
      summaryCards={<ReportSummaryCards cards={cards} />}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        data ? (
          <ReportExportBar
            onExportPDF={async () => { if (reportRef.current) await exportToPDF(reportRef.current, filename); }}
            onExportExcel={() => exportColumnsToExcel(exportData, exportColumns, filename)}
            onExportCSV={() => exportColumnsToCSV(exportData, exportColumns, filename)}
            onPrint={() => printReport('report-print', 'AR Aging (Receivables)')}
          />
        ) : undefined
      }
      printRef={reportRef}
      printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        <ReportTable columns={columns} data={data?.customers ?? []} pageSize={25} totalsRow={totalsRow} />
      </div>
    </ReportLayout>
  );
}
