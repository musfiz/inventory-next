'use client';

import { useRef, useEffect, useState } from 'react';
import { FileText, Printer, Loader2 } from 'lucide-react';
import { notify } from '@/lib/notifications';
import { PosOrderInvoiceA4 } from './PosOrderInvoiceA4';
import { PosOrderInvoiceThermal } from './PosOrderInvoiceThermal';
import posService from '@/services/posService';
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

interface PosOrderPrintMenuProps {
  /**
   * The POS order — can be a lightweight list row (items/payments
   * missing) or a full `PosOrderDetail` loaded from the detail endpoint.
   * The component lazy-loads the full detail on the first print click.
   */
  order: any;
  /**
   * When true (post-sale auto-print), the order is assumed to be the
   * full detail and is used directly — no lazy-loading.
   */
  autoPrint?: boolean;
  /**
   * Thermal paper size to use when autoPrint is true.
   */
  paperSize?: '80mm' | '58mm';
}

/**
 * POS order print action buttons:
 *  • A4   — full Tax Invoice
 *  • Thermal — auto-prints using tenant's saved paper size
 *
 * Three hidden divs (A4, 80mm, 58mm) are mounted so React refs stay
 * valid.
 *
 * Supports two usage modes:
 *  1. **List page** — order is a lightweight row; lazy-loads full
 *     detail on first click.
 *  2. **Post-sale auto-print** — order is the full detail, autoPrint
 *     fires an immediate thermal print.
 */
export function PosOrderPrintMenu({ order, autoPrint, paperSize: propPaperSize = '80mm' }: PosOrderPrintMenuProps) {
  const [fullOrder, setFullOrder] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const cachedUuidRef = useRef<string | null>(null);

  const a4Ref = useRef<HTMLDivElement>(null);
  const t80Ref = useRef<HTMLDivElement>(null);
  const t58Ref = useRef<HTMLDivElement>(null);

  // Use cached detail if available, otherwise fall back to the
  // lightweight row so the A4 / thermal refs have content.
  const orderForPrint = fullOrder ?? order;

  /**
   * Fetch the full POS order detail by UUID. Caches the result so
   * subsequent prints on the same row don't re-fetch.
   */
  const ensureFullOrder = async (): Promise<any | null> => {
    const uuid = order?.uuid;
    if (!uuid) {
      notify.error('Cannot print — POS order is missing its UUID.');
      return null;
    }
    if (cachedUuidRef.current === uuid && fullOrder) {
      return fullOrder;
    }
    try {
      setLoadingDetail(true);
      const detail = await posService.getPosOrder(uuid);
      cachedUuidRef.current = uuid;
      setFullOrder(detail);
      return detail;
    } catch (err: any) {
      notify.error(
        err?.response?.data?.message ||
          'Failed to load POS order detail for printing.',
      );
      return null;
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleA4 = async () => {
    // In auto-print mode the order is already the full detail.
    if (autoPrint) {
      setTimeout(() => openPrint(a4Ref, 'A4'), 80);
      return;
    }
    const detail = await ensureFullOrder();
    if (!detail) return;
    setTimeout(() => openPrint(a4Ref, 'A4'), 80);
  };

  const resolvePaperSize = async (detail: any): Promise<'80mm' | '58mm'> => {
    if (propPaperSize !== '80mm') return propPaperSize;

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
    // In auto-print mode the order is already the full detail.
    if (autoPrint) {
      const w = propPaperSize;
      const ref = w === '80mm' ? t80Ref : t58Ref;
      setTimeout(() => openPrint(ref, `${w} auto`), 80);
      return;
    }

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

  // Auto-print on mount when autoPrint is true (post-sale flow).
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => handleThermal(), 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, propPaperSize]);

  return (
    <>
      <div className="flex items-center gap-1">
        {/* A4 */}
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

        {/* Thermal */}
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

      {/* Hidden print areas */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <div ref={a4Ref}>
          <PosOrderInvoiceA4 order={orderForPrint} />
        </div>
        <div ref={t80Ref}>
          <PosOrderInvoiceThermal order={orderForPrint} width="80mm" />
        </div>
        <div ref={t58Ref}>
          <PosOrderInvoiceThermal order={orderForPrint} width="58mm" />
        </div>
      </div>
    </>
  );
}

export default PosOrderPrintMenu;
