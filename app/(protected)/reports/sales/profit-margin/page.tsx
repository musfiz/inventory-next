'use client';

import { useState, useRef } from 'react';
import { Percent } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency, formatPercent } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { ProfitMarginReport, ProfitMarginRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function ProfitMarginPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ProfitMarginReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [groupBy, setGroupBy] = useState('product');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.profitMargin({
        start_date: startDate,
        end_date: endDate,
        group_by: groupBy as 'product' | 'category' | 'brand' | 'customer',
      });
      setData(res as unknown as ProfitMarginReport);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load report';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setGroupBy('product');
    setData(null);
    setError(null);
  };

  const cards: SummaryCard[] = data ? [
    { label: 'Gross Profit', value: formatCurrency(data.summary.total_gross_profit), color: 'green' },
    { label: 'Avg Margin', value: formatPercent(data.summary.avg_margin), color: 'blue' },
    { label: 'Items Below Target', value: String(data.summary.items_below_target), color: 'red' },
  ] : [];

  const columns: ReportColumn[] = [
    { key: 'group_name', header: 'Group' },
    { key: 'revenue', header: 'Revenue', format: 'currency', align: 'right' },
    { key: 'cogs', header: 'COGS', format: 'currency', align: 'right' },
    { key: 'gross_profit', header: 'Gross Profit', format: 'currency', align: 'right' },
    { key: 'margin_pct', header: 'Margin %', format: 'percent', align: 'right' },
    { key: 'units_sold', header: 'Units Sold', format: 'number', align: 'right' },
  ];

  return (
    <ReportLayout title="Profit Margin Report" icon={Percent}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Start Date">
            <CustomDatePicker value={startDate} onChange={setStartDate} />
          </FilterField>
          <FilterField label="End Date">
            <CustomDatePicker value={endDate} onChange={setEndDate} />
          </FilterField>
          <FilterField label="Group By">
            <select className={filterSelectClass} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              <option value="product">Product</option>
              <option value="category">Category</option>
              <option value="brand">Brand</option>
              <option value="customer">Customer</option>
            </select>
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading} error={error} hasData={!!data}
      actions={<ReportExportBar
        onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'profit-margin'); }}
        onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'profit-margin', 'Profit Margin'); }}
        onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'profit-margin'); }}
        onPrint={() => printReport('report-print', 'Profit Margin Report')}
        disabled={!data} />}
      printRef={reportRef} printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
