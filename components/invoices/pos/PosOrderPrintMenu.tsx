'use client';

import { useRef, useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import type { PosOrderDetail } from '@/types/api.types';
import { notify } from '@/lib/notifications';
import { PosOrderInvoiceA4 } from './PosOrderInvoiceA4';
import { PosOrderInvoiceThermal } from './PosOrderInvoiceThermal';
import type { PosInvoiceCopyLabel } from './PosOrderInvoiceThermal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PosOrderPrintMenuProps {
  /** Full POS order detail (items, payments, tenant, customer). */
  order: PosOrderDetail;
}

// ─── Base print styles injected into the new window ──────────────────────────

const PRINT_STYLES = `
  @page { margin: 0; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; color: #000; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  img { display: block; }
  table { border-collapse: collapse; }

  /* A4 wrapper */
  .invoice-content {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 11px;
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 14mm 16mm;
    background: #fff;
  }

  /* Thermal wrapper */
  .pos-invoice-content {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace;
    font-size: 12px;
    margin: 0 auto;
    background: #fff;
  }

  /* Tailwind utility shims needed for print window */
  .text-center  { text-align: center; }
  .text-right   { text-align: right; }
  .text-left    { text-align: left; }
  .flex         { display: flex; }
  .grid         { display: grid; }
  .inline-block { display: inline-block; }
  .block        { display: block; }
  .items-start  { align-items: flex-start; }
  .items-end    { align-items: flex-end; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .justify-center  { justify-content: center; }
  .font-bold    { font-weight: 700; }
  .font-extrabold { font-weight: 800; }
  .font-semibold  { font-weight: 600; }
  .font-mono    { font-family: ui-monospace, Menlo, Consolas, monospace; }
  .uppercase    { text-transform: uppercase; }
  .tracking-wide    { letter-spacing: 0.025em; }
  .tracking-wider   { letter-spacing: 0.05em; }
  .tracking-widest  { letter-spacing: 0.1em; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
  .rounded      { border-radius: 4px; }
  .w-full       { width: 100%; }
  .mx-auto      { margin-left: auto; margin-right: auto; }
  .mb-0\\.5 { margin-bottom: 2px; }
  .mb-1     { margin-bottom: 4px; }
  .mb-1\\.5 { margin-bottom: 6px; }
  .mb-2     { margin-bottom: 8px; }
  .mb-3     { margin-bottom: 12px; }
  .mb-4     { margin-bottom: 16px; }
  .mb-5     { margin-bottom: 20px; }
  .mt-0\\.5 { margin-top: 2px; }
  .mt-1     { margin-top: 4px; }
  .mt-2     { margin-top: 8px; }
  .mt-4     { margin-top: 16px; }
  .mx-4     { margin-left: 16px; margin-right: 16px; }
  .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
  .py-1     { padding-top: 4px; padding-bottom: 4px; }
  .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
  .py-2     { padding-top: 8px; padding-bottom: 8px; }
  .px-2     { padding-left: 8px; padding-right: 8px; }
  .px-4     { padding-left: 16px; padding-right: 16px; }
  .p-3      { padding: 12px; }
  .pt-1     { padding-top: 4px; }
  .pt-4     { padding-top: 16px; }
  .pb-1\\.5 { padding-bottom: 6px; }
  .pb-5     { padding-bottom: 20px; }
  .pl-0     { padding-left: 0; }
  .pr-3     { padding-right: 12px; }
  .gap-2    { gap: 8px; }
  .gap-3    { gap: 12px; }
  .gap-4    { gap: 16px; }
  .gap-5    { gap: 20px; }
  .space-y-0\\.5 > * + * { margin-top: 2px; }
  .space-y-0\\.5 { }
  .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
  .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
  .border   { border: 1px solid #e5e7eb; }
  .border-t { border-top: 1px solid #e5e7eb; }
  .border-b { border-bottom: 1px solid #e5e7eb; }
  .border-2 { border-width: 2px; }
  .border-gray-100 { border-color: #f3f4f6; }
  .border-gray-200 { border-color: #e5e7eb; }
  .border-gray-300 { border-color: #d1d5db; }
  .border-gray-900 { border-color: #111827; }
  .border-black    { border-color: #000; }
  .border-dashed   { border-style: dashed; }
  .border-b-\\[3px\\] { border-bottom-width: 3px; }
  .border-t-2 { border-top-width: 2px; }
  .border-b-2 { border-bottom-width: 2px; }
  .bg-white      { background: #fff; }
  .bg-gray-50    { background: #f9fafb; }
  .bg-gray-900   { background: #111827; }
  .bg-green-100  { background: #dcfce7; }
  .bg-yellow-100 { background: #fef9c3; }
  .bg-orange-100 { background: #ffedd5; }
  .bg-red-100    { background: #fee2e2; }
  .text-white    { color: #fff; }
  .text-gray-400 { color: #9ca3af; }
  .text-gray-500 { color: #6b7280; }
  .text-gray-600 { color: #4b5563; }
  .text-gray-700 { color: #374151; }
  .text-gray-900 { color: #111827; }
  .text-green-800  { color: #166534; }
  .text-yellow-800 { color: #854d0e; }
  .text-orange-800 { color: #9a3412; }
  .text-red-800    { color: #991b1b; }
  .text-xs  { font-size: 0.75rem; line-height: 1rem; }
  .text-sm  { font-size: 0.875rem; line-height: 1.25rem; }
  .text-xl  { font-size: 1.25rem; line-height: 1.75rem; }
  .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
  .leading-5 { line-height: 1.25rem; }
  .leading-6 { line-height: 1.5rem; }
  .border-collapse { border-collapse: collapse; }
  .object-contain { object-fit: contain; }
  .max-w-\\[56mm\\]  { max-width: 56mm; }
  .max-w-\\[100mm\\] { max-width: 100mm; }
  .w-6  { width: 1.5rem; }
  .w-12 { width: 3rem; }
  .w-14 { width: 3.5rem; }
  .w-20 { width: 5rem; }
  .w-24 { width: 6rem; }
  .w-44 { width: 11rem; }
  .h-8  { height: 2rem; }
  .h-16 { height: 4rem; }
  .capitalize { text-transform: capitalize; }
`;

// ─── openPrint helper ─────────────────────────────────────────────────────────

function openPrint(ref: React.RefObject<HTMLDivElement | null>, paperSize: string) {
  if (!ref.current) return;
  const html = ref.current.innerHTML;
  const win = window.open('', '_blank');
  if (!win) {
    notify.error('Pop-up blocked — allow pop-ups to print invoices.');
    return;
  }
  win.document.write(
    `<!doctype html><html><head><title>POS Invoice</title>` +
    `<style>${PRINT_STYLES}</style>` +
    `<style>@page{size:${paperSize};margin:0;}</style>` +
    `</head><body>${html}</body></html>`,
  );
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
    win.close();
  }, 250);
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * POS Order print action buttons:
 *  • A4  — full-size Tax Invoice (instant)
 *  • 80mm — standard thermal receipt
 *  • 58mm — compact thermal receipt
 *
 * Renders hidden divs for each format; `openPrint` copies `.innerHTML`
 * into a new window and triggers `window.print()` — same pattern as
 * the payment `PrintMenu`.
 */
export function PosOrderPrintMenu({ order }: PosOrderPrintMenuProps) {
  const [showModal, setShowModal] = useState(false);
  const [copyLabel, setCopyLabel] = useState<PosInvoiceCopyLabel>('customer');

  const a4Ref = useRef<HTMLDivElement>(null);
  const t80Ref = useRef<HTMLDivElement>(null);
  const t58Ref = useRef<HTMLDivElement>(null);

  const handleA4 = () => {
    setTimeout(() => openPrint(a4Ref, 'A4'), 50);
  };

  const handleThermal = (w: '80mm' | '58mm') => {
    const ref = w === '80mm' ? t80Ref : t58Ref;
    setTimeout(() => openPrint(ref, `${w} auto`), 50);
  };

  return (
    <>
      {/* ── Action buttons ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        {/* A4 invoice */}
        <button
          onClick={handleA4}
          title="Print A4 Tax Invoice"
          aria-label="Print A4 Tax Invoice"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
        >
          <FileText className="w-4 h-4" />
        </button>

        {/* Thermal — opens picker */}
        <button
          onClick={() => setShowModal(true)}
          title="Print Thermal Receipt"
          aria-label="Print Thermal Receipt"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* ── Thermal picker modal ────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Thermal receipt options"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5 w-72 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-semibold text-gray-900 dark:text-white">Thermal Receipt</div>

            {/* Copy type */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Copy Type</label>
              <div className="flex gap-2">
                {(['customer', 'merchant', 'duplicate'] as PosInvoiceCopyLabel[]).map((lbl) => (
                  <button
                    key={lbl}
                    onClick={() => setCopyLabel(lbl)}
                    className={`flex-1 py-1.5 rounded text-xs font-semibold border transition-colors ${copyLabel === lbl
                        ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900'
                        : 'border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:border-gray-400'
                      }`}
                  >
                    {lbl.charAt(0).toUpperCase() + lbl.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Paper size */}
            <div className="flex gap-2">
              <button
                onClick={() => { handleThermal('80mm'); setShowModal(false); }}
                className="flex-1 py-2 rounded border border-gray-200 dark:border-gray-600 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                80mm
              </button>
              <button
                onClick={() => { handleThermal('58mm'); setShowModal(false); }}
                className="flex-1 py-2 rounded border border-gray-200 dark:border-gray-600 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                58mm
              </button>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Hidden print areas ──────────────────────────────────────── */}
      <div style={{ display: 'none' }} aria-hidden="true">
        {/* A4 */}
        <div ref={a4Ref}>
          <PosOrderInvoiceA4 order={order} />
        </div>

        {/* 80mm thermal */}
        <div ref={t80Ref}>
          <PosOrderInvoiceThermal order={order} width="80mm" copyLabel={copyLabel} />
        </div>

        {/* 58mm thermal */}
        <div ref={t58Ref}>
          <PosOrderInvoiceThermal order={order} width="58mm" copyLabel={copyLabel} />
        </div>
      </div>
    </>
  );
}
