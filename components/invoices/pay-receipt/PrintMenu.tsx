'use client';

import { useRef, useState } from 'react';
import { FileText, Printer, X } from 'lucide-react';
import type { Payment, ReceiptOrderItem } from '@/types/api.types';
import { notify } from '@/lib/notifications';
import { paymentService } from '@/services';
import posService from '@/services/posService';
import salesOrderService from '@/services/salesOrderService';
import { PayReceiptA4 } from './PayReceiptA4';
import { PayReceiptThermal } from './PayReceiptThermal';
import type { PrintOrderItem } from './shared';

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
  const a4Ref = useRef<HTMLDivElement>(null);
  const t80Ref = useRef<HTMLDivElement>(null);
  const t58Ref = useRef<HTMLDivElement>(null);

  // Latest payment (after reload)
  const [full, setFull] = useState<Payment | null>(null);

  // Order line items + summary fetched from the linked POS / Sales order
  const [orderItems, setOrderItems] = useState<PrintOrderItem[] | null>(null);
  const [orderSummary, setOrderSummary] = useState<{
    sub_total?: number | null;
    discount_amount?: number | null;
    discount_type?: string | null;
    discount_value?: number | null;
    tax_amount?: number | null;
    grand_total?: number | null;
  } | null>(null);

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
        /* ── Page setup ────────────────────────────────────── */
        @page {
          size: ${paperSize || 'auto'};
          margin: 0;
        }

        /* ── Base reset ────────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          background: #fff;
          color: #1a1a2e;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body { font-family: 'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif; }
        img  { display: block; max-width: 100%; }
        table { border-collapse: collapse; }

        /* ── A4 wrapper — used by PayReceiptA4 ─────────────── */
        .invoice-content {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 20mm;
          background: #fff;
          position: relative;
          overflow: hidden;
        }

        /* ── Thermal wrapper — used by PayReceiptThermal ────── */
        .pos-invoice-content {
          margin: 0 auto;
          background: #fff;
          padding: 6mm 4mm;
        }

        /* ── Print helpers ──────────────────────────────────── */
        @media print {
          html, body { background: #fff !important; }
          table, tr, td, th { page-break-inside: avoid; }
        }
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

      // Derive the reference type from the row so the backend knows
      // which order relation to load. Prefer the explicit column, then
      // fall back to whichever FK happens to be set. Mirrors the enum
      // in payments.reference_type (pos|sales|...).
      const referenceType: string | undefined =
        payment.reference_type ??
        (payment.pos_order_id
          ? 'pos'
          : payment.sales_order_id
          ? 'sales'
          : undefined);

      // Single round-trip when the backend has the receipt endpoint;
      // otherwise the service transparently falls back to `show` /
      // `byUuid`, which return the payment with `tenant`, `salesOrder`
      // and `posOrder` relations but no inlined line items. Keyed by
      // uuid when available so a printed/emailed receipt URL is
      // stable across db id shifts.
      const f = payment.uuid
        ? await paymentService.receiptByUuid(payment.uuid, referenceType)
        : await paymentService.receipt(payment.id, referenceType);
      setFull(f);

      // Map the linked order's items into PrintOrderItem[]. Two paths:
      //  (1) The `/receipt` endpoint already inlines `items` on the
      //      linked order — use them directly.
      //  (2) `show` / `byUuid` do not — fall back to the order detail
      //      services so the receipt still gets line items.
      const linkedOrder = f.salesOrder ?? f.posOrder ?? null;

      const mapItem = (it: ReceiptOrderItem): PrintOrderItem => {
        const qty   = Number(it.quantity ?? 0);
        const price = Number(it.unit_price ?? 0);
        const disc  = Number(it.discount_amount ?? it.discount ?? 0);
        const tax   = (qty * price * Number(it.tax_rate ?? 0)) / 100;
        return {
          id: it.id,
          name: it.item_name ?? it.product?.name ?? 'Item',
          variant: it.variation?.name ?? null,
          sku: it.variation?.sku ?? it.product?.code ?? it.product?.sku ?? null,
          quantity: qty,
          unit_price: price,
          discount: disc,
          tax_rate: Number(it.tax_rate ?? 0),
          // line_total is a computed accessor on the backend but not
          // included in the JSON payload (no $appends on the model),
          // so we recompute it here to match the server's formula.
          line_total: qty * price - disc + tax,
        };
      };

      const applyLinkedOrder = (order: NonNullable<typeof linkedOrder>, items: ReceiptOrderItem[]) => {
        setOrderItems(items.map(mapItem));
        setOrderSummary({
          sub_total: order.sub_total,
          discount_amount: order.discount_amount,
          discount_type: order.discount_type,
          discount_value: order.discount_value,
          tax_amount: order.tax_amount,
          grand_total: order.grand_total,
        });
      };

      if (linkedOrder?.items && linkedOrder.items.length > 0) {
        applyLinkedOrder(linkedOrder, linkedOrder.items as ReceiptOrderItem[]);
      } else if (f.pos_order_id) {
        // POS detail endpoint is keyed by uuid, not numeric id. The
        // eager-loaded `posOrder.uuid` is reliable; fall back to the
        // numeric id only as a last resort.
        const posLookup =
          (linkedOrder as any)?.uuid ??
          (await posService.getPosOrder(String(f.pos_order_id)).catch(() => null) as any)?.uuid;
        if (posLookup) {
          try {
            const order: any = await posService.getPosOrder(String(posLookup));
            applyLinkedOrder(
              { ...(linkedOrder ?? {}), ...order } as any,
              (order.items ?? []) as ReceiptOrderItem[],
            );
          } catch {
            setOrderItems([]);
          }
        } else {
          setOrderItems([]);
        }
      } else if (f.sales_order_id) {
        try {
          const order: any = await salesOrderService.getSalesOrder(String(f.sales_order_id));
          const rawItems =
            order.items ?? (await salesOrderService.getSalesOrderItems(String(f.sales_order_id)));
          applyLinkedOrder(
            { ...(linkedOrder ?? {}), ...order } as any,
            (rawItems ?? []) as ReceiptOrderItem[],
          );
        } catch {
          setOrderItems([]);
        }
      } else {
        // No linked order — receipt still prints without items.
        setOrderItems([]);
      }

      return f;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('PrintMenu: failed to load payment for printing', err);
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
          {data && (
            <PayReceiptA4
              payment={data}
              copyLabel={null}
              orderItems={orderItems}
              orderSummary={orderSummary}
            />
          )}
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
