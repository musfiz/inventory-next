'use client';

import { useState, useRef } from 'react';
import { BarChart3 } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency, formatPercent } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV, type ExportColumn } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import { ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass, ReportSummaryCards, ReportTable, ReportExportBar, type ReportColumn, type SummaryCard } from '@/components/reports';
import type { SalesByProductReport, SalesByProductRow } from '@/types/report.types';

export default function SalesByProductPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SalesByProductReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [source, setSource] = useState<'pos' | 'so' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity' | 'profit'>('revenue');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.salesByProduct({ start_date: startDate, end_date: endDate, source, sort_by: sortBy });
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
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setSource('all');
    setSortBy('revenue');
    setData(null);
    setError(null);
  };

  const cards: SummaryCard[] = data ? [
    { label: 'Total Revenue', value: formatCurrency(data.summary.total_revenue), color: 'green' },
    { label: 'Total COGS', value: formatCurrency(data.summary.total_cogs), color: 'red' },
    { label: 'Gross Profit', value: formatCurrency(data.summary.total_gross_profit), color: 'blue' },
    { label: 'Avg Margin', value: formatPercent(data.summary.avg_margin), color: 'purple' },
  ] : [];

  const columns: ReportColumn<SalesByProductRow>[] = [
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    { key: 'sku', header: 'SKU' },
    { key: 'category_name', header: 'Category' },
    { key: 'units_sold', header: 'Units Sold', format: 'number', align: 'right' },
    { key: 'gross_revenue', header: 'Gross Revenue', format: 'currency', align: 'right' },
    { key: 'discount', header: 'Discount', format: 'currency', align: 'right' },
    { key: 'net_revenue', header: 'Net Revenue', format: 'currency', align: 'right' },
    { key: 'cogs', header: 'COGS', format: 'currency', align: 'right' },
    { key: 'gross_profit', header: 'Gross Profit', format: 'currency', align: 'right' },
    { key: 'margin_pct', header: 'Margin %', format: 'percent', align: 'right' },
  ];

  const handleExportPDF = async () => { if (!data) return; const el = reportRef.current; if (!el) return; await exportToPDF(el, 'sales-by-product'); };
  const handleExportExcel = () => { if (!data) return; exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'sales-by-product'); };
  const handleExportCSV = () => { if (!data) return; exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'sales-by-product'); };
  const handlePrint = () => printReport('report-print', 'Sales by Product');

  return (
    <ReportLayout title="Sales by Product" icon={BarChart3}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Start Date">
            <CustomDatePicker value={startDate} onChange={setStartDate} />
          </FilterField>
          <FilterField label="End Date">
            <CustomDatePicker value={endDate} onChange={setEndDate} />
          </FilterField>
          <FilterField label="Source">
            <select className={filterSelectClass} value={source} onChange={e => setSource(e.target.value as 'pos' | 'so' | 'all')}>
              <option value="all">All Sources</option>
              <option value="pos">POS</option>
              <option value="so">Sales Order</option>
            </select>
          </FilterField>
          <FilterField label="Sort By">
            <select className={filterSelectClass} value={sortBy} onChange={e => setSortBy(e.target.value as 'revenue' | 'quantity' | 'profit')}>
              <option value="revenue">Revenue</option>
              <option value="quantity">Quantity</option>
              <option value="profit">Profit</option>
            </select>
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
