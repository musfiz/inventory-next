'use client';

import { useState, useRef } from 'react';
import { Receipt } from 'lucide-react';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import { todayISO, firstDayOfMonthISO, formatCurrency } from '@/lib/utils/format';
import { exportToPDF, printReport, exportColumnsToExcel, exportColumnsToCSV } from '@/lib/utils/export';
import { notify } from '@/lib/notifications';
import {
  ReportLayout, ReportFilters, FilterField, filterInputClass, filterSelectClass,
  ReportSummaryCards, ReportTable, ReportExportBar,
} from '@/components/reports';
import type { TaxReturnReport, TaxReturnRow } from '@/types/report.types';
import type { SummaryCard } from '@/components/reports/ReportSummaryCards';
import type { ReportColumn } from '@/components/reports/ReportTable';

export default function TaxReturnPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<TaxReturnReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [taxType, setTaxType] = useState('combined');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.taxReturn({
        start_date: startDate,
        end_date: endDate,
        tax_type: taxType as 'vat' | 'sd' | 'combined',
      });
      setData(res as unknown as TaxReturnReport);
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
    setTaxType('combined');
    setData(null);
    setError(null);
  };

  const cards: SummaryCard[] = data ? [
    { label: 'Tax Collected', value: formatCurrency(data.summary.total_tax_collected), color: 'blue' },
    { label: 'Tax Paid', value: formatCurrency(data.summary.total_tax_paid), color: 'red' },
    { label: 'Net Tax Due', value: formatCurrency(data.summary.net_tax_due), color: data.summary.net_tax_due > 0 ? 'red' : 'green' },
  ] : [];

  const columns: ReportColumn[] = [
    { key: 'tax_type', header: 'Tax Type' },
    { key: 'taxable_amount', header: 'Taxable Amount', format: 'currency', align: 'right' },
    { key: 'tax_collected', header: 'Tax Collected', format: 'currency', align: 'right' },
    { key: 'tax_paid', header: 'Tax Paid', format: 'currency', align: 'right' },
    { key: 'net_liability', header: 'Net Liability', format: 'currency', align: 'right' },
  ];

  return (
    <ReportLayout title="Tax Return" icon={Receipt}
      description="VAT/SD liability calculation for tax filing period"
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading}>
          <FilterField label="Start Date">
            <CustomDatePicker value={startDate} onChange={setStartDate} />
          </FilterField>
          <FilterField label="End Date">
            <CustomDatePicker value={endDate} onChange={setEndDate} />
          </FilterField>
          <FilterField label="Tax Type">
            <select className={filterSelectClass} value={taxType} onChange={e => setTaxType(e.target.value)}>
              <option value="combined">Combined</option>
              <option value="vat">VAT Only</option>
              <option value="sd">SD Only</option>
            </select>
          </FilterField>
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} /> : undefined}
      loading={loading} error={error} hasData={!!data}
      actions={<ReportExportBar
        onExportPDF={() => { if (reportRef.current) exportToPDF(reportRef.current, 'tax-return'); }}
        onExportExcel={() => { if (data) exportColumnsToExcel(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'tax-return', 'Tax Return'); }}
        onExportCSV={() => { if (data) exportColumnsToCSV(data.data, columns.map(c => ({ key: c.key, label: c.header })), 'tax-return'); }}
        onPrint={() => printReport('report-print', 'Tax Return Report')}
        disabled={!data} />}
      printRef={reportRef} printId="report-print"
    >
      <div ref={reportRef} id="report-print">
        {data && <ReportTable columns={columns} data={data.data} pageSize={25} />}
      </div>
    </ReportLayout>
  );
}
