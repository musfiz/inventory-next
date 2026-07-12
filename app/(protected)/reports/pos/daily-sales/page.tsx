'use client';

import { useState, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import reportService from '@/services/reportService';
import { todayISO, formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV, type ExportColumn } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import { ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass, ReportSummaryCards, ReportTable, ReportExportBar, type ReportColumn, type SummaryCard } from '@/components/reports';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { PosDailySalesReport, PosDailySalesRow } from '@/types/report.types';

export default function PosDailySalesPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<PosDailySalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { date };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const res = await reportService.posDailySales(params);
      setData(res);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load report';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setDate(todayISO());
    setSelectedTenantId('');
    setData(null);
    setError(null);
  };

  const cards: SummaryCard[] = data ? [
    { label: 'Total Sales', value: formatCurrency(data.summary.total_sales), color: 'green' },
    { label: 'Discounts', value: formatCurrency(data.summary.total_discount), color: 'red' },
    { label: 'Total Tax', value: formatCurrency(data.summary.total_tax), color: 'blue' },
    { label: 'Order Count', value: String(data.summary.order_count), color: 'purple' },
  ] : [];

  const columns: ReportColumn<PosDailySalesRow>[] = [
    { key: 'order_number', header: 'Order #' },
    { key: 'time', header: 'Time' },
    { key: 'customer_name', header: 'Customer' },
    { key: 'item_count', header: 'Items', format: 'number', align: 'right' },
    { key: 'subtotal', header: 'Subtotal', format: 'currency', align: 'right' },
    { key: 'discount', header: 'Discount', format: 'currency', align: 'right' },
    { key: 'tax', header: 'Tax', format: 'currency', align: 'right' },
    { key: 'grand_total', header: 'Grand Total', format: 'currency', align: 'right' },
    { key: 'payment_method', header: 'Payment Method' },
    { key: 'payment_status', header: 'Status' },
    { key: 'cashier_name', header: 'Cashier' },
  ];

  const handleExportPDF = async () => { if (!data) return; const el = reportRef.current; if (!el) return; await exportToPDF(el, 'pos-daily-sales'); };
  const handleExportExcel = () => { if (!data) return; exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'pos-daily-sales'); };
  const handleExportCSV = () => { if (!data) return; exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'pos-daily-sales'); };
  const handlePrint = () => printReport('report-print', 'POS Daily Sales');

  return (
    <ReportLayout title="POS Daily Sales" icon={ShoppingCart}
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
          <FilterField label="Date">
            <CustomDatePicker value={date} onChange={setDate} />
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading} error={error} hasData={!!data}
      actions={<ReportExportBar onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} onExportCSV={handleExportCSV} onPrint={handlePrint} disabled={!data} />}
      printRef={reportRef} printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
