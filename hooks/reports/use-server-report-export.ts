'use client';

import { useState } from 'react';
import reportService from '@/services/reportService';
import { notify } from '@/lib/notifications';
import type { ExportFormat } from '@/types/report.types';

type ExportState = ExportFormat | 'print' | null;

/**
 * Generates PDF/Excel/CSV for a report from the server's global export
 * pipeline (ReportExporter), instead of building the file in the browser.
 * "Print" reuses the server PDF so print output always matches the export.
 */
export function useServerReportExport(category: string, name: string, getParams: () => Record<string, any>) {
  const [loading, setLoading] = useState<ExportState>(null);

  const download = (blob: Blob, format: ExportFormat) => {
    const ext = format === 'excel' ? 'xlsx' : format;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const run = async (format: ExportFormat, andPrint = false) => {
    setLoading(andPrint ? 'print' : format);
    try {
      const blob = await reportService.exportReport(category, name, format, getParams());
      if (andPrint) {
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) {
          win.addEventListener('load', () => {
            win.focus();
            win.print();
          });
        } else {
          notify.warning('Please allow pop-ups to preview and print this report.');
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        download(blob, format);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || `Failed to export ${format.toUpperCase()}`;
      notify.error(msg);
    } finally {
      setLoading(null);
    }
  };

  return {
    loading,
    exportPDF: () => run('pdf'),
    exportExcel: () => run('excel'),
    exportCSV: () => run('csv'),
    printReport: () => run('pdf', true),
  };
}
