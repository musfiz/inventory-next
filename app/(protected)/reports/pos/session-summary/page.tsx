'use client';

import { useState, useRef } from 'react';
import { Receipt } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import reportService from '@/services/reportService';
import { todayISO, formatCurrency, formatDate } from '@/lib/utils/format';
import { exportToPDF, printReport } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { PosSessionSummaryReport } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function PosSessionSummaryPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<PosSessionSummaryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        session_id: sessionId ? Number(sessionId) : undefined,
        date,
      };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const result = await reportService.posSessionSummary(params);
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
    setSessionId('');
    setDate(todayISO());
    setSelectedTenantId('');
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Total Sales', value: formatCurrency(data.total_sales), color: 'green' },
        { label: 'Cash Sales', value: formatCurrency(data.cash_sales), color: 'blue' },
        { label: 'Card Sales', value: formatCurrency(data.card_sales), color: 'purple' },
        { label: 'Refunds', value: formatCurrency(data.refunds), color: 'red' },
        { label: 'Expected Cash', value: formatCurrency(data.expected_cash), color: 'amber' },
        { label: 'Variance', value: formatCurrency(data.variance), color: data.variance < 0 ? 'red' : 'green' },
      ]
    : [];

  const sessionInfo = data ? [
    { label: 'Register', value: data.session.register_name },
    { label: 'Cashier', value: data.session.cashier_name },
    { label: 'Opened', value: formatDate(data.session.start_time, 'datetime') },
    { label: 'Closed', value: data.session.end_time ? formatDate(data.session.end_time, 'datetime') : 'Open' },
  ] : [];

  const columns: ReportColumn[] = [
    { key: 'label', header: 'Item', format: 'text' },
    { key: 'value', header: 'Amount', format: 'text', align: 'right' },
  ];

  const summaryRows = data
    ? [
        { label: 'Opening Balance', value: formatCurrency(data.opening_balance) },
        { label: 'Cash Sales', value: formatCurrency(data.cash_sales) },
        { label: 'Card Sales', value: formatCurrency(data.card_sales) },
        { label: 'bKash Sales', value: formatCurrency(data.bkash_sales) },
        { label: 'Nagad Sales', value: formatCurrency(data.nagad_sales) },
        { label: 'Rocket Sales', value: formatCurrency(data.rocket_sales) },
        { label: 'Bank Transfer Sales', value: formatCurrency(data.bank_transfer_sales) },
        { label: 'Credit Sales', value: formatCurrency(data.credit_sales) },
        { label: 'Total Sales', value: formatCurrency(data.total_sales) },
        { label: 'Refunds', value: formatCurrency(data.refunds) },
        { label: 'Cash In', value: formatCurrency(data.cash_in) },
        { label: 'Cash Out', value: formatCurrency(data.cash_out) },
        { label: 'Expected Cash', value: formatCurrency(data.expected_cash) },
        { label: 'Actual Cash', value: formatCurrency(data.actual_cash) },
        { label: 'Variance', value: formatCurrency(data.variance) },
      ]
    : [];

  return (
    <ReportLayout
      title="POS Session Summary"
      icon={Receipt}
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
          <FilterField label="Session ID (optional)">
            <input
              type="number"
              className={filterInputClass}
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Latest session"
            />
          </FilterField>
          <FilterField label="Date">
            <CustomDatePicker value={date} onChange={setDate} />
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length ? <ReportSummaryCards cards={cards} columns={3} /> : undefined}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        <ReportExportBar
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'pos-session-summary'); }}
          onPrint={() => printReport('report-print', 'POS Session Summary')}
          disabled={!data}
          formats={['pdf', 'print']}
        />
      }
      printRef={reportRef}
      printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && (
          <div className="space-y-4">
            {sessionInfo.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {sessionInfo.map((info) => (
                  <div key={info.label} className="bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{info.label}</div>
                    <div className="font-medium text-gray-900 dark:text-white mt-0.5">{info.value}</div>
                  </div>
                ))}
              </div>
            )}
            <ReportTable
              columns={columns}
              data={summaryRows}
              pageSize={50}
              enableSearch={false}
              enablePagination={false}
              enableSorting={false}
            />
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
