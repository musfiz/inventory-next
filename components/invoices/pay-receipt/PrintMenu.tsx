'use client';

import { useRef, useState } from 'react';
import { FileText, Printer, X } from 'lucide-react';
import type { Payment } from '@/types/api.types';
import { notify } from '@/lib/notifications';
import { paymentService } from '@/services';
import { PayReceiptA4 } from './PayReceiptA4';
import { PayReceiptThermal } from './PayReceiptThermal';

// ─── PrintMenu ────────────────────────────────────────────────────────────────

type ThermalWidth = '80mm' | '58mm';
type CopyLabel = 'customer' | 'merchant' | 'duplicate';

interface PrintMenuProps {
  /** Row's payment (or any Payment-shaped object). The component
   *  reloads the full payment via `paymentService.show` to ensure
   *  relations (tenant, salesOrder, posOrder) are populated before
   *  the print, since list rows may omit them. */
  payment: Payment;
}

/**
 * Row-level "Print" action for the Payments List. Two icons:
 *  - A4 (default) — instant print of the A4-styled receipt.
 *  - Thermal — opens a small modal to pick 80mm or 58mm and a
 *    copy-type (Customer / Merchant / Duplicate), then prints.
 *
 * Renders three hidden divs (A4, 80mm, 58mm) that the print logic
 * copies into a new window and triggers `window.print()`. Only the
 * active print's div has content; the other two are still rendered
 * (display:none) so React refs stay valid.
 */
export function PrintMenu({ payment }: PrintMenuProps) {
  const [showModal, setShowModal] = useState(false);
  const [copyLabel, setCopyLabel] = useState<CopyLabel>('customer');
  const [loading, setLoading] = useState(false);

  // Refs to each hidden print area.
  const a4Ref   = useRef<HTMLDivElement>(null);
  const t80Ref  = useRef<HTMLDivElement>(null);
  const t58Ref  = useRef<HTMLDivElement>(null);

  // Latest payment (after reload — needed because the list row may
  // not include the full relations like tenant / salesOrder).
  const [full, setFull] = useState<Payment | null>(null);

  // ── Print helpers ────────────────────────────────────────────────────────

  const openPrint = (ref: React.RefObject<HTMLDivElement | null>, paperSize?: string) => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    const win = window.open('', '_blank');
    if (!win) {
      notify.error('Pop-up blocked — please allow pop-ups to print receipts.');
      return;
    }
    win.document.write(`<!doctype html><html><head><title>Pay Receipt</title>
      <style>
        @page {
          size: ${paperSize || 'auto'};
          margin: 0;
        }
        body {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          margin: 0;
          padding: 0;
          color: #000;
          background: #fff;
        }
        @media print { body { margin: 0; padding: 0; } }
        /* A4 page wrapper */
        .invoice-content {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 20mm;
          background: #fff;
          box-sizing: border-box;
        }
        /* 80mm thermal slip */
        .pos-invoice-content {
          width: 80mm;
          min-height: auto;
          margin: 0 auto;
          padding: 6mm 4mm;
          background: #fff;
          box-sizing: border-box;
        }
        table, tr, td, th { page-break-inside: avoid; }
        img { display: block; }
      </style>
      </head><body>${html}</body></html>`);
    win.document.close();
    // Give the browser a moment to lay out the document, then print.
    setTimeout(() => {
      win.focus();
      win.print();
      win.close();
    }, 200);
  };

  const loadFull = async (): Promise<Payment | null> => {
    if (full) return full;
    try {
      setLoading(true);
      const f = await paymentService.show(payment.id);
      setFull(f);
      return f;
    } catch {
      notify.error('Failed to load payment details for printing');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handlePrintA4 = async () => {
    const f = await loadFull();
    if (!f) return;
    // Defer to next tick so the state update from loadFull() is in the DOM
    setTimeout(() => openPrint(a4Ref, 'A4'), 50);
  };

  const handlePrintThermal = async (width: ThermalWidth) => {
    const f = await loadFull();
    if (!f) return;
    const ref = width === '80mm' ? t80Ref : t58Ref;
    setTimeout(() => openPrint(ref, `${width === '80mm' ? '80mm' : '58mm'} auto`), 50);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  // Use `full` if loaded, else fall back to the row's payment (so
  // the A4 / thermal divs still have data on first open before the
  // reload completes).
  const data = full ?? payment;

  return (
    <>
      <div className="flex items-center gap-1">
        {/* A4 — default, instant print */}
        <button
          onClick={handlePrintA4}
          disabled={loading}
          title="Print A4 receipt"
          aria-label="Print A4 receipt"
          className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer disabled:opacity-50"
        >
          <FileText className="w-4 h-4" />
        </button>

        {/* Thermal — opens the modal */}
        <button
          onClick={() => setShowModal(true)}
          disabled={loading}
          title="Print thermal receipt (POS slip)"
          aria-label="Print thermal receipt (POS slip)"
          className="p-1 rounded text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 cursor-pointer disabled:opacity-50"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* Hidden print areas — one per format. Only one has content at a time
          (the active one), but all three stay mounted so refs remain valid. */}
      <div style={{ display: 'none' }}>
        <div ref={a4Ref}>
          {data && <PayReceiptA4 payment={data} copyLabel={null} />}
        </div>
        <div ref={t80Ref}>
          {data && <PayReceiptThermal payment={data} width="80mm" copyLabel={copyLabel} />}
        </div>
        <div ref={t58Ref}>
          {data && <PayReceiptThermal payment={data} width="58mm" copyLabel={copyLabel} />}
        </div>
      </div>

      {/* Thermal modal — pick width + copy type */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              aria-label="Close"
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Printer className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Print Thermal Receipt
              </h2>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Choose your paper size. The browser's print dialog will open
              with the receipt sized to match.
            </p>

            {/* Copy type */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Copy Type
              </label>
              <select
                value={copyLabel}
                onChange={(e) => setCopyLabel(e.target.value as CopyLabel)}
                className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="customer">Customer Copy</option>
                <option value="merchant">Merchant Copy</option>
                <option value="duplicate">Duplicate</option>
              </select>
            </div>

            {/* Width buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  handlePrintThermal('80mm');
                }}
                className="flex flex-col items-center justify-center gap-1 py-4 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm text-sm font-medium transition-colors"
              >
                <span className="text-base font-bold">80mm</span>
                <span className="text-[10px] opacity-90">Standard POS</span>
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  handlePrintThermal('58mm');
                }}
                className="flex flex-col items-center justify-center gap-1 py-4 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-sm text-sm font-medium transition-colors"
              >
                <span className="text-base font-bold">58mm</span>
                <span className="text-[10px] opacity-90">Compact Slip</span>
              </button>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-2 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
