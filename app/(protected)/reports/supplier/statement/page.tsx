'use client';

import { useState, useRef } from 'react';
import { FileText } from 'lucide-react';
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
import type { SupplierStatementReport, SupplierStatementRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function SupplierStatementPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SupplierStatementReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    if (!supplierId) {
      notify.warning('Please enter a Supplier ID');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        supplier_id: Number(supplierId),
        start_date: startDate,
        end_date: endDate,
      };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const res = await reportService.supplierStatement(params);
      setData(res as unknown as SupplierStatementReport);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load report';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setSupplierId('');
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setSelectedTenantId('');
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Opening Balance', value: formatCurrency(data.summary.opening_balance), color: 'blue' },
        { label: 'Closing Balance', value: formatCurrency(data.summary.closing_balance), color: data.summary.closing_balance > 0 ? 'red' : 'green' },
        { label: 'Total Purchased', value: formatCurrency(data.summary.total_purchased), color: 'purple' },
        { label: 'Total Paid', value: formatCurrency(data.summary.total_paid), color: 'green' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'date', header: 'Date', format: 'date' },
    { key: 'document_number', header: 'Document #' },
    { key: 'type', header: 'Type' },
    { key: 'debit', header: 'Debit', format: 'currency', align: 'right' },
    { key: 'credit', header: 'Credit', format: 'currency', align: 'right' },
    { key: 'balance', header: 'Balance', format: 'currency', align: 'right' },
  ];

  return (
    <ReportLayout
      title="Supplier Statement"
      icon={FileText}
      description="Printable account statement per supplier"
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
          <FilterField label="Supplier ID">
            <input
              type="number"
              className={filterInputClass}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              placeholder="Enter supplier ID"
            />
          </FilterField>
          <FilterField label="Start Date">
            <CustomDatePicker value={startDate} onChange={setStartDate} />
          </FilterField>
          <FilterField label="End Date">
            <CustomDatePicker value={endDate} onChange={setEndDate} />
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        <ReportExportBar
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'supplier-statement'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'supplier-statement', 'Supplier Statement'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'supplier-statement'); }}
          onPrint={() => printReport('report-print', 'Supplier Statement')}
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
