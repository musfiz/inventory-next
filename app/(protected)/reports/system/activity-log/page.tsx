'use client';

import { useState, useRef } from 'react';
import { ClipboardList } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { GenericReportResponse } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function ActivityLogPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<GenericReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [subjectType, setSubjectType] = useState('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportService.activityLog({
        start_date: startDate,
        end_date: endDate,
        subject_type: subjectType || undefined,
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
    setSubjectType('');
  };

  const totalEntries = typeof data?.summary?.total_entries === 'number' ? data.summary.total_entries : 0;

  const cards: SummaryCard[] = data
    ? [
        { label: 'Total Entries', value: totalEntries, color: 'blue' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'id', header: 'ID', format: 'number', align: 'right', width: '70px' },
    { key: 'user_name', header: 'User', format: 'text' },
    { key: 'subject_type', header: 'Subject Type', format: 'text' },
    { key: 'action', header: 'Action', format: 'text' },
    { key: 'description', header: 'Description', format: 'text' },
    { key: 'created_at', header: 'Date/Time', format: 'datetime' },
  ];

  return (
    <ReportLayout
      title="Activity Log"
      icon={ClipboardList}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Start Date">
            <CustomDatePicker value={startDate} onChange={setStartDate} />
          </FilterField>
          <FilterField label="End Date">
            <CustomDatePicker value={endDate} onChange={setEndDate} />
          </FilterField>
          <FilterField label="Subject Type (optional)">
            <input
              type="text"
              className={filterInputClass}
              value={subjectType}
              onChange={(e) => setSubjectType(e.target.value)}
              placeholder="e.g. Product, Order, User"
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
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'activity-log'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'activity-log', 'Activity Log'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'activity-log'); }}
          onPrint={() => printReport('report-print', 'Activity Log Report')}
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
