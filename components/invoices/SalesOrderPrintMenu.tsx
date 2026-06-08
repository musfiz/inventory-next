'use client';

import { useRef, useState } from 'react';
import { FileText, Printer, Loader2 } from 'lucide-react';
import { notify } from '@/lib/notifications';
import { SalesOrderInvoiceA4 } from './SalesOrderInvoiceA4';
import { SalesOrderInvoiceThermal } from './SalesOrderInvoiceThermal';
import salesOrderService from '@/services/salesOrderService';
import tenantService from '@/services/tenantService';

// ─── Base print styles injected into the new window ──────────────────────────

const PRINT_STYLES = `
  @page { margin: 0; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; color: #1a1a2e; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
  img  { display: block; max-width: 100%; }
  table { border-collapse: collapse; }

  .invoice-content {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 14mm 16mm;
    background: #fff;
    position: relative;
  }

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
  /**
   * Optional thermal paper size from tenant settings.
   * If provided, thermal print uses this directly without fetching settings.
   * Accepts '80mm' | '58mm' (back-end '53mm' should be mapped to '58mm').
   */
  paperSize?: '80mm' | '58mm';
}

/**
 * Sales Order print action buttons:
 *  • A4   — full Tax Invoice (instant, default)
 *  • Thermal — auto-prints using tenant's saved paper size (no modal)
 *
 * Three hidden divs (A4, 80mm, 58mm) are mounted so React refs stay
 * valid. The active one is populated with the current order.
 */
export function SalesOrderPrintMenu({ order, paperSize: propPaperSize }: SalesOrderPrintMenuProps) {
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
    setTimeout(() => openPrint(a4Ref, 'A4'), 80);
  };

  const resolvePaperSize = async (detail: any): Promise<'80mm' | '58mm'> => {
    // Prefer the prop if provided (parent already has tenant settings)
    if (propPaperSize) return propPaperSize;

    // Try to get tenant ID from the loaded detail
    const tenantId = detail?.tenant?.id ?? detail?.warehouse?.tenant?.id;
    if (!tenantId) return '80mm';

    try {
      const settings = await tenantService.getTenantSettings(String(tenantId));
      const raw = settings?.thermal_paper_size ?? '80mm';
      return raw === '53mm' ? '58mm' : (raw === '58mm' ? '58mm' : '80mm');
    } catch {
      return '80mm';
    }
  };

  const handleThermal = async () => {
    setLoadingDetail(true);
    const detail = await ensureFullOrder();
    if (!detail) {
      setLoadingDetail(false);
      return;
    }
    const w = await resolvePaperSize(detail);
    const ref = w === '80mm' ? t80Ref : t58Ref;
    setLoadingDetail(false);
    setTimeout(() => openPrint(ref, `${w} auto`), 80);
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

        {/* Thermal — auto-prints using tenant's saved paper size */}
        <button
          onClick={handleThermal}
          disabled={loadingDetail}
          title="Print Thermal Receipt (uses tenant paper size setting)"
          aria-label="Print Thermal Receipt"
          className="p-1 rounded text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 cursor-pointer disabled:opacity-50"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* Hidden print areas — one per format */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <div ref={a4Ref}>
          <SalesOrderInvoiceA4 order={orderForPrint} copyLabel={null} />
        </div>
        <div ref={t80Ref}>
          <SalesOrderInvoiceThermal
            order={orderForPrint}
            width="80mm"
            copyLabel={null}
          />
        </div>
        <div ref={t58Ref}>
          <SalesOrderInvoiceThermal
            order={orderForPrint}
            width="58mm"
            copyLabel={null}
          />
        </div>
      </div>
    </>
  );
}

export default SalesOrderPrintMenu;
