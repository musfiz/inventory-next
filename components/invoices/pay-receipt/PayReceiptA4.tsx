import type { Payment } from '@/types/api.types';
import {
  COPY_LABEL_TEXT, fmt, fmtDateTime,
  type PayReceiptCommonProps, type PrintOrderItem,
} from './shared';

// ── A4 PayReceipt — Simplified, mirrors the sales-order details layout ─────
// 100% inline styles → self-contained inside the window.open() print window.

interface PayReceiptA4Props extends PayReceiptCommonProps {
  payment: Payment;
}

// ── Neutral palette — no dark navy, no coloured bands ───────────────────────
const C = {
  ink: '#1f2937',
  muted: '#6b7280',
  border: '#e5e7eb',
  borderDk: '#d1d5db',
  bg: '#ffffff',
  rowAlt: '#f8fafc',
  sumBg: '#f3f4f6',
  sumRow: '#e5e7eb',
  red: '#dc2626',
  green: '#059669',
};
const FONT = "'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif";

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const thStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '6px 8px',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: C.ink,
  background: C.sumBg,
  textAlign: 'left',
  borderBottom: `1px solid ${C.borderDk}`,
  ...extra,
});
const tdStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '5px 8px',
  fontSize: 11,
  color: C.ink,
  borderBottom: `1px solid ${C.border}`,
  verticalAlign: 'middle',
  ...extra,
});

// ── Status colours (mirrors sales-order details modal) ───────────────────────
function statusStyle(status?: string): React.CSSProperties {
  const map: Record<string, { bg: string; fg: string }> = {
    completed: { bg: '#dcfce7', fg: '#166534' },
    pending: { bg: '#fef9c3', fg: '#854d0e' },
    failed: { bg: '#fee2e2', fg: '#991b1b' },
    cancelled: { bg: '#fee2e2', fg: '#991b1b' },
    refunded: { bg: '#f3e8ff', fg: '#6b21a8' },
    paid: { bg: '#dcfce7', fg: '#166534' },
    partial: { bg: '#dbeafe', fg: '#1d4ed8' },
    overdue: { bg: '#fee2e2', fg: '#991b1b' },
  };
  const s = map[status ?? ''] ?? { bg: '#f3f4f6', fg: '#374151' };
  return {
    display: 'inline-block',
    background: s.bg,
    color: s.fg,
    padding: '1px 8px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };
}

// ── Component ────────────────────────────────────────────────────────────────
export function PayReceiptA4({ payment, copyLabel, orderItems, orderSummary }: PayReceiptA4Props) {
  const tenant = payment.tenant as any;
  const order = (payment.salesOrder ?? payment.posOrder) as any;
  const customer = order?.customer;

  // Reference (invoice #) — what the customer / cashier will look up later
  const invoiceNumber =
    order?.invoice_number ?? order?.order_number
    ?? (payment.sales_order_id ? `SO #${payment.sales_order_id}` : null)
    ?? (payment.pos_order_id ? `POS #${payment.pos_order_id}` : null)
    ?? '—';

  const customerName = customer?.name ?? order?.customer_name ?? 'Walk-in Customer';
  const customerPhone = customer?.phone ?? order?.customer_phone;
  const customerEmail = customer?.email;
  const customerAddr = customer?.address;

  // Line items (use what PrintMenu loaded, else an empty list)
  const items: PrintOrderItem[] = orderItems ?? [];
  const hasItems = items.length > 0;

  // Items subtotal — derive from rows if summary missing
  const itemsSubtotal = hasItems
    ? items.reduce((s, it) => s + Number(it.line_total ?? (Number(it.quantity) * Number(it.unit_price) - Number(it.discount ?? 0))), 0)
    : Number(orderSummary?.sub_total ?? 0);

  // Summary fields — prefer orderSummary (from PrintMenu), fall back to order,
  // then to the payment's own totals so the receipt is never blank.
  const subTotal = Number(orderSummary?.sub_total ?? order?.sub_total ?? itemsSubtotal);
  const discAmt = Number(orderSummary?.discount_amount ?? order?.discount_amount ?? 0);
  const discType = orderSummary?.discount_type ?? order?.discount_type ?? null;
  const discValue = Number(orderSummary?.discount_value ?? order?.discount_value ?? 0);
  const taxAmt = Number(orderSummary?.tax_amount ?? order?.tax_amount ?? payment.tax_amount ?? 0);
  const grandTotal = Number(orderSummary?.grand_total ?? order?.grand_total ?? payment.total_amount);
  const paidAmount = Number(order?.paid_amount ?? payment.total_amount ?? 0);
  const returned = Number(order?.returned_amount ?? 0);

  // Balance — same math as sales-order details modal (no badge text rendered)
  const balance = grandTotal - paidAmount;
  const paymentStatus = order?.payment_status ?? payment.status ?? 'pending';

  return (
    <div
      className="invoice-content"
      style={{
        fontFamily: FONT,
        fontSize: 11,
        color: C.ink,
        background: C.bg,
        lineHeight: 1.4,
      }}
    >
      {/* ── Header (flat, neutral — no dark blue) ────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: 8,
          borderBottom: `1.5px solid ${C.ink}`,
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1, color: C.ink }}>
            {payment.receipt_number ?? invoiceNumber}
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Payment Receipt
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {tenant?.logo_url && (
            <img
              src={tenant.logo_url}
              alt={tenant?.business_name ?? 'logo'}
              style={{ maxHeight: 32, maxWidth: 110, objectFit: 'contain', marginLeft: 'auto', marginBottom: 4 }}
            />
          )}
          <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {tenant?.business_name ?? 'Your Company'}
          </div>
          <div style={{ fontSize: 9, color: C.muted, lineHeight: 1.5, marginTop: 2 }}>
            {tenant?.address && <div>{tenant.address}</div>}
            {(tenant?.city || tenant?.country) && <div>{[tenant?.city, tenant?.country].filter(Boolean).join(', ')}</div>}
            {tenant?.phone && <div>Tel: {tenant.phone}</div>}
            {tenant?.email && <div>{tenant.email}</div>}
          </div>
        </div>
      </div>

      {/* ── Copy stamp (when thermal copy label is set) ─────────────── */}
      {copyLabel && (
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span
            style={{
              display: 'inline-block',
              border: `1px solid ${C.ink}`,
              padding: '2px 10px',
              fontWeight: 700,
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {COPY_LABEL_TEXT[copyLabel]}
          </span>
        </div>
      )}

      {/* ── Customer + Payment info (compact, no card backgrounds) ────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
            Bill To
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>{customerName}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>
            {customerPhone && <div>{customerPhone}</div>}
            {customerEmail && <div>{customerEmail}</div>}
            {customerAddr && <div>{customerAddr}</div>}
            {!customerPhone && !customerEmail && !customerAddr && <div>—</div>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, rowGap: 2, fontSize: 10 }}>
          <span style={{ color: C.muted }}>Invoice #</span>
          <span style={{ fontWeight: 600, color: C.ink, textAlign: 'right' }}>{invoiceNumber}</span>

          <span style={{ color: C.muted }}>Date</span>
          <span style={{ fontWeight: 600, color: C.ink, textAlign: 'right' }}>{fmtDateTime(payment.payment_date)}</span>

          <span style={{ color: C.muted }}>Method</span>
          <span style={{ fontWeight: 600, color: C.ink, textAlign: 'right', textTransform: 'capitalize' }}>
            {(payment.payment_method ?? '—').replace(/_/g, ' ')}
          </span>

          <span style={{ color: C.muted }}>Status</span>
          <span style={{ textAlign: 'right' }}>
            <span style={statusStyle(paymentStatus)}>{paymentStatus}</span>
          </span>
        </div>
      </div>

      {/* ── Items table + Summary side-by-side (mirrors sales modal) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 14, marginBottom: 10 }}>
        {/* Items table (no discount / tax columns) */}
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle({ width: '2em', textAlign: 'center' })}>#</th>
                <th style={thStyle({ textAlign: 'left' })}>Product</th>
                <th style={thStyle({ textAlign: 'center', width: '3em' })}>Qty</th>
                <th style={thStyle({ textAlign: 'right', width: '5em' })}>Unit Price</th>
                <th style={thStyle({ textAlign: 'right', width: '5em' })}>Total</th>
              </tr>
            </thead>
            <tbody>
              {hasItems ? (
                items.map((it, idx) => {
                  const rowBg = idx % 2 === 0 ? C.bg : C.rowAlt;
                  return (
                    <tr key={it.id ?? idx} style={{ background: rowBg }}>
                      <td style={tdStyle({ textAlign: 'center', color: C.muted, background: rowBg, fontSize: 10 })}>{idx + 1}</td>
                      <td style={tdStyle({ background: rowBg })}>
                        <div style={{ fontWeight: 600, color: C.ink }}>{it.name}</div>
                        {it.variant && <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>{it.variant}</div>}
                        {it.sku && <div style={{ fontSize: 9, color: C.muted, fontFamily: 'monospace', marginTop: 1 }}>SKU: {it.sku}</div>}
                      </td>
                      <td style={tdStyle({ textAlign: 'center', fontVariantNumeric: 'tabular-nums', background: rowBg })}>{it.quantity}</td>
                      <td style={tdStyle({ textAlign: 'right', fontVariantNumeric: 'tabular-nums', background: rowBg })}>{fmt(it.unit_price)}</td>
                      <td style={tdStyle({ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', background: rowBg })}>
                        {fmt(it.line_total)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '16px 8px', textAlign: 'center', color: C.muted, fontSize: 11 }}>
                    Line item details are not available for this payment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary box — same font size as the rows, no dark band */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: 8, background: C.sumBg }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 0', color: C.muted, fontSize: 11 }}>Subtotal</td>
                <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 600, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(subTotal)}
                </td>
              </tr>
              {discAmt > 0 && (
                <tr>
                  <td style={{ padding: '3px 0', color: C.muted, fontSize: 11 }}>
                    Discount{discType === 'percent' && discValue ? ` (${discValue}%)` : ''}
                  </td>
                  <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 600, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                    − {fmt(discAmt)}
                  </td>
                </tr>
              )}
              {taxAmt > 0 && (
                <tr>
                  <td style={{ padding: '3px 0', color: C.muted, fontSize: 11 }}>Tax</td>
                  <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 600, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                    + {fmt(taxAmt)}
                  </td>
                </tr>
              )}
              {returned > 0 && (
                <tr>
                  <td style={{ padding: '3px 0', color: C.muted, fontSize: 11 }}>Refund</td>
                  <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 600, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                    − {fmt(returned)}
                  </td>
                </tr>
              )}
              {/* Grand total — same font size as the rows, only separated by a line */}
              <tr>
                <td colSpan={2} style={{ padding: 0 }}>
                  <div style={{ borderTop: `1px solid ${C.ink}`, margin: '4px 0' }} />
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0', color: C.ink, fontWeight: 700, fontSize: 11 }}>Grand Total</td>
                <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 700, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(grandTotal)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0', color: C.muted, fontSize: 11 }}>Paid</td>
                <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 600, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(paidAmount)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ padding: 0 }}>
                  <div style={{ borderTop: `1px solid ${C.borderDk}`, margin: '4px 0' }} />
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0', color: C.ink, fontWeight: 700, fontSize: 11 }}>Balance</td>
                <td style={{
                  padding: '3px 0',
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: 11,
                  fontVariantNumeric: 'tabular-nums',
                  color: balance > 0.005 ? C.red : balance < -0.005 ? C.green : C.ink,
                }}>
                  {fmt(Math.abs(balance))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Payment method details + notes (2-col, no card backgrounds) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
            Payment Details
          </div>
          <div style={{ fontSize: 10, color: C.ink, lineHeight: 1.6 }}>
            {payment.transaction_id && <div>Txn ID &nbsp; <strong>{payment.transaction_id}</strong></div>}
            {payment.bank_name && <div>Bank &nbsp;&nbsp;&nbsp; <strong>{payment.bank_name}</strong></div>}
            {payment.bank_account && <div>Account <strong>{payment.bank_account}</strong></div>}
            {payment.card_last_four && <div>Card &nbsp;&nbsp;&nbsp; <span style={{ fontFamily: 'monospace' }}>**** {payment.card_last_four}</span></div>}
            {payment.check_number && <div>Cheque # <strong>{payment.check_number}</strong></div>}
            {payment.mobile_number && <div>Mobile <strong>{payment.mobile_number}</strong></div>}
            {payment.tendered_amount != null && Number(payment.tendered_amount) > 0 && (
              <div>Tendered <strong>{fmt(payment.tendered_amount)}</strong></div>
            )}
            {payment.change_amount != null && Number(payment.change_amount) > 0 && (
              <div>Change &nbsp; <strong>{fmt(payment.change_amount)}</strong></div>
            )}
            {!payment.transaction_id && !payment.bank_name && !payment.bank_account &&
              !payment.card_last_four && !payment.check_number && !payment.mobile_number &&
              (payment.tendered_amount == null || Number(payment.tendered_amount) <= 0) && (
                <div style={{ color: C.muted }}>—</div>
              )}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
            Notes
          </div>
          <div style={{ fontSize: 10, color: C.ink, lineHeight: 1.5 }}>
            {payment.notes ? payment.notes : <span style={{ color: C.muted }}>—</span>}
          </div>
        </div>
      </div>

      {/* ── Footer (compact) ─────────────────────────────────────────── */}
      <div
        style={{
          borderTop: `1px solid ${C.border}`,
          paddingTop: 6,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 9, color: C.muted, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, color: C.ink }}>Thank you for your purchase!</div>
          <div>Please retain this receipt for your records.</div>
          {(payment.creator || payment.approver) && (
            <div style={{ marginTop: 4 }}>
              {(payment.creator as any)?.name && <>Recorded by: <strong style={{ color: C.ink }}>{(payment.creator as any).name}</strong></>}
              {(payment.creator as any)?.name && (payment.approver as any)?.name && <span> &nbsp;·&nbsp; </span>}
              {(payment.approver as any)?.name && <>Approved by: <strong style={{ color: C.ink }}>{(payment.approver as any).name}</strong></>}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', minWidth: 130 }}>
          <div style={{ width: 130, height: 24, borderBottom: `1px solid ${C.ink}`, margin: '0 auto 3px' }} />
          <div style={{ fontSize: 9, fontWeight: 700, color: C.ink }}>Authorised By</div>
          <div style={{ fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Administrator</div>
        </div>
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 8,
          color: C.muted,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{tenant?.business_name ?? 'Your Company'}</span>
        <span>Printed: {new Date().toLocaleString()}</span>
      </div>
    </div>
  );
}
