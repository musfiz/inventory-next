// Client-Side Export Utilities
// CSV, Excel (HTML-table-based), PDF, and Print helpers for reports.

import { notify } from '@/lib/notifications';
import { generatePDF as generatePDFFromElement } from '@/lib/utils/pdf';

// ── Helpers ─────────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ── CSV Export ──────────────────────────────────────────────────────────────

export function exportToCSV(
  data: Record<string, any>[],
  filename: string,
  options?: {
    headers?: string[];
    headerLabels?: Record<string, string>;
    summaryRows?: Record<string, any>[];
  },
): void {
  if (!data || data.length === 0) {
    notify.warning('No data to export');
    return;
  }

  const keys = options?.headers ?? Object.keys(data[0]);
  const labels =
    options?.headerLabels ??
    Object.fromEntries(keys.map((k) => [k, k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())]));

  const headerLine = keys.map((k) => escapeCSV(labels[k] ?? k)).join(',');
  const dataLines = data.map((row) => keys.map((k) => escapeCSV(row[k])).join(','));

  const lines = [headerLine, ...dataLines];
  if (options?.summaryRows) {
    lines.push('');
    options.summaryRows.forEach((row) => {
      lines.push(keys.map((k) => escapeCSV(row[k])).join(','));
    });
  }

  const csv = lines.join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${sanitizeFilename(filename)}.csv`);
  notify.success('CSV exported');
}

// ── Excel Export (HTML-table-based, no dependency) ──────────────────────────

export function exportToExcel(
  data: Record<string, any>[],
  filename: string,
  options?: {
    sheetName?: string;
    headers?: string[];
    headerLabels?: Record<string, string>;
    summaryRows?: Record<string, any>[];
  },
): void {
  if (!data || data.length === 0) {
    notify.warning('No data to export');
    return;
  }

  const keys = options?.headers ?? Object.keys(data[0]);
  const labels =
    options?.headerLabels ??
    Object.fromEntries(keys.map((k) => [k, k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())]));
  const sheetName = options?.sheetName ?? 'Report';

  const escapeHTML = (s: any) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta http-equiv="content-type" content="text/html; charset=utf-8"><style>td,th{font-family:Segoe UI,Arial,sans-serif;font-size:11px;border:1px solid #ccc;padding:3px 6px}th{background:#4f46e5;color:#fff;font-weight:bold}tr:nth-child(even){background:#f5f5f5}</style></head><body><table><thead><tr>`;
  html += `<th>${sheetName}</th></tr><tr><td></td></tr></thead><tbody>`;

  html += '<tr style="font-weight:bold">';
  keys.forEach((k) => {
    html += `<th>${escapeHTML(labels[k] ?? k)}</th>`;
  });
  html += '</tr>';

  data.forEach((row) => {
    html += '<tr>';
    keys.forEach((k) => {
      html += `<td>${escapeHTML(row[k])}</td>`;
    });
    html += '</tr>';
  });

  if (options?.summaryRows) {
    html += '<tr><td></td></tr>';
    options.summaryRows.forEach((row) => {
      html += '<tr style="font-weight:bold">';
      keys.forEach((k) => {
        html += `<td>${escapeHTML(row[k])}</td>`;
      });
      html += '</tr>';
    });
  }

  html += '</tbody></table></body></html>';

  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, `${sanitizeFilename(filename)}.xls`);
  notify.success('Excel exported');
}

// ── PDF Export (delegates to jsPDF + html2canvas) ───────────────────────────

export async function exportToPDF(
  element: HTMLElement,
  filename: string,
  options?: {
    scale?: number;
    format?: 'a4' | 'letter';
    orientation?: 'portrait' | 'landscape';
  },
): Promise<void> {
  try {
    await generatePDFFromElement(element, `${sanitizeFilename(filename)}.pdf`, options);
    notify.success('PDF exported');
  } catch {
    notify.error('Failed to generate PDF');
  }
}

// ── Print ───────────────────────────────────────────────────────────────────

export function printReport(
  elementId: string,
  title: string = 'Report',
  options?: { orientation?: 'portrait' | 'landscape' },
): void {
  const element = document.getElementById(elementId);
  if (!element) {
    notify.error('Print area not found');
    return;
  }

  const orientation = options?.orientation ?? 'portrait';
  const html = element.innerHTML;
  const win = window.open('', '_blank', 'width=900,height=700');

  if (!win) {
    notify.error('Pop-up blocked. Please allow pop-ups to print reports.');
    return;
  }

  win.document.write(`<!doctype html><html><head><title>${title}</title>`);
  win.document.write('<style>');
  win.document.write('@page { margin: 12mm; size: A4 ' + orientation + '; }');
  win.document.write('*, *::before, *::after { box-sizing: border-box; }');
  win.document.write(
    'body { font-family: "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif; color: #1a1a2e; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
  );
  win.document.write('table { border-collapse: collapse; width: 100%; }');
  win.document.write('th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 12px; }');
  win.document.write('th { background: #4f46e5; color: #fff; }');
  win.document.write('tr:nth-child(even) { background: #f9f9f9; }');
  win.document.write('h1, h2, h3 { margin: 0 0 8px; }');
  win.document.write('.summary-card { display: inline-block; border: 1px solid #ddd; border-radius: 6px; padding: 12px 16px; margin: 4px 8px 4px 0; }');
  win.document.write('.summary-card .label { font-size: 11px; text-transform: uppercase; color: #666; }');
  win.document.write('.summary-card .value { font-size: 20px; font-weight: bold; }');
  win.document.write('.text-right { text-align: right; }');
  win.document.write('.font-mono { font-family: "Courier New", monospace; }');
  win.document.write('.no-print { display: none; }');
  win.document.write('@media print { table, tr, td, th { page-break-inside: avoid; } }');
  win.document.write('</style>');
  win.document.write(`</head><body>${html}</body></html>`);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
    win.close();
  }, 300);
}

// ── Generic Column-based Export ─────────────────────────────────────────────

export interface ExportColumn {
  key: string;
  label: string;
}

export function exportColumnsToCSV(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  summaryRows?: Record<string, any>[],
): void {
  exportToCSV(data, filename, {
    headers: columns.map((c) => c.key),
    headerLabels: Object.fromEntries(columns.map((c) => [c.key, c.label])),
    summaryRows,
  });
}

export function exportColumnsToExcel(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  sheetName?: string,
  summaryRows?: Record<string, any>[],
): void {
  exportToExcel(data, filename, {
    sheetName,
    headers: columns.map((c) => c.key),
    headerLabels: Object.fromEntries(columns.map((c) => [c.key, c.label])),
    summaryRows,
  });
}
