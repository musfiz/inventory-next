'use client';

import { useState, useRef, type ReactNode } from 'react';
import { ScrollText } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatDate } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { AuditLogReport } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

function truncateJson(value: unknown): string {
  if (!value) return '-';
  const str = JSON.stringify(value);
  if (str.length > 80) return str.slice(0, 80) + '...';
  return str;
}

export default function AuditLogPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<AuditLogReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [modelType, setModelType] = useState('');
  const [action, setAction] = useState('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportService.auditLog({
        start_date: startDate,
        end_date: endDate,
        model_type: modelType || undefined,
        action: action || undefined,
      });
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
    setModelType('');
    setAction('');
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Total Entries', value: data.summary.total_entries, color: 'blue' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'id', header: 'ID', format: 'number', align: 'right', width: '70px' },
    { key: 'timestamp', header: 'Timestamp', format: 'datetime' },
    { key: 'user_name', header: 'User', format: 'text' },
    { key: 'model', header: 'Model', format: 'text' },
    { key: 'action', header: 'Action', format: 'text' },
    {
      key: 'old_values',
      header: 'Old Values',
      cell: (value: unknown) => (
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
          {truncateJson(value)}
        </span>
      ),
    },
    {
      key: 'new_values',
      header: 'New Values',
      cell: (value: unknown) => (
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
          {truncateJson(value)}
        </span>
      ),
    },
    { key: 'ip_address', header: 'IP Address', format: 'text' },
  ];

  return (
    <ReportLayout
      title="Audit Log"
      icon={ScrollText}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Start Date">
            <CustomDatePicker value={startDate} onChange={setStartDate} />
          </FilterField>
          <FilterField label="End Date">
            <CustomDatePicker value={endDate} onChange={setEndDate} />
          </FilterField>
          <FilterField label="Model Type (optional)">
            <input
              type="text"
              className={filterInputClass}
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              placeholder="e.g. Product, Order"
            />
          </FilterField>
          <FilterField label="Action (optional)">
            <input
              type="text"
              className={filterInputClass}
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. created, updated"
            />
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        <ReportExportBar
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'audit-log'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'audit-log', 'Audit Log'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'audit-log'); }}
          onPrint={() => printReport('report-print', 'Audit Log Report')}
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
