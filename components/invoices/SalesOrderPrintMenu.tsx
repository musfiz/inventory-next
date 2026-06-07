'use client';

import { useRef, useState } from 'react';
import { FileText, Printer, X, Loader2 } from 'lucide-react';
import { notify } from '@/lib/notifications';
import { SalesOrderInvoiceA4 } from './SalesOrderInvoiceA4';
import {
  SalesOrderInvoiceThermal,
  type PosInvoiceCopyLabel,
} from './SalesOrderInvoiceThermal';
import salesOrderService from '@/services/salesOrderService';

// ─── Base print styles injected into the new window ──────────────────────────

const PRINT_STYLES = `
  @page { margin: 0; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; color: #1a1a2e; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
  img  { display: block; max-width: 100%; }
  table { border-collapse: collapse; }

  /* A4 wrapper */
  .invoice-content {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 14mm 16mm;
    background: #fff;
    position: relative;
  }

  /* Thermal wrapper */
  .pos-invoice-content {
    margin: 0 auto;
    background: #fff;
  }

  @media print {
    html, body { background: #fff !important; }
    table, tr, td, th { page-break-inside: avoid; }
  }
`;

// ─── openPrint helper ─────────────────────────────────────────────────────────

function openPrint(ref: React.RefObject<HTMLDivElement | null>, paperSize: string) {
  if (!ref.current) return;
  const html = ref.current.innerHTML;
  const win = window.open('', '_blank');
  if (!win) {
    notify.error('Pop-up blocked — please allow pop-ups to print invoices.');
    return;
  }
  win.document.write(
    `<!doctype html><html><head><title>Sales Order Invoice</title>` +
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

interface SalesOrderPrintMenuProps {
  /** Full sales order detail (items, payments, customer, etc.). */
  order: any;
}

/**
 * Sales Order print action buttons:
 *  • A4   — full Tax Invoice (instant, default)
 *  • Thermal — opens picker: 80mm / 58mm × Customer / Merchant / Duplicate
 *
 * Three hidden divs (A4, 80mm, 58mm) are mounted so React refs stay
 * valid. The active one is populated with the current order.
 */
export function SalesOrderPrintMenu({ order }: SalesOrderPrintMenuProps) {
  const [showModal, setShowModal] = useState(false);
  const [copyLabel, setCopyLabel] = useState<PosInvoiceCopyLabel>('customer');

  // The list row (`order`) is lightweight — it has the SO summary but
  // NOT the `items`, `payments`, or `returns` arrays. The A4 + thermal
  // invoice components need all of those to render the product list
  // and the full payment history. We lazy-load the full detail on
  // first print and cache it for subsequent prints of the same row.
  const [fullOrder, setFullOrder] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const cachedUuidRef = useRef<string | null>(null);

  const a4Ref = useRef<HTMLDivElement>(null);
  const t80Ref = useRef<HTMLDivElement>(null);
  const t58Ref = useRef<HTMLDivElement>(null);

  // Use the cached detail if we already fetched it for this row, else
  // fall back to the lightweight list row so the menu can render
  // something while the fetch is in flight.
  const orderForPrint = fullOrder ?? order;

  /**
   * Fetch the full sales-order detail by UUID.
   *
   * Backend `GET /api/v1/sales-order/{id}` accepts the UUID and
   * eager-loads items, payments (where reference_type='sales'),
   * returns, customer, warehouse and tenant. This is the only way
   * to render the full product list and the full payment history
   * on the printed invoice.
   */
  const ensureFullOrder = async (): Promise<any | null> => {
    const uuid = order?.uuid;
    if (!uuid) {
      notify.error('Cannot print — sales order is missing its UUID.');
      return null;
    }
    if (cachedUuidRef.current === uuid && fullOrder) {
      return fullOrder;
    }
    try {
      setLoadingDetail(true);
      const detail = await salesOrderService.getSalesOrderForPrint(uuid);
      cachedUuidRef.current = uuid;
      setFullOrder(detail);
      return detail;
    } catch (err: any) {
      notify.error(
        err?.response?.data?.message ||
          'Failed to load sales order detail for printing.'
      );
      return null;
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleA4 = async () => {
    const detail = await ensureFullOrder();
    if (!detail) return;
    // Give React a tick to flush the new `fullOrder` state into the
    // hidden print div before reading its innerHTML.
    setTimeout(() => openPrint(a4Ref, 'A4'), 80);
  };

  const handleThermal = async (w: '80mm' | '58mm') => {
    const detail = await ensureFullOrder();
    if (!detail) return;
    const ref = w === '80mm' ? t80Ref : t58Ref;
    setTimeout(
      () => openPrint(ref, `${w === '80mm' ? '80mm' : '58mm'} auto`),
      80
    );
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {/* A4 — default, instant print */}
        <button
          onClick={handleA4}
          disabled={loadingDetail}
          title="Print A4 Tax Invoice (with full payment history)"
          aria-label="Print A4 Tax Invoice"
          className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer disabled:opacity-50"
        >
          {loadingDetail ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </button>

        {/* Thermal — opens the modal */}
        <button
          onClick={() => setShowModal(true)}
          title="Print Thermal Receipt (POS slip with payment history)"
          aria-label="Print Thermal Receipt"
          className="p-1 rounded text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* Hidden print areas — one per format. These render the FULL
          order detail once `fullOrder` is populated, so the printed
          invoice includes the complete product list and the full
          payment history. While the fetch is in flight we still pass
          the lightweight list row so the menu itself doesn't crash. */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <div ref={a4Ref}>
          <SalesOrderInvoiceA4 order={orderForPrint} copyLabel={null} />
        </div>
        <div ref={t80Ref}>
          <SalesOrderInvoiceThermal
            order={orderForPrint}
            width="80mm"
            copyLabel={copyLabel}
          />
        </div>
        <div ref={t58Ref}>
          <SalesOrderInvoiceThermal
            order={orderForPrint}
            width="58mm"
            copyLabel={copyLabel}
          />
        </div>
      </div>

      {/* Thermal modal — pick width + copy type */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Thermal receipt options"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative"
            onClick={e => e.stopPropagation()}
          >
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
              with the receipt sized to match. Includes full payment history.
            </p>

            {/* Copy type */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Copy Type
              </label>
              <select
                value={copyLabel}
                onChange={e => setCopyLabel(e.target.value as PosInvoiceCopyLabel)}
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
                onClick={() => { handleThermal('80mm'); setShowModal(false); }}
                className="flex flex-col items-center justify-center gap-1 py-4 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm text-sm font-medium transition-colors"
              >
                <span className="text-base font-bold">80mm</span>
                <span className="text-[10px] opacity-90">Standard POS</span>
              </button>
              <button
                onClick={() => { handleThermal('58mm'); setShowModal(false); }}
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

export default SalesOrderPrintMenu;
