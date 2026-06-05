import type { PosOrderDetail } from '@/types/api.types';
import { buildQrUrl } from '@/components/invoices/pay-receipt/shared';

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n?: number | string | null): string {
  if (n === null || n === undefined || n === '') return '0.00';
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDateTime(d?: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type PosInvoicePaperWidth = '58mm' | '80mm';
export type PosInvoiceCopyLabel = 'customer' | 'merchant' | 'duplicate';

export interface PosOrderInvoiceThermalProps {
  order: PosOrderDetail;
  /**
   * Paper width.
   *  '80mm' — standard Epson TM-T88 / Star TSP slip (default).
   *  '58mm' — compact Bixolon / Star mPOP slip.
   */
  width?: PosInvoicePaperWidth;
  /** When set, stamps "CUSTOMER COPY" / "MERCHANT COPY" / "DUPLICATE". */
  copyLabel?: PosInvoiceCopyLabel | null;
}

const COPY_LABEL: Record<PosInvoiceCopyLabel, string> = {
  customer: 'Customer Copy',
  merchant: 'Merchant Copy',
  duplicate: 'Duplicate',
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * POS Sales Invoice — Thermal receipt (58mm / 80mm).
 *
 * Design follows industrial POS receipt standards:
 *  • Monospace font for column alignment
 *  • Dashed separators between sections
 *  • 5-column items table (80mm): Item | Qty | Price | Disc | Total
 *  • 3-column items table (58mm): Item | Qty | Total  (disc/tax as sub-line)
 *  • Tendered / change block for cash payments
 *  • QR code for receipt verification
 *  • Copy stamp + customer signature line
 *
 * Mount inside a hidden `<div>` and call `window.print()` or copy
 * `.innerHTML` into a new window via `PrintMenu` / custom print helper.
 */
export function PosOrderInvoiceThermal({
  order,
  width = '80mm',
  copyLabel,
}: PosOrderInvoiceThermalProps) {
  const is58 = width === '58mm';
  const qrSize = is58 ? 72 : 96;

  const tenant = order.tenant;
  const customer = order.customer;
  const items = order.items ?? [];

  const customerName = customer?.name ?? order.customer_name ?? 'Walk-in Customer';
  const customerPhone = customer?.phone ?? order.customer_phone;
  const invoiceNo = order.invoice_number ?? `#${order.id}`;

  // Due amount — guard against undefined
  const dueAmount = Number(order.due_amount ?? 0);

  const qrSrc = buildQrUrl(invoiceNo, order.grand_total);

  // Blended tax summary across items
  const hasTax = Number(order.tax_amount) > 0;
  const hasDisc = Number(order.discount_amount) > 0;

  return (
    <div
      className="pos-invoice-content bg-white text-black mx-auto font-mono leading-5 p-3"
      style={{ width, maxWidth: width, minWidth: width, fontSize: is58 ? '11px' : '12px' }}
    >
      {/* ── Copy stamp ─────────────────────────────────────────────── */}
      {copyLabel && (
        <div className="text-center mb-2">
          <span className="inline-block border-2 border-black font-bold tracking-widest uppercase px-2 py-0.5 text-[10px]">
            {COPY_LABEL[copyLabel]}
          </span>
        </div>
      )}

      {/* ── Store header ────────────────────────────────────────────── */}
      <header className="text-center border-b border-dashed border-black pb-2 mb-2">
        {(tenant as any)?.logo_url && (
          <img
            src={(tenant as any).logo_url}
            alt={(tenant as any)?.business_name ?? 'Logo'}
            className="mx-auto mb-1 object-contain"
            style={{ maxHeight: '14mm', maxWidth: '28mm' }}
          />
        )}
        {tenant?.business_name && (
          <div className="font-extrabold uppercase tracking-wide" style={{ fontSize: '1.15em' }}>
            {tenant.business_name}
          </div>
        )}
        {/* Tenant meta — stored in tenant object when relations are loaded */}
        {(tenant as any)?.address && (
          <div className="text-[0.88em] leading-snug">{(tenant as any).address}</div>
        )}
        {(tenant as any)?.phone && (
          <div className="text-[0.88em]">Tel: {(tenant as any).phone}</div>
        )}
        {(tenant as any)?.tin_number && (
          <div className="text-[0.82em]">
            TIN: {(tenant as any).tin_number}
            {(tenant as any)?.bin_number ? ` · BIN: ${(tenant as any).bin_number}` : ''}
          </div>
        )}
      </header>

      {/* ── Document title ──────────────────────────────────────────── */}
      <div className="text-center font-extrabold uppercase tracking-widest border-b border-dashed border-black pb-1.5 mb-1.5">
        Tax Invoice
      </div>

      {/* ── Transaction meta ────────────────────────────────────────── */}
      <section className="border-b border-dashed border-black pb-2 mb-2 space-y-0.5">
        <div className="flex justify-between gap-2">
          <span>Invoice #</span>
          <span className="font-bold text-right">{invoiceNo}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Date</span>
          <span className="text-right">{fmtDateTime(order.order_date ?? order.created_at)}</span>
        </div>
        {order.session?.session_number && (
          <div className="flex justify-between gap-2">
            <span>Session</span>
            <span className="text-right">{order.session.session_number}</span>
          </div>
        )}
        {order.register?.name && (
          <div className="flex justify-between gap-2">
            <span>Register</span>
            <span className="text-right">{order.register.name}</span>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <span>Customer</span>
          <span className="text-right">{customerName}</span>
        </div>
        {customerPhone && (
          <div className="flex justify-between gap-2">
            <span>Phone</span>
            <span className="text-right">{customerPhone}</span>
          </div>
        )}
      </section>

      {/* ── Items table ─────────────────────────────────────────────── */}
      <section className="border-b border-dashed border-black pb-2 mb-2">
        {/* Header row */}
        <div
          className="grid font-bold uppercase border-b border-dashed border-black pb-0.5 mb-1"
          style={{
            fontSize: '0.85em',
            letterSpacing: '0.04em',
            gridTemplateColumns: is58
              ? '1fr auto auto'          /* 58mm: Item | Qty | Total */
              : '1fr auto auto auto auto', /* 80mm: Item | Qty | Price | Disc | Total */
          }}
        >
          <span>Item</span>
          <span className="text-center px-1">Qty</span>
          {!is58 && <span className="text-right px-1">Price</span>}
          {!is58 && <span className="text-right px-1">Disc</span>}
          <span className="text-right">Total</span>
        </div>

        {/* Item rows */}
        {items.map((item) => {
          const discAmt = Number(item.discount ?? 0);
          const taxRate = Number(item.tax_rate ?? 0);
          const lineTot = Number(item.line_total ?? 0);

          return (
            <div key={item.id} className="mb-1.5">
              <div
                className="grid items-start"
                style={{
                  gridTemplateColumns: is58
                    ? '1fr auto auto'
                    : '1fr auto auto auto auto',
                  fontSize: '1em',
                }}
              >
                {/* Item name + meta */}
                <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {item.item_name}
                  {item.variation?.name && (
                    <span className="block" style={{ fontSize: '0.82em', color: '#444' }}>
                      {item.variation.name}
                    </span>
                  )}
                  {(item.product?.code ?? item.variation?.sku) && (
                    <span className="block" style={{ fontSize: '0.8em', color: '#555' }}>
                      SKU: {item.variation?.sku ?? item.product?.code}
                    </span>
                  )}
                  {/* 58mm: disc + tax inline since cols are hidden */}
                  {is58 && (discAmt > 0 || taxRate > 0) && (
                    <span className="block" style={{ fontSize: '0.8em', color: '#555' }}>
                      {`@ ${fmt(item.unit_price)}`}
                      {discAmt > 0 ? ` · Disc: ${fmt(discAmt)}` : ''}
                      {taxRate > 0 ? ` · Tax: ${taxRate}%` : ''}
                    </span>
                  )}
                  {/* 80mm: price details sub-line */}
                  {!is58 && (
                    <span className="block" style={{ fontSize: '0.8em', color: '#555' }}>
                      {item.quantity} × {fmt(item.unit_price)}
                    </span>
                  )}
                </span>

                <span className="text-center px-1 tabular-nums">{item.quantity}</span>

                {!is58 && (
                  <span className="text-right px-1 tabular-nums">{fmt(item.unit_price)}</span>
                )}
                {!is58 && (
                  <span className="text-right px-1 tabular-nums">
                    {discAmt > 0 ? fmt(discAmt) : '—'}
                  </span>
                )}

                <span className="text-right font-bold tabular-nums">{fmt(lineTot)}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Totals ──────────────────────────────────────────────────── */}
      <section className="border-b border-dashed border-black pb-2 mb-2 space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="tabular-nums">{fmt(order.sub_total)}</span>
        </div>
        {hasDisc && (
          <div className="flex justify-between">
            <span>
              Discount
              {order.discount_type === 'percent' && order.discount_value
                ? ` (${order.discount_value}%)`
                : ''}
            </span>
            <span className="tabular-nums">−{fmt(order.discount_amount)}</span>
          </div>
        )}
        {hasTax && (
          <div className="flex justify-between">
            <span>Tax</span>
            <span className="tabular-nums">+{fmt(order.tax_amount)}</span>
          </div>
        )}
        {Number(order.rounding_adjustment ?? 0) !== 0 && (
          <div className="flex justify-between">
            <span>Rounding</span>
            <span className="tabular-nums">{fmt(order.rounding_adjustment)}</span>
          </div>
        )}
        {/* Grand total — double border */}
        <div
          className="flex justify-between font-extrabold"
          style={{
            fontSize: '1.1em',
            borderTop: '1px dashed #000',
            borderBottom: '1px dashed #000',
            padding: '1mm 0',
            marginTop: '1mm',
          }}
        >
          <span className="uppercase tracking-wide">Grand Total</span>
          <span className="tabular-nums">{fmt(order.grand_total)}</span>
        </div>
      </section>

      {/* ── Payment details ─────────────────────────────────────────── */}
      <section className="border-b border-dashed border-black pb-2 mb-2 space-y-0.5">
        <div className="flex justify-between">
          <span>Method</span>
          <span className="font-bold uppercase">
            {(order.payment_method ?? '').replace(/_/g, ' ') || '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Amount Paid</span>
          <span className="tabular-nums">{fmt(order.paid_amount)}</span>
        </div>
        {Number(order.tendered_amount ?? 0) > 0 && (
          <div className="flex justify-between">
            <span>Cash Tendered</span>
            <span className="tabular-nums">{fmt(order.tendered_amount)}</span>
          </div>
        )}
        {Number(order.change_amount ?? 0) > 0 && (
          <div className="flex justify-between">
            <span>Change</span>
            <span className="tabular-nums">{fmt(order.change_amount)}</span>
          </div>
        )}
        {dueAmount > 0 && (
          <div className="flex justify-between font-bold">
            <span>Balance Due</span>
            <span className="tabular-nums">{fmt(dueAmount)}</span>
          </div>
        )}
      </section>

      {/* ── Payment status badge ─────────────────────────────────────── */}
      <div className="text-center py-1">
        <span
          className="inline-block border border-black font-bold uppercase tracking-widest px-2 py-0.5"
          style={{ fontSize: '0.82em', borderRadius: '2px' }}
        >
          {order.payment_status === 'paid'
            ? 'Paid ✓'
            : order.payment_status === 'partial'
              ? 'Partial Payment'
              : (order.payment_status ?? 'Pending').toUpperCase()}
        </span>
      </div>

      {/* ── Notes ───────────────────────────────────────────────────── */}
      {order.notes && (
        <div className="border-t border-dashed border-black pt-1.5 mt-1.5 text-[0.88em]">
          Note: {order.notes}
        </div>
      )}

      {/* ── QR code ─────────────────────────────────────────────────── */}
      {qrSrc && (
        <div className="flex flex-col items-center py-2 mt-1">
          <img
            src={qrSrc}
            alt={`QR for ${invoiceNo}`}
            width={qrSize}
            height={qrSize}
            style={{ width: qrSize, height: qrSize }}
            crossOrigin="anonymous"
          />
          <div className="text-center mt-0.5" style={{ fontSize: '0.75em', color: '#555' }}>
            Scan to verify receipt
          </div>
        </div>
      )}

      {/* ── Double-rule divider ──────────────────────────────────────── */}
      <div style={{ borderTop: '3px double #000', margin: '2mm 0' }} />

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="text-center space-y-0.5" style={{ fontSize: '0.82em', lineHeight: 1.5 }}>
        <div className="font-bold">Thank you for your purchase!</div>
        <div style={{ color: '#444' }}>
          Returns within 7 days with receipt.<br />
          No refund on discounted / opened items.
        </div>
        {copyLabel && copyLabel === 'customer' && (
          <div style={{ marginTop: '4mm' }}>
            <div style={{ borderBottom: '1px solid #000', width: '40mm', margin: '0 auto 1mm' }} />
            <div style={{ fontSize: '0.85em', color: '#555' }}>Customer Signature</div>
          </div>
        )}
        <div style={{ fontSize: '0.75em', color: '#666', marginTop: '2mm' }}>
          Powered by Inventory POS · v1.0
        </div>
      </footer>
    </div>
  );
}
