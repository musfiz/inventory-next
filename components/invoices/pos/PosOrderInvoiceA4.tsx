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

function fmtDate(d?: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: '2-digit',
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

export type PosInvoiceCopyLabel = 'customer' | 'merchant' | 'duplicate';

export interface PosOrderInvoiceA4Props {
  order: PosOrderDetail;
  /** Optional copy stamp printed at the top. */
  copyLabel?: PosInvoiceCopyLabel | null;
}

const COPY_LABEL: Record<PosInvoiceCopyLabel, string> = {
  customer: 'Customer Copy',
  merchant: 'Merchant Copy',
  duplicate: 'Duplicate',
};

// ── Status badge helper ───────────────────────────────────────────────────────

function PayStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'bg-green-100 text-green-800 border-green-300',
    partial: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    pending: 'bg-orange-100 text-orange-800 border-orange-300',
    failed: 'bg-red-100 text-red-800 border-red-300',
  };
  const cls = map[status] ?? 'bg-gray-100 text-gray-700 border-gray-300';
  return (
    <span className={`inline-block border rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${cls}`}>
      {status === 'paid' ? 'Paid ✓' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * POS Sales Invoice — A4 professional tax invoice.
 *
 * Design follows commercial A4 invoice standards:
 *  • Full company header (logo, name, address, TIN / BIN / VAT)
 *  • "TAX INVOICE" title block with invoice metadata
 *  • Bill-To / Ship-From two-column party block
 *  • 8-column items table: # | Item | SKU | Qty | Unit Price | Disc | Tax | Total
 *  • Totals summary (right-aligned), notes / terms (left)
 *  • Payment details strip
 *  • QR verification code + authorised signature line
 *
 * Mount inside a hidden `<div>` (width: 210mm) and call
 * `window.print()` or copy `.innerHTML` into a new window.
 */
export function PosOrderInvoiceA4({ order, copyLabel }: PosOrderInvoiceA4Props) {
  const tenant = order.tenant as any; // tenant has extended fields on detail endpoint
  const customer = order.customer;
  const items = order.items ?? [];

  const customerName = customer?.name ?? order.customer_name ?? 'Walk-in Customer';
  const customerPhone = customer?.phone ?? order.customer_phone;
  const customerEmail = customer?.email;
  const invoiceNo = order.invoice_number ?? `#${order.id}`;

  const hasDisc = Number(order.discount_amount) > 0;
  const hasTax = Number(order.tax_amount) > 0;
  const dueAmount = Number(order.due_amount ?? 0);

  const printedAt = fmtDateTime(new Date().toISOString());
  const qrSrc = buildQrUrl(invoiceNo, order.grand_total);

  return (
    <div className="invoice-content bg-white text-gray-900 mx-auto font-sans text-sm leading-6">
      {/* ── Copy stamp ──────────────────────────────────────────────── */}
      {copyLabel && (
        <div className="text-center mb-4">
          <span className="inline-block border-2 border-gray-900 px-4 py-1 font-bold text-xs tracking-widest uppercase">
            {COPY_LABEL[copyLabel]}
          </span>
        </div>
      )}

      {/* ── Page header — brand (left) + doc type (right) ─────────── */}
      <header className="flex justify-between items-start border-b-[3px] border-gray-900 pb-5 mb-5">
        {/* Brand block */}
        <div className="max-w-[56mm]">
          {tenant?.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant?.business_name ?? 'Logo'}
              className="mb-2 object-contain"
              style={{ maxHeight: '20mm', maxWidth: '50mm' }}
            />
          ) : (
            <div
              className="w-20 h-16 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs mb-2"
              aria-hidden="true"
            >
              LOGO
            </div>
          )}
          {tenant?.business_name && (
            <div className="text-xl font-extrabold uppercase tracking-tight">
              {tenant.business_name}
            </div>
          )}
          <div className="text-xs text-gray-600 mt-1 leading-5">
            {tenant?.address && <div>{tenant.address}</div>}
            {(tenant?.city || tenant?.country) && (
              <div>{[tenant?.city, tenant?.country].filter(Boolean).join(', ')}</div>
            )}
            {tenant?.phone && <div>Tel: {tenant.phone}</div>}
            {tenant?.email && <div>Email: {tenant.email}</div>}
            {(tenant?.tin_number || tenant?.bin_number || tenant?.vat_number) && (
              <div className="mt-0.5">
                {tenant?.tin_number && <span>TIN: {tenant.tin_number}</span>}
                {tenant?.bin_number && <span> · BIN: {tenant.bin_number}</span>}
                {tenant?.vat_number && <span> · VAT: {tenant.vat_number}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Document type + meta block */}
        <div className="text-right">
          <div className="text-3xl font-extrabold uppercase tracking-wide text-gray-900 mb-3">
            Tax Invoice
          </div>
          <table className="text-xs ml-auto">
            <tbody>
              <tr>
                <td className="text-gray-500 pr-3 text-right">Invoice No</td>
                <td className="font-bold text-right">{invoiceNo}</td>
              </tr>
              {order.id && (
                <tr>
                  <td className="text-gray-500 pr-3 text-right">Order No</td>
                  <td className="text-right">POS-{order.id}</td>
                </tr>
              )}
              <tr>
                <td className="text-gray-500 pr-3 text-right">Date</td>
                <td className="text-right">{fmtDate(order.order_date ?? order.created_at)}</td>
              </tr>
              <tr>
                <td className="text-gray-500 pr-3 text-right">Time</td>
                <td className="text-right">
                  {order.order_date
                    ? new Date(order.order_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </td>
              </tr>
              {order.session?.session_number && (
                <tr>
                  <td className="text-gray-500 pr-3 text-right">Session</td>
                  <td className="text-right">{order.session.session_number}</td>
                </tr>
              )}
              {order.register?.name && (
                <tr>
                  <td className="text-gray-500 pr-3 text-right">Register</td>
                  <td className="text-right">{order.register.name}</td>
                </tr>
              )}
              <tr>
                <td className="text-gray-500 pr-3 text-right">Status</td>
                <td className="text-right">
                  <PayStatusBadge status={order.payment_status} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </header>

      {/* ── Bill To / Sold At two-column ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Bill To */}
        <div className="border border-gray-200 rounded p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-200 pb-1.5 mb-2">
            Bill To
          </div>
          <div className="font-bold text-sm">{customerName}</div>
          <div className="text-xs text-gray-600 mt-0.5 space-y-0.5">
            {customerPhone && <div>Tel: {customerPhone}</div>}
            {customerEmail && <div>Email: {customerEmail}</div>}
          </div>
        </div>

        {/* Store / ship from */}
        <div className="border border-gray-200 rounded p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-200 pb-1.5 mb-2">
            Sold By / Branch
          </div>
          <div className="font-bold text-sm">{tenant?.business_name ?? 'Main Branch'}</div>
          <div className="text-xs text-gray-600 mt-0.5 space-y-0.5">
            {tenant?.address && <div>{tenant.address}</div>}
            {tenant?.phone && <div>Tel: {tenant.phone}</div>}
          </div>
        </div>
      </div>

      {/* ── Items table ─────────────────────────────────────────────── */}
      <table className="w-full mb-4 text-xs" role="table" aria-label="Invoice line items">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="text-left px-2 py-2 font-semibold w-6">#</th>
            <th className="text-left px-2 py-2 font-semibold">Item / Description</th>
            <th className="text-center px-2 py-2 font-semibold w-24">SKU</th>
            <th className="text-center px-2 py-2 font-semibold w-12">Qty</th>
            <th className="text-right px-2 py-2 font-semibold w-24">Unit Price</th>
            <th className="text-right px-2 py-2 font-semibold w-20">Discount</th>
            <th className="text-right px-2 py-2 font-semibold w-14">Tax%</th>
            <th className="text-right px-2 py-2 font-semibold w-24">Line Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const discAmt = Number(item.discount ?? 0);
            const taxRate = Number(item.tax_rate ?? 0);

            return (
              <tr
                key={item.id}
                className={idx % 2 === 1 ? 'bg-gray-50' : ''}
              >
                <td className="text-center px-2 py-2 text-gray-500 border-b border-gray-100">
                  {idx + 1}
                </td>
                <td className="px-2 py-2 border-b border-gray-100">
                  <div className="font-semibold">{item.item_name}</div>
                  {item.variation?.name && (
                    <div className="text-gray-500 text-[10px]">{item.variation.name}</div>
                  )}
                </td>
                <td className="text-center px-2 py-2 text-gray-500 font-mono border-b border-gray-100">
                  {item.variation?.sku ?? item.product?.code ?? '—'}
                </td>
                <td className="text-center px-2 py-2 border-b border-gray-100 tabular-nums">
                  {item.quantity}
                </td>
                <td className="text-right px-2 py-2 border-b border-gray-100 tabular-nums">
                  {fmt(item.unit_price)}
                </td>
                <td className="text-right px-2 py-2 border-b border-gray-100 tabular-nums">
                  {discAmt > 0 ? fmt(discAmt) : '—'}
                </td>
                <td className="text-right px-2 py-2 border-b border-gray-100 tabular-nums">
                  {taxRate > 0 ? `${taxRate}%` : '0%'}
                </td>
                <td className="text-right px-2 py-2 border-b border-gray-100 font-semibold tabular-nums">
                  {fmt(item.line_total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Summary grid — notes (left) + totals (right) ─────────── */}
      <div className="grid grid-cols-2 gap-5 mb-5 items-start">
        {/* Notes & Terms */}
        <div className="text-xs text-gray-600 leading-5">
          {order.notes && (
            <div className="mb-2">
              <div className="font-semibold text-gray-900 uppercase tracking-wider text-[10px] mb-1">Notes</div>
              <div>{order.notes}</div>
            </div>
          )}
          <div>
            <div className="font-semibold text-gray-900 uppercase tracking-wider text-[10px] mb-1">
              Terms &amp; Conditions
            </div>
            <div className="text-gray-500">
              Returns accepted within 7 days with original receipt.<br />
              No refund on discounted or opened items.<br />
              Items once sold cannot be exchanged without receipt.
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="border border-gray-200 rounded p-3">
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="text-gray-500 py-0.5">Subtotal</td>
                <td className="text-right tabular-nums py-0.5 font-mono">{fmt(order.sub_total)}</td>
              </tr>
              {hasDisc && (
                <tr>
                  <td className="text-gray-500 py-0.5">
                    Discount
                    {order.discount_type === 'percent' && order.discount_value
                      ? ` (${order.discount_value}%)`
                      : ''}
                  </td>
                  <td className="text-right tabular-nums py-0.5 font-mono">−{fmt(order.discount_amount)}</td>
                </tr>
              )}
              {hasTax && (
                <tr>
                  <td className="text-gray-500 py-0.5">Tax</td>
                  <td className="text-right tabular-nums py-0.5 font-mono">+{fmt(order.tax_amount)}</td>
                </tr>
              )}
              {Number(order.rounding_adjustment ?? 0) !== 0 && (
                <tr>
                  <td className="text-gray-500 py-0.5">Rounding</td>
                  <td className="text-right tabular-nums py-0.5 font-mono">{fmt(order.rounding_adjustment)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-b-2 border-gray-900">
                <td className="font-extrabold text-gray-900 py-1.5 uppercase tracking-wide">Grand Total</td>
                <td className="text-right tabular-nums py-1.5 font-extrabold font-mono text-sm">
                  {fmt(order.grand_total)}
                </td>
              </tr>
              <tr>
                <td className="text-gray-500 py-0.5">Amount Paid</td>
                <td className="text-right tabular-nums py-0.5 font-mono">{fmt(order.paid_amount)}</td>
              </tr>
              {dueAmount > 0 && (
                <tr>
                  <td className="font-semibold py-0.5">Balance Due</td>
                  <td className="text-right tabular-nums py-0.5 font-mono font-bold">{fmt(dueAmount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Payment strip ────────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded p-3 mb-5 text-xs">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-200 pb-1.5 mb-2">
          Payment Details
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Method</div>
            <div className="font-bold capitalize">
              {(order.payment_method ?? '').replace(/_/g, ' ') || '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Amount Paid</div>
            <div className="font-bold tabular-nums">{fmt(order.paid_amount)}</div>
          </div>
          {Number(order.tendered_amount ?? 0) > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Cash Tendered</div>
              <div className="font-bold tabular-nums">{fmt(order.tendered_amount)}</div>
            </div>
          )}
          {Number(order.change_amount ?? 0) > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Change</div>
              <div className="font-bold tabular-nums">{fmt(order.change_amount)}</div>
            </div>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Status</div>
            <div><PayStatusBadge status={order.payment_status} /></div>
          </div>
        </div>
      </div>

      {/* ── Footer — policy (left) + QR (center) + signature (right) ── */}
      <footer className="flex justify-between items-end border-t border-gray-200 pt-4 mt-2">
        {/* Return policy */}
        <div className="text-xs text-gray-500 max-w-[100mm] leading-5">
          <div className="font-semibold text-gray-700 uppercase tracking-wide text-[10px] mb-1">
            Return Policy
          </div>
          Returns accepted within 7 days with original receipt.<br />
          No refund on discounted or already-opened items.<br />
          Items once sold cannot be exchanged without receipt.
          <div className="mt-2 text-[10px]">
            Powered by Inventory POS · v1.0 · Printed: {printedAt}
          </div>
        </div>

        {/* QR code */}
        {qrSrc && (
          <div className="flex flex-col items-center mx-4">
            <img
              src={qrSrc}
              alt={`QR for ${invoiceNo}`}
              width={72}
              height={72}
              crossOrigin="anonymous"
            />
            <div className="text-[9px] text-gray-500 mt-0.5">Scan to verify</div>
          </div>
        )}

        {/* Authorised signature */}
        <div className="text-right">
          <div className="w-44 border-b border-gray-900 mb-1 h-8" />
          <div className="text-xs text-gray-500">Authorised Signature</div>
          {tenant?.business_name && (
            <div className="text-[10px] text-gray-400">{tenant.business_name}</div>
          )}
        </div>
      </footer>
    </div>
  );
}
