'use client';

import { useState, useRef } from 'react';
import { FileText } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import apiClient from '@/lib/api/axios';
import { todayISO, firstDayOfMonthISO, formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { ApiResponse } from '@/types/api.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function CustomerStatementPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<any[] | null>(null);
  const [meta, setMeta] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());

  const generate = async () => {
    if (!customerId.trim()) {
      const msg = 'Customer ID is required';
      setError(msg);
      notify.error(msg);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<ApiResponse<any>>(
        `/api/v1/customers/${customerId.trim()}/statement`,
        { params: { start_date: startDate, end_date: endDate } },
      );
      const result = response.data.data;
      if (Array.isArray(result)) {
        setData(result);
        setMeta(null);
      } else if (result?.data) {
        setData(result.data);
        setMeta(result.meta || null);
      } else {
        setData([result]);
        setMeta(null);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to load statement';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setMeta(null);
    setError(null);
    setCustomerId('');
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
  };

  const columns: ReportColumn[] = data?.length
    ? Object.keys(data[0]).map((key) => {
        const val = data[0][key];
        const isNum = typeof val === 'number' && !Number.isInteger(val);
        const isInt = typeof val === 'number' && Number.isInteger(val);
        return {
          key,
          header: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          format: isNum ? 'currency' : isInt ? 'number' : key.includes('date') || key.includes('at') ? 'datetime' : 'text',
          align: isNum || isInt ? 'right' : 'left',
        };
      })
    : [];

  return (
    <ReportLayout
      title="Customer Statement"
      icon={FileText}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Customer ID">
            <input
              type="number"
              className={filterInputClass}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Enter customer ID"
              required
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
      loading={loading}
      error={error}
      hasData={!!data && data.length > 0}
      actions={
        <ReportExportBar
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'customer-statement'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data, columns.map(c => ({ key: c.key, label: c.header })), 'customer-statement', 'Customer Statement'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data, columns.map(c => ({ key: c.key, label: c.header })), 'customer-statement'); }}
          onPrint={() => printReport('report-print', 'Customer Statement')}
          disabled={!data || data.length === 0}
        />
      }
      printRef={reportRef}
      printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && data.length > 0 && <ReportTable columns={columns} data={data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
