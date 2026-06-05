import type { Payment } from '@/types/api.types';
import {
  COPY_LABEL_TEXT, fmt, fmtDateTime,
  type PayReceiptCommonProps, type PrintOrderItem,
} from './shared';

// ── A4 PayReceipt — Professional full-invoice design ────────────────────────
// 100% inline styles → self-contained inside window.open() print window.

interface PayReceiptA4Props extends PayReceiptCommonProps {
  payment: Payment;
}

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  dark:      '#1a1a2e',
  dark2:     '#16213e',
  accent:    '#e94560',
  bg:        '#ffffff',
  muted:     '#6b7280',
  border:    '#e5e7eb',
  rowAlt:    '#f8f9fb',
  summaryBg: '#f8f9fb',
};
const FONT = "'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif";

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const tdStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '11px 14px', verticalAlign: 'middle',
  borderBottom: `1px solid ${C.border}`,
  color: C.dark, background: 'transparent', fontSize: 12,
  ...extra,
});
const thStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '12px 14px', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase' as const, letterSpacing: '0.09em',
  whiteSpace: 'nowrap' as const, color: '#fff',
  ...extra,
});
const kvRow = (label: string, value: React.ReactNode, last = false): React.ReactNode => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    gap: 12, padding: '5px 0',
    borderBottom: last ? 'none' : `1px solid ${C.border}`,
  }}>
    <span style={{ color: C.muted, fontSize: 12 }}>{label}</span>
    <span style={{ fontWeight: 600, fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' as const }}>{value}</span>
  </div>
);

// ── Status colours ────────────────────────────────────────────────────────────
function statusStyle(status?: string) {
  const map: Record<string, [string, string, string]> = {
    completed: ['#dcfce7', '#166534', '#86efac'],
    pending:   ['#fef9c3', '#854d0e', '#fde047'],
    failed:    ['#fee2e2', '#991b1b', '#fca5a5'],
    cancelled: ['#fee2e2', '#991b1b', '#fca5a5'],
    refunded:  ['#f3e8ff', '#6b21a8', '#d8b4fe'],
  };
  const [bg, fg, border] = map[status ?? ''] ?? ['#f3f4f6', '#374151', '#d1d5db'];
  return { background: bg, color: fg, border: `1px solid ${border}` };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PayReceiptA4({ payment, copyLabel, orderItems, orderSummary }: PayReceiptA4Props) {
  const tenant     = payment.tenant as any;
  const salesOrder = payment.salesOrder as any;
  const posOrder   = payment.posOrder   as any;
  const customer   = salesOrder?.customer;

  const referenceValue =
    salesOrder?.invoice_number ?? posOrder?.invoice_number ?? posOrder?.order_number
    ?? (payment.sales_order_id ? `#${payment.sales_order_id}` : null)
    ?? (payment.pos_order_id   ? `#${payment.pos_order_id}`   : null)
    ?? '—';

  const customerName  = customer?.name  ?? posOrder?.customer_name  ?? 'Walk-in Customer';
  const customerPhone = customer?.phone ?? posOrder?.customer_phone;
  const customerEmail = customer?.email;

  const printedAt = new Date().toLocaleString();

  const items: PrintOrderItem[] = orderItems ?? [];
  const hasItems = items.length > 0;

  // Summary figures — prefer orderSummary, fall back to payment totals
  const subTotal  = orderSummary?.sub_total      ?? payment.amount;
  const discAmt   = orderSummary?.discount_amount ?? 0;
  const taxAmt    = orderSummary?.tax_amount      ?? Number(payment.tax_amount ?? 0);
  const grandTotal = orderSummary?.grand_total    ?? payment.total_amount;

  return (
    <div
      className="invoice-content"
      style={{ fontFamily: FONT, fontSize: 13, color: C.dark, background: C.bg, lineHeight: 1.5, position: 'relative', overflow: 'hidden' }}
    >
      {/* ── Corner decorations ─────────────────────────────────────────── */}
      <div style={{ position: 'absolute', top: 0, left: 0,  width: 84, height: 13, background: C.dark, borderRadius: '0 0 4px 0' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 84, height: 13, background: C.dark, borderRadius: '0 0 0 4px' }} />

      {/* ── Copy stamp ────────────────────────────────────────────────── */}
      {copyLabel && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ display: 'inline-block', border: `2px solid ${C.dark}`, padding: '3px 12px', fontWeight: 800, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {COPY_LABEL_TEXT[copyLabel]}
          </span>
        </div>
      )}

      {/* ── HEADER: title left · company right ────────────────────────── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 28, paddingBottom: 16 }}>
        <div>
          <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, textTransform: 'uppercase', color: C.dark }}>
            Invoice
          </div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
            Tax Invoice / Payment Receipt
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {tenant?.logo_url && (
            <img src={tenant.logo_url} alt={tenant?.business_name ?? 'logo'}
              style={{ maxHeight: 40, maxWidth: 120, objectFit: 'contain', marginLeft: 'auto', marginBottom: 6 }} />
          )}
          <div style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: C.dark }}>
            {tenant?.business_name ?? 'Your Company'}
          </div>
          <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.7, marginTop: 6 }}>
            {tenant?.address && <div>{tenant.address}</div>}
            {(tenant?.city || tenant?.country) && <div>{[tenant?.city, tenant?.country].filter(Boolean).join(', ')}</div>}
            {tenant?.phone && <div>Tel: {tenant.phone}</div>}
            {tenant?.email && <div>Email: {tenant.email}</div>}
            {(tenant?.tin_number || tenant?.bin_number) && (
              <div>{[tenant?.tin_number && `TIN: ${tenant.tin_number}`, tenant?.bin_number && `BIN: ${tenant.bin_number}`].filter(Boolean).join(' · ')}</div>
            )}
          </div>
        </div>
      </header>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div style={{ borderTop: `2.5px solid ${C.dark}`, marginBottom: 22 }} />

      {/* ── META: bill-to (left) · total-due card (right) ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, marginBottom: 26, alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>
            Invoice To :
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2, marginBottom: 8 }}>{customerName}</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.8 }}>
            {customerPhone && <div>📞 &nbsp;<span style={{ fontWeight: 600, color: C.dark }}>{customerPhone}</span></div>}
            {customerEmail && <div>✉ &nbsp;<span style={{ fontWeight: 600, color: C.dark }}>{customerEmail}</span></div>}
          </div>
        </div>
        <div style={{ background: C.dark, color: '#fff', borderRadius: 6, padding: '20px 26px', minWidth: 200, textAlign: 'right' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 6 }}>Total Due</div>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 14 }}>
            {fmt(grandTotal)}
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, lineHeight: 1.9 }}>
            <div>Receipt No &nbsp;<strong style={{ color: '#fff' }}>{payment.receipt_number}</strong></div>
            <div>Ref &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong style={{ color: '#fff' }}>{referenceValue}</strong></div>
            <div>Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong style={{ color: '#fff' }}>{fmtDateTime(payment.payment_date)}</strong></div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
           PRODUCTS / LINE ITEMS TABLE
           ══════════════════════════════════════════════════════════════════ */}
      {hasItems ? (
        <section style={{ marginBottom: 26 }}>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.dark }}>
                  <th style={thStyle({ width: '2em', textAlign: 'center' })}>#</th>
                  <th style={thStyle({ textAlign: 'left' })}>Product</th>
                  <th style={thStyle({ textAlign: 'center', width: '5em' })}>Qty</th>
                  <th style={thStyle({ textAlign: 'right', width: '9em' })}>Unit Price</th>
                  <th style={thStyle({ textAlign: 'right', width: '8em' })}>Discount</th>
                  <th style={thStyle({ textAlign: 'right', width: '5em' })}>Tax</th>
                  <th style={thStyle({ textAlign: 'right', width: '9em' })}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const isEven = idx % 2 === 1;
                  const rowBg  = isEven ? C.rowAlt : C.bg;
                  return (
                    <tr key={item.id ?? idx} style={{ background: rowBg }}>
                      <td style={tdStyle({ textAlign: 'center', color: C.muted, fontSize: 11, background: rowBg })}>
                        {idx + 1}
                      </td>
                      <td style={tdStyle({ background: rowBg })}>
                        <div style={{ fontWeight: 600, color: C.dark }}>{item.name}</div>
                        {item.variant && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{item.variant}</div>}
                        {item.sku    && <div style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace', marginTop: 1 }}>SKU: {item.sku}</div>}
                      </td>
                      <td style={tdStyle({ textAlign: 'center', fontVariantNumeric: 'tabular-nums', background: rowBg })}>
                        {item.quantity}
                      </td>
                      <td style={tdStyle({ textAlign: 'right', fontVariantNumeric: 'tabular-nums', background: rowBg })}>
                        {fmt(item.unit_price)}
                      </td>
                      <td style={tdStyle({ textAlign: 'right', fontVariantNumeric: 'tabular-nums', background: rowBg })}>
                        {Number(item.discount ?? 0) > 0 ? `− ${fmt(item.discount)}` : '—'}
                      </td>
                      <td style={tdStyle({ textAlign: 'right', background: rowBg })}>
                        {Number(item.tax_rate ?? 0) > 0 ? `${item.tax_rate}%` : '0%'}
                      </td>
                      <td style={tdStyle({ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', background: rowBg, borderRight: 'none' })}>
                        {fmt(item.line_total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        /* No items available — show a note so the section is not blank */
        <section style={{ marginBottom: 26 }}>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ background: C.dark, padding: '12px 14px', color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
              Items
            </div>
            <div style={{ padding: '24px 14px', textAlign: 'center', color: C.muted, fontSize: 12 }}>
              Line item details are not available for this payment receipt.
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
           BOTTOM: payment-method (left) · summary (right)
           ══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, marginBottom: 28, alignItems: 'start' }}>

        {/* Left — payment method + bank */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 12 }}>
            Payment Method
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.dark, color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 100, marginBottom: 12, textTransform: 'capitalize' }}>
            {(payment.payment_method ?? '—').replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.9 }}>
            {payment.transaction_id   && <div>Txn ID &nbsp;&nbsp;&nbsp;<span style={{ fontWeight: 600, color: C.dark }}>{payment.transaction_id}</span></div>}
            {payment.bank_name        && <div>Bank &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ fontWeight: 600, color: C.dark }}>{payment.bank_name}</span></div>}
            {payment.bank_account     && <div>Account &nbsp;&nbsp;<span style={{ fontWeight: 600, color: C.dark }}>{payment.bank_account}</span></div>}
            {payment.card_last_four   && <div>Card &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ fontWeight: 600, color: C.dark, fontFamily: 'monospace' }}>**** {payment.card_last_four}</span></div>}
            {payment.check_number     && <div>Cheque # &nbsp;<span style={{ fontWeight: 600, color: C.dark }}>{payment.check_number}</span></div>}
            {payment.mobile_number    && <div>Mobile &nbsp;&nbsp;&nbsp;<span style={{ fontWeight: 600, color: C.dark }}>{payment.mobile_number}</span></div>}
          </div>

          {/* Payment status badge */}
          <div style={{ marginTop: 14 }}>
            <span style={{ display: 'inline-block', ...statusStyle(payment.status), padding: '5px 14px', borderRadius: 100, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {payment.status === 'completed' ? 'Paid ✓' : (payment.status ?? 'Unknown')}
            </span>
          </div>
        </div>

        {/* Right — totals summary box */}
        <div style={{ background: C.summaryBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '18px 22px', minWidth: 240 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ color: C.muted, padding: '5px 0', paddingRight: 28 }}>Sub-total</td>
                <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', padding: '5px 0' }}>{fmt(subTotal)}</td>
              </tr>
              {Number(discAmt) > 0 && (
                <tr>
                  <td style={{ color: C.muted, padding: '5px 0', paddingRight: 28 }}>
                    Discount{orderSummary?.discount_type === 'percent' && orderSummary?.discount_value ? ` (${orderSummary.discount_value}%)` : ''}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', padding: '5px 0' }}>− {fmt(discAmt)}</td>
                </tr>
              )}
              {Number(taxAmt) > 0 && (
                <tr>
                  <td style={{ color: C.muted, padding: '5px 0', paddingRight: 28 }}>Tax</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', padding: '5px 0' }}>+ {fmt(taxAmt)}</td>
                </tr>
              )}
              {Number(payment.processing_fee ?? 0) > 0 && (
                <tr>
                  <td style={{ color: C.muted, padding: '5px 0', paddingRight: 28 }}>Processing Fee</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', padding: '5px 0' }}>+ {fmt(payment.processing_fee)}</td>
                </tr>
              )}
              {/* Divider */}
              <tr><td colSpan={2} style={{ borderTop: `2px solid ${C.dark}`, padding: 0 }} /></tr>
              {/* Grand total */}
              <tr>
                <td style={{ fontSize: 15, fontWeight: 800, color: C.dark, padding: '8px 0', paddingRight: 28 }}>Grand Total</td>
                <td style={{ fontSize: 18, fontWeight: 900, color: C.accent, textAlign: 'right', fontVariantNumeric: 'tabular-nums', padding: '8px 0' }}>
                  {fmt(grandTotal)}
                </td>
              </tr>
              {/* Divider */}
              <tr><td colSpan={2} style={{ borderTop: `1px solid ${C.border}`, padding: 0 }} /></tr>
              <tr>
                <td style={{ color: C.muted, padding: '5px 0', paddingRight: 28 }}>Amount Paid</td>
                <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', padding: '5px 0' }}>{fmt(payment.total_amount)}</td>
              </tr>
              {Number(payment.tendered_amount ?? 0) > 0 && (
                <tr>
                  <td style={{ color: C.muted, padding: '5px 0', paddingRight: 28 }}>Cash Tendered</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', padding: '5px 0' }}>{fmt(payment.tendered_amount)}</td>
                </tr>
              )}
              {Number(payment.change_amount ?? 0) > 0 && (
                <tr>
                  <td style={{ color: C.muted, padding: '5px 0', paddingRight: 28 }}>Change</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', padding: '5px 0' }}>{fmt(payment.change_amount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Notes ─────────────────────────────────────────────────────── */}
      {payment.notes && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 12 }}>
          <span style={{ fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10 }}>Notes: </span>
          <span style={{ color: C.dark }}>{payment.notes}</span>
        </div>
      )}

      {/* ── FOOTER: thank-you (left) · signature (right) ──────────────── */}
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, paddingBottom: 24, position: 'relative' }}>
        {/* Decorative triangle bottom-left */}
        <div style={{ position: 'absolute', bottom: 0, left: -20, width: 80, height: 80, background: C.dark, clipPath: 'polygon(0 100%, 100% 100%, 0 0)' }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 5 }}>Thank you for your purchase!</div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
            Returns accepted within 7 days with original receipt.<br />
            No refund on discounted or opened items.<br />
            Please retain this receipt for your records.
          </div>
          {(payment.creator || payment.approver) && (
            <div style={{ marginTop: 10, fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
              {(payment.creator  as any)?.name && <div>Recorded by: <strong style={{ color: C.dark }}>{(payment.creator as any).name}</strong></div>}
              {(payment.approver as any)?.name && <div>Approved by: <strong style={{ color: C.dark }}>{(payment.approver as any).name}</strong></div>}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ width: 150, height: 36, borderBottom: `1.5px solid ${C.dark}`, margin: '0 auto 6px' }} />
          <div style={{ fontSize: 12, fontWeight: 700 }}>{(payment.approver as any)?.name ?? 'Authorised By'}</div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Administrator</div>
        </div>
      </footer>

      {/* ── Dark footer bar ───────────────────────────────────────────── */}
      <div style={{ background: C.dark2, color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '10px 20px', margin: '0 -20mm -20mm' }}>
        <span style={{ color: '#fff', fontWeight: 700 }}>{tenant?.business_name ?? 'Your Company'}</span>
        <span>Printed: {printedAt}</span>
        <span>Powered by Inventory POS · v1.0</span>
      </div>
    </div>
  );
}
