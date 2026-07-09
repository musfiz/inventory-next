'use client';

import { useState, useRef } from 'react';
import { BarChart3 } from 'lucide-react';
import reportService from '@/services/reportService';
import { formatCurrency, formatPercent } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { ProductProfitabilityReport, ProductProfitabilityRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function ProductProfitabilityPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ProductProfitabilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minMargin, setMinMargin] = useState('');
  const [maxMargin, setMaxMargin] = useState('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportService.productProfitability({
        min_margin: minMargin ? Number(minMargin) : undefined,
        max_margin: maxMargin ? Number(maxMargin) : undefined,
      });
      setData(result as unknown as ProductProfitabilityReport);
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
    setMinMargin('');
    setMaxMargin('');
  };

  const cards: SummaryCard[] = data
    ? [
        { label: 'Avg Margin', value: formatPercent(data.summary.avg_margin), color: 'blue' },
        { label: 'Below Cost', value: String(data.summary.products_below_cost), color: 'red' },
        { label: 'Highest Margin', value: data.summary.highest_margin_product, color: 'green' },
      ]
    : [];

  const columns: ReportColumn[] = [
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    { key: 'sku', header: 'SKU' },
    { key: 'cost_price', header: 'Cost Price', format: 'currency', align: 'right' },
    { key: 'selling_price', header: 'Selling Price', format: 'currency', align: 'right' },
    { key: 'mrp', header: 'MRP', format: 'currency', align: 'right' },
    { key: 'margin', header: 'Margin', format: 'currency', align: 'right' },
    { key: 'margin_pct', header: 'Margin %', format: 'percent', align: 'right' },
    { key: 'units_sold', header: 'Units Sold', format: 'number', align: 'right' },
    { key: 'total_profit', header: 'Total Profit', format: 'currency', align: 'right' },
  ];

  return (
    <ReportLayout
      title="Product Profitability"
      icon={BarChart3}
      description="Margin per product/variation"
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Min Margin %">
            <input
              type="number"
              className={filterInputClass}
              value={minMargin}
              onChange={(e) => setMinMargin(e.target.value)}
              placeholder="No minimum"
            />
          </FilterField>
          <FilterField label="Max Margin %">
            <input
              type="number"
              className={filterInputClass}
              value={maxMargin}
              onChange={(e) => setMaxMargin(e.target.value)}
              placeholder="No maximum"
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
          onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'product-profitability'); }}
          onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'product-profitability', 'Product Profitability'); }}
          onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'product-profitability'); }}
          onPrint={() => printReport('report-print', 'Product Profitability Report')}
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
