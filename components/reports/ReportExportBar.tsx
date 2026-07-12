'use client';

import { FileText, FileSpreadsheet, Printer, Loader2 } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
type UIExportFormat = 'pdf' | 'excel' | 'csv' | 'print';

interface ReportExportBarProps {
  onExportPDF?: () => void | Promise<void>;
  onExportExcel?: () => void | Promise<void>;
  onExportCSV?: () => void;
  onPrint?: () => void;
  formats?: UIExportFormat[];
  exportEndpoint?: string;
  exportParams?: Record<string, any>;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function ReportExportBar({
  onExportPDF,
  onExportExcel,
  onExportCSV,
  onPrint,
  formats = ['pdf', 'excel', 'csv', 'print'],
  loading = false,
  disabled = false,
  className = '',
}: ReportExportBarProps) {
  const { hasPermission } = usePermissions();
  const canExport = hasPermission('export-reports');

  if (!canExport) return null;

  const baseBtn =
    'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-sm border disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
  const btnPrimary = `${baseBtn} bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600`;
  const btnPrint = `${baseBtn} bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {formats.includes('pdf') && onExportPDF && (
        <button
          onClick={onExportPDF}
          disabled={disabled || loading}
          className={btnPrimary}
          title="Export as PDF"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          PDF
        </button>
      )}
      {formats.includes('excel') && onExportExcel && (
        <button
          onClick={onExportExcel}
          disabled={disabled || loading}
          className={btnPrimary}
          title="Export as Excel"
        >
          <FileSpreadsheet size={14} />
          Excel
        </button>
      )}
      {formats.includes('csv') && onExportCSV && (
        <button
          onClick={onExportCSV}
          disabled={disabled || loading}
          className={btnPrimary}
          title="Export as CSV"
        >
          <FileSpreadsheet size={14} />
          CSV
        </button>
      )}
      {formats.includes('print') && onPrint && (
        <button
          onClick={onPrint}
          disabled={disabled || loading}
          className={btnPrint}
          title="Print Report"
        >
          <Printer size={14} />
          Print
        </button>
      )}
    </div>
  );
}
