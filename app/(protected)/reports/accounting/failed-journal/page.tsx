'use client';

import { useState, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import reportService from '@/services/reportService';
import { formatDate } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import type { FailedJournalReport } from '@/types/report.types';
import { ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass, ReportSummaryCards, ReportTable, ReportExportBar } from '@/components/reports';
import type { SummaryCard } from '@/components/reports';
import type { ExportColumn } from '@/lib/utils/export';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'resolved', label: 'Resolved' },
];

export default function FailedJournalPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<FailedJournalReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [referenceType, setReferenceType] = useState('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportService.failedJournal({
        status: status ? (status as 'unresolved' | 'resolved') : undefined,
        reference_type: referenceType || undefined,
        page: 1,
        per_page: 100,
      });
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
        { label: 'Total Failed', value: data.total, color: 'red' },
        { label: 'Unresolved', value: data.unresolved_count, color: 'orange' },
        { label: 'Resolved', value: data.resolved_count, color: 'green' },
      ]
    : [];

  const columns = [
    { key: 'id', header: 'ID', format: 'number' as const, align: 'right' as const, width: '70px' },
    { key: 'reference_type', header: 'Reference Type', format: 'text' as const },
    { key: 'reference_id', header: 'Ref ID', format: 'number' as const, align: 'right' as const, width: '80px' },
    { key: 'error_message', header: 'Error Message', format: 'text' as const },
    {
      key: 'status',
      header: 'Status',
      format: 'text' as const,
      cell: (value: string) => {
        const isResolved = value === 'resolved';
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
              isResolved
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}
          >
            {isResolved ? 'Resolved' : 'Unresolved'}
          </span>
        );
      },
    },
    { key: 'attempts', header: 'Attempts', format: 'number' as const, align: 'right' as const, width: '80px' },
    { key: 'created_at', header: 'Created', format: 'datetime' as const },
    { key: 'updated_at', header: 'Updated', format: 'datetime' as const },
  ];

  const exportColumns: ExportColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'reference_type', label: 'Reference Type' },
    { key: 'reference_id', label: 'Ref ID' },
    { key: 'error_message', label: 'Error Message' },
    { key: 'status', label: 'Status' },
    { key: 'attempts', label: 'Attempts' },
    { key: 'created_at', label: 'Created' },
    { key: 'updated_at', label: 'Updated' },
  ];

  const exportData = data?.data.map((e) => ({
    id: e.id,
    reference_type: e.reference_type ?? '',
    reference_id: e.reference_id ?? '',
    error_message: e.error_message ?? '',
    status: e.status,
    attempts: e.attempts,
    created_at: formatDate(e.created_at, 'datetime'),
    updated_at: formatDate(e.updated_at, 'datetime'),
  })) ?? [];

  const filename = 'Failed_Journal_Queue';

  return (
    <ReportLayout
      title="Failed Journal Queue"
      icon={AlertTriangle}
      description="Monitor and manage failed journal entry processing"
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={filterSelectClass}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Reference Type">
            <input
              type="text"
              value={referenceType}
              onChange={(e) => setReferenceType(e.target.value)}
              placeholder="e.g. purchase, sales"
              className={filterInputClass}
            />
          </FilterField>
        </ReportFilters>
      }
      summaryCards={<ReportSummaryCards cards={cards} />}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        data && data.data.length > 0 ? (
          <ReportExportBar
            onExportPDF={async () => { if (reportRef.current) await exportToPDF(reportRef.current, filename); }}
            onExportExcel={() => exportColumnsToExcel(exportData, exportColumns, filename)}
            onExportCSV={() => exportColumnsToCSV(exportData, exportColumns, filename)}
            onPrint={() => printReport('report-print', 'Failed Journal Queue')}
          />
        ) : undefined
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
