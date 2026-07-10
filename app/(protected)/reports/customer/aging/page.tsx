'use client';

import { useState, useRef } from 'react';
import { CalendarClock } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import reportService from '@/services/reportService';
import { todayISO, formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { CustomerAgingReport } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function CustomerAgingPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CustomerAgingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { as_of_date: asOfDate };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const result = await reportService.customerAging(params);
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
    setSelectedTenantId('');
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Total Outstanding', value: formatCurrency(data.summary.total_outstanding), color: 'red' },
        { label: 'Overdue Customers', value: data.summary.overdue_customer_count, color: 'orange' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'customer_name', header: 'Customer', format: 'text' },
    { key: 'phone', header: 'Phone', format: 'text' },
    { key: 'total_outstanding', header: 'Total Outstanding', format: 'currency', align: 'right' },
    { key: 'current', header: 'Current', format: 'currency', align: 'right' },
    { key: 'd_31_60', header: '31-60 Days', format: 'currency', align: 'right' },
    { key: 'd_61_90', header: '61-90 Days', format: 'currency', align: 'right' },
    { key: 'd_90_plus', header: '90+ Days', format: 'currency', align: 'right' },
    { key: 'credit_limit', header: 'Credit Limit', format: 'currency', align: 'right' },
    { key: 'available_credit', header: 'Available Credit', format: 'currency', align: 'right' },
  ];

  const totalsRow = data
    ? {
        customer_name: 'Totals',
        total_outstanding: formatCurrency(data.data.reduce((s, r) => s + r.total_outstanding, 0)),
        current: formatCurrency(data.data.reduce((s, r) => s + r.current, 0)),
        d_31_60: formatCurrency(data.data.reduce((s, r) => s + r.d_31_60, 0)),
        d_61_90: formatCurrency(data.data.reduce((s, r) => s + r.d_61_90, 0)),
        d_90_plus: formatCurrency(data.data.reduce((s, r) => s + r.d_90_plus, 0)),
        credit_limit: formatCurrency(data.data.reduce((s, r) => s + r.credit_limit, 0)),
        available_credit: formatCurrency(data.data.reduce((s, r) => s + r.available_credit, 0)),
      }
    : undefined;

  return (
    <ReportLayout
      title="Customer Aging"
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
          <FilterField label="As of Date">
            <CustomDatePicker value={asOfDate} onChange={setAsOfDate} />
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        <ReportExportBar
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'customer-aging'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'customer-aging', 'Customer Aging'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'customer-aging'); }}
          onPrint={() => printReport('report-print', 'Customer Aging Report')}
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
