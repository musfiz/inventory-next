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
    paid: 'bg-black text-white border-black',
    partial: 'bg-white text-black border-black',
    pending: 'bg-white text-black border-dashed',
    failed: 'bg-red-100 text-red-800 border-red-300',
  };
  const cls = map[status] ?? 'bg-gray-100 text-gray-700 border-gray-300';
  const label =
    status === 'paid'
      ? 'Paid ✓'
      : status === 'partial'
        ? 'Partial Payment'
        : status
          ? status.charAt(0).toUpperCase() + status.slice(1)
          : 'Pending';
  return (
    <span
      className={`inline-block border rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * POS Sales Invoice — A4 professional tax invoice.
 *
 * Industrial-standard design that mirrors the thermal receipt's
 * section model. Hybrid two-column layout:
 *  • Header — brand (left) + document meta card (right)
 *  • Parties — Bill To / Sold By (two columns)
 *  • Items table — 8 columns with row striping
 *  • Summary grid — Terms (left) + Totals card (right)
 *  • Payment strip
 *  • Footer — return policy + QR + signature
 *
 * Mount inside a hidden `<div>` and trigger via `window.print()`.
 */
export function PosOrderInvoiceA4({ order, copyLabel }: PosOrderInvoiceA4Props) {
  const tenant = order.tenant as any;
  const customer = order.customer;
  const items = order.items ?? [];

  const customerName = customer?.name ?? order.customer_name ?? 'Walk-in Customer';
  const customerPhone = customer?.phone ?? order.customer_phone;
  const customerEmail = customer?.email;
  const invoiceNo = order.invoice_number ?? `#${order.id}`;

  const hasDisc = Number(order.discount_amount) > 0;
  const hasTax = Number(order.tax_amount) > 0;
  const hasService = Number((order as any).service_charge ?? 0) > 0;
  const rounding = Number(order.rounding_adjustment ?? 0);
  const dueAmount = Number(order.due_amount ?? 0);
  const paidAmount = Number(order.paid_amount ?? 0);
  const tendered = Number(order.tendered_amount ?? 0);
  const change = Number(order.change_amount ?? 0);

  const itemDiscountSum = items.reduce(
    (s, it) => s + Number((it as any).discount ?? 0),
    0,
  );
  const totalSaved = itemDiscountSum + Number(order.discount_amount ?? 0);

  const printedAt = fmtDateTime(new Date().toISOString());
  const qrSrc = buildQrUrl(invoiceNo, order.grand_total);

  return (
    <div
      className="invoice-content bg-white text-gray-900 mx-auto"
      style={{
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: '12px',
        lineHeight: 1.5,
        color: '#1a1a2e',
      }}
    >
      {/* ── Copy stamp ──────────────────────────────────────────────── */}
      {copyLabel && (
        <div className="text-center mb-4">
          <span
            className="inline-block border-2 border-gray-900 px-4 py-1 font-extrabold text-xs uppercase"
            style={{
              letterSpacing: '0.14em',
              transform: copyLabel === 'merchant' ? 'rotate(-3deg)' : undefined,
            }}
          >
            {COPY_LABEL[copyLabel]}
          </span>
        </div>
      )}

      {/* ══════════════════════════════════
          HEADER  —  brand (left) + meta (right)
          ══════════════════════════════════ */}
      <header className="flex justify-between items-start border-b-[3px] border-gray-900 pb-5 mb-5 gap-6">
        {/* Brand block */}
        <div className="max-w-[60mm]">
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
            <div className="text-2xl font-extrabold uppercase tracking-tight">
              {tenant.business_name}
            </div>
          )}
          {tenant?.tagline && (
            <div className="text-xs text-gray-500 italic mt-0.5">
              {tenant.tagline}
            </div>
          )}
          <div className="text-xs text-gray-600 mt-1.5 leading-5">
            {tenant?.address && <div>{tenant.address}</div>}
            {(tenant?.city || tenant?.country) && (
              <div>{[tenant?.city, tenant?.country].filter(Boolean).join(', ')}</div>
            )}
            {tenant?.phone && <div>Tel: {tenant.phone}</div>}
            {tenant?.email && <div>Email: {tenant.email}</div>}
            {(tenant?.tin_number || tenant?.bin_number || tenant?.vat_number) && (
              <div className="mt-0.5">
                {tenant?.tin_number && <span>TIN: {tenant.tin_number}</span>}
                {tenant?.bin_number && <span> &nbsp;·&nbsp; BIN: {tenant.bin_number}</span>}
                {tenant?.vat_number && <span> &nbsp;·&nbsp; VAT: {tenant.vat_number}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Document meta card */}
        <div
          className="text-right"
          style={{ minWidth: '62mm' }}
        >
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
                    ? new Date(order.order_date).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </td>
              </tr>
              {(order as any).cashier_name && (
                <tr>
                  <td className="text-gray-500 pr-3 text-right">Cashier</td>
                  <td className="text-right">{(order as any).cashier_name}</td>
                </tr>
              )}
              {order.register?.name && (
                <tr>
                  <td className="text-gray-500 pr-3 text-right">Terminal</td>
                  <td className="text-right">{order.register.name}</td>
                </tr>
              )}
              {order.session?.session_number && (
                <tr>
                  <td className="text-gray-500 pr-3 text-right">Session</td>
                  <td className="text-right">{order.session.session_number}</td>
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

      {/* ══════════════════════════════════
          PARTIES  —  Bill To / Sold By
          ══════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="border border-gray-200 rounded p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-200 pb-1.5 mb-2">
            Bill To
          </div>
          <div className="font-bold text-sm">{customerName}</div>
          <div className="text-xs text-gray-600 mt-1 space-y-0.5">
            {customerPhone && <div>Tel: {customerPhone}</div>}
            {customerEmail && <div>Email: {customerEmail}</div>}
            {(customer as any)?.address && (
              <div>{(customer as any).address}</div>
            )}
          </div>
        </div>
        <div className="border border-gray-200 rounded p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-200 pb-1.5 mb-2">
            Sold By / Branch
          </div>
          <div className="font-bold text-sm">
            {tenant?.business_name ?? 'Main Branch'}
          </div>
          <div className="text-xs text-gray-600 mt-1 space-y-0.5">
            {tenant?.address && <div>{tenant.address}</div>}
            {tenant?.phone && <div>Tel: {tenant.phone}</div>}
            {tenant?.email && <div>Email: {tenant.email}</div>}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          ITEMS TABLE  —  vertical layout
          Each item occupies a 2-row block:
            Row 1: # · Item name  (left)    ·  Total  (right)
            Row 2: SKU                        ·  Qty × Price · Disc · Tax
          Smaller font + dotted dividers between items.
          ══════════════════════════════════ */}
      <div className="mb-4 border border-gray-200 rounded overflow-hidden">
        {/* Column labels */}
        <div
          className="grid items-center bg-gray-900 text-white"
          style={{
            gridTemplateColumns:
              'auto 1fr auto auto auto auto auto',
            columnGap: '4mm',
            padding: '6px 10px',
            fontSize: '9px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            minHeight: '4mm',
          }}
        >
          <span style={{ width: '14px', alignSelf: 'center' }}>#</span>
          <span style={{ alignSelf: 'center' }}>Item</span>
          <span style={{ textAlign: 'center', minWidth: '10mm', alignSelf: 'center' }}>Qty</span>
          <span style={{ textAlign: 'right', minWidth: '16mm', alignSelf: 'center' }}>Price</span>
          <span style={{ textAlign: 'right', minWidth: '14mm', alignSelf: 'center' }}>Disc</span>
          <span style={{ textAlign: 'right', minWidth: '10mm', alignSelf: 'center' }}>Tax%</span>
          <span style={{ textAlign: 'right', minWidth: '18mm', alignSelf: 'center' }}>Total</span>
        </div>

        {items.map((item, idx) => {
          const discAmt = Number((item as any).discount ?? 0);
          const taxRate = Number(item.tax_rate ?? 0);
          const sku =
            (item as any).variation?.sku ?? (item as any).product?.code;

          return (
            <div
              key={item.id}
              className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'auto 1fr auto auto auto auto auto',
                columnGap: '4mm',
                alignItems: 'baseline',
                padding: '5px 10px',
                fontSize: '9px',
                borderBottom:
                  idx === items.length - 1
                    ? 'none'
                    : '1px dotted #e5e7eb',
              }}
            >
              {/* # — small muted */}
              <span
                style={{
                  color: '#9ca3af',
                  fontWeight: 600,
                  fontSize: '10px',
                  alignSelf: 'center',
                  width: '14px',
                }}
              >
                {idx + 1}
              </span>

              {/* Item name + SKU */}
              <span
                style={{
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  minWidth: 0,
                  alignSelf: 'center',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: '#1f2937',
                    lineHeight: 1.3,
                  }}
                >
                  {item.item_name}
                </span>
                {sku && (
                  <span
                    style={{
                      display: 'block',
                      color: '#6b7280',
                      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                      fontSize: '8px',
                      marginTop: '0.5px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {sku}
                  </span>
                )}
              </span>

              {/* Total — bold, right-aligned, no leader (right edge) */}
              <span
                style={{
                  textAlign: 'right',
                  padding: '0 1mm',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: '#111827',
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                  minWidth: '18mm',
                  alignSelf: 'center',
                }}
              >
                {fmt(item.line_total)}
              </span>

              {/* Qty — center-aligned, dotted leader */}
              <span
                style={{
                  textAlign: 'center',
                  padding: '0 1mm',
                  fontVariantNumeric: 'tabular-nums',
                  color: '#4b5563',
                  borderBottom: '1px dotted #9ca3af',
                  minWidth: '10mm',
                  alignSelf: 'center',
                }}
              >
                {item.quantity}
              </span>

              {/* Price — right-aligned, dotted leader */}
              <span
                style={{
                  textAlign: 'right',
                  padding: '0 1mm',
                  fontVariantNumeric: 'tabular-nums',
                  color: '#4b5563',
                  borderBottom: '1px dotted #9ca3af',
                  minWidth: '16mm',
                  alignSelf: 'center',
                }}
              >
                {fmt(item.unit_price)}
              </span>

              {/* Disc — right-aligned, dotted leader */}
              <span
                style={{
                  textAlign: 'right',
                  padding: '0 1mm',
                  fontVariantNumeric: 'tabular-nums',
                  color: '#4b5563',
                  borderBottom: '1px dotted #9ca3af',
                  minWidth: '14mm',
                  alignSelf: 'center',
                }}
              >
                {discAmt > 0 ? fmt(discAmt) : '—'}
              </span>

              {/* Tax% — right-aligned, dotted leader */}
              <span
                style={{
                  textAlign: 'right',
                  padding: '0 1mm',
                  fontVariantNumeric: 'tabular-nums',
                  color: '#4b5563',
                  borderBottom: '1px dotted #9ca3af',
                  minWidth: '10mm',
                  alignSelf: 'center',
                }}
              >
                {taxRate > 0 ? `${taxRate}%` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════
          SUMMARY GRID  —  Terms (left) + Totals (right)
          ══════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-5 mb-5 items-start">
        {/* Notes & Terms */}
        <div className="text-xs text-gray-600 leading-5">
          {order.notes && (
            <div className="mb-3">
              <div className="font-semibold text-gray-900 uppercase tracking-wider text-[10px] mb-1">
                Notes
              </div>
              <div>{order.notes}</div>
            </div>
          )}
          <div>
            <div className="font-semibold text-gray-900 uppercase tracking-wider text-[10px] mb-1">
              Terms &amp; Conditions
            </div>
            <div className="text-gray-500">
              Returns accepted within 7 days with original receipt.
              <br />
              No refund on discounted or opened items.
              <br />
              Items once sold cannot be exchanged without a valid receipt.
            </div>
          </div>
        </div>

        {/* Totals card */}
        <div className="border border-gray-200 rounded p-3">
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="text-gray-500 py-0.5">Subtotal</td>
                <td className="text-right tabular-nums py-0.5 font-mono">
                  {fmt(order.sub_total)}
                </td>
              </tr>
              {itemDiscountSum > 0 && (
                <tr>
                  <td className="text-gray-500 py-0.5">Item Discounts</td>
                  <td className="text-right tabular-nums py-0.5 font-mono">
                    −{fmt(itemDiscountSum)}
                  </td>
                </tr>
              )}
              {hasDisc && (
                <tr>
                  <td className="text-gray-500 py-0.5">
                    Order Discount
                    {order.discount_type === 'percent' && order.discount_value
                      ? ` (${order.discount_value}%)`
                      : ''}
                  </td>
                  <td className="text-right tabular-nums py-0.5 font-mono">
                    −{fmt(order.discount_amount)}
                  </td>
                </tr>
              )}
              {totalSaved > 0 && (
                <tr>
                  <td className="text-gray-500 py-0.5" style={{ color: '#1b7f3a' }}>
                    You Saved
                  </td>
                  <td
                    className="text-right tabular-nums py-0.5 font-mono font-semibold"
                    style={{ color: '#1b7f3a' }}
                  >
                    −{fmt(totalSaved)}
                  </td>
                </tr>
              )}
              {hasTax && (
                <tr>
                  <td className="text-gray-500 py-0.5">
                    Tax{order.tax_rate ? ` (${order.tax_rate}%)` : ''}
                  </td>
                  <td className="text-right tabular-nums py-0.5 font-mono">
                    +{fmt(order.tax_amount)}
                  </td>
                </tr>
              )}
              {hasService && (
                <tr>
                  <td className="text-gray-500 py-0.5">Service Charge</td>
                  <td className="text-right tabular-nums py-0.5 font-mono">
                    +{fmt((order as any).service_charge)}
                  </td>
                </tr>
              )}
              {rounding !== 0 && (
                <tr>
                  <td className="text-gray-500 py-0.5">Rounding</td>
                  <td className="text-right tabular-nums py-0.5 font-mono">
                    {rounding > 0 ? '+' : ''}
                    {fmt(rounding)}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-b-2 border-gray-900">
                <td className="font-extrabold text-gray-900 py-2 uppercase tracking-wide">
                  Grand Total
                </td>
                <td className="text-right tabular-nums py-2 font-extrabold font-mono text-base">
                  {fmt(order.grand_total)}
                </td>
              </tr>
              <tr>
                <td className="text-gray-500 py-0.5">Amount Paid</td>
                <td className="text-right tabular-nums py-0.5 font-mono">
                  {fmt(paidAmount)}
                </td>
              </tr>
              {dueAmount > 0 && (
                <tr>
                  <td className="font-semibold py-0.5">Balance Due</td>
                  <td className="text-right tabular-nums py-0.5 font-mono font-bold">
                    {fmt(dueAmount)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════
          PAYMENT STRIP
          ══════════════════════════════════ */}
      <div className="border border-gray-200 rounded p-3 mb-5 text-xs">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-200 pb-1.5 mb-2">
          Payment Details
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Method</div>
            <div className="font-bold capitalize">
              {(order.payment_method ?? '').replace(/_/g, ' ') || '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Amount Paid</div>
            <div className="font-bold tabular-nums">{fmt(paidAmount)}</div>
          </div>
          {tendered > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Cash Tendered</div>
              <div className="font-bold tabular-nums">{fmt(tendered)}</div>
            </div>
          )}
          {change > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Change</div>
              <div className="font-bold tabular-nums">{fmt(change)}</div>
            </div>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Status</div>
            <div>
              <PayStatusBadge status={order.payment_status} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          FOOTER  —  policy (left) + QR (centre) + signature (right)
          ══════════════════════════════════ */}
      <footer className="flex justify-between items-end border-t border-gray-200 pt-4 mt-2 gap-4">
        {/* Return policy */}
        <div className="text-xs text-gray-500 max-w-[95mm] leading-5">
          <div className="font-semibold text-gray-700 uppercase tracking-wide text-[10px] mb-1">
            Return Policy
          </div>
          Returns accepted within 7 days with original receipt.
          <br />
          No refund on discounted or already-opened items.
          <br />
          Items once sold cannot be exchanged without a valid receipt.
          {(tenant?.phone || tenant?.email) && (
            <div className="mt-1.5">
              {tenant?.phone && <span><strong>Helpline:</strong> {tenant.phone}</span>}
              {tenant?.phone && tenant?.email && <span> &nbsp;·&nbsp; </span>}
              {tenant?.email && <span><strong>Email:</strong> {tenant.email}</span>}
            </div>
          )}
          <div className="mt-2 text-[10px]">
            Powered by Inventory POS · v1.0 · Printed: {printedAt}
          </div>
        </div>

        {/* QR code */}
        {qrSrc && (
          <div className="flex flex-col items-center mx-2">
            <img
              src={qrSrc}
              alt={`QR for ${invoiceNo}`}
              width={80}
              height={80}
              crossOrigin="anonymous"
            />
            <div className="text-[9px] text-gray-500 mt-0.5">
              Scan to verify · {invoiceNo}
            </div>
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
