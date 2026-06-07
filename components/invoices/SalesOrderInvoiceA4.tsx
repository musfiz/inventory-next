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

// ── Inline-style palette (mirrors PayReceiptA4) ───────────────────────────────
const C = {
  ink: '#1a1a2e',
  muted: '#6b7280',
  border: '#e5e7eb',
  borderDk: '#d1d5db',
  bg: '#ffffff',
  rowAlt: '#f8fafc',
  sumBg: '#f3f4f6',
};
const FONT = "'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif";

// ── Component ─────────────────────────────────────────────────────────────────

export type PosInvoiceCopyLabel = 'customer' | 'merchant' | 'duplicate';

export interface SalesOrderInvoiceA4Props {
  /** Full sales order object from `salesOrderService.getSalesOrder(uuid)`. */
  order: any;
  /** Optional copy stamp printed at the top. */
  copyLabel?: PosInvoiceCopyLabel | null;
}

/**
 * Sales Order Tax Invoice — A4 professional layout.
 *
 * 100% INLINE STYLES — this component is copied via `innerHTML` into a
 * print window that does NOT have Tailwind, so every visual must be
 * expressed as inline CSS. This matches the pattern used by
 * `PayReceiptA4.tsx`.
 *
 * Sections:
 *  A) Copy stamp
 *  B) Tenant / store header
 *  C) "Tax Invoice" title + meta (Invoice #, dates, status)
 *  D) Bill To / Sold By parties
 *  E) Items table with dotted leaders
 *  F) Financial summary
 *  G) Payment history table (every Payment row for this SO)
 *  H) Footer (return policy, QR, signature, brand)
 */
export function SalesOrderInvoiceA4({ order, copyLabel }: SalesOrderInvoiceA4Props) {
  const tenant = (order?.tenant ?? order?.warehouse?.tenant ?? null) as any;
  const customer = order?.customer;
  const items = order?.items ?? [];
  const payments: any[] = order?.payments ?? [];
  const returns: any[] = order?.returns ?? [];

  const invoiceNo = order?.invoice_number ?? order?.order_number ?? `#${order?.id}`;
  const orderDate = order?.order_date ?? order?.created_at;
  const dueDate = order?.due_date;

  const subTotal = Number(order?.sub_total ?? 0);
  const discAmt = Number(order?.discount_amount ?? 0);
  const discType = order?.discount_type;
  const discValue = Number(order?.discount_value ?? 0);
  const taxAmt = Number(order?.tax_amount ?? 0);
  const shippingAmt = Number(order?.shipping_charge ?? 0);
  const rounding = Number(order?.rounding_adjustment ?? 0);
  const grandTotal = Number(order?.grand_total ?? 0);
  const paidAmount = Number(order?.paid_amount ?? 0);
  const returnedAmount = Number(order?.returned_amount ?? 0);
  const dueAmount = Number(
    order?.due_amount ?? Math.max(0, grandTotal - paidAmount)
  );

  const printedAt = fmtDateTime(new Date().toISOString());
  const qrSrc = buildQrUrl(invoiceNo, grandTotal);
  const net = Math.max(0, grandTotal - returnedAmount);
  const balanceText =
    dueAmount > 0 ? 'Amount Due' : dueAmount < 0 ? 'Customer Return' : 'Settled';

  // ── Sub-components (inline styles only) ──────────────────────────────────
  const thCell = (extra?: React.CSSProperties): React.CSSProperties => ({
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
  const tdCell = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '5px 8px',
    fontSize: 11,
    color: C.ink,
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: 'middle',
    ...extra,
  });

  return (
    <div
      className="invoice-content"
      style={{
        fontFamily: FONT,
        fontSize: 12,
        lineHeight: 1.4,
        color: C.ink,
        background: C.bg,
      }}
    >
      {/* ── Copy stamp ──────────────────────────────────────────────── */}
      {copyLabel && (
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span
            style={{
              display: 'inline-block',
              border: `2px solid ${C.ink}`,
              padding: '4px 16px',
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              transform: copyLabel === 'merchant' ? 'rotate(-3deg)' : undefined,
            }}
          >
            {copyLabel === 'customer'
              ? 'Customer Copy'
              : copyLabel === 'merchant'
                ? 'Merchant Copy'
                : 'Duplicate'}
          </span>
        </div>
      )}

      {/* ── HEADER  (brand left, doc-type right) ─────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: 8,
          borderBottom: `1.5px solid ${C.ink}`,
          marginBottom: 10,
          gap: 16,
        }}
      >
        {/* Brand block */}
        <div style={{ maxWidth: '60mm' }}>
          {tenant?.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant?.business_name ?? 'Logo'}
              style={{
                display: 'block',
                maxHeight: '20mm',
                maxWidth: '50mm',
                objectFit: 'contain',
                marginBottom: 4,
              }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 64,
                border: `1px dashed ${C.borderDk}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.muted,
                fontSize: 11,
                marginBottom: 4,
              }}
            >
              LOGO
            </div>
          )}
          {tenant?.business_name && (
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                lineHeight: 1.1,
                color: C.ink,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              {tenant.business_name}
            </div>
          )}
          {tenant?.tagline && (
            <div
              style={{
                fontSize: 10,
                color: C.muted,
                fontStyle: 'italic',
                marginTop: 2,
              }}
            >
              {tenant.tagline}
            </div>
          )}
          <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4, lineHeight: 1.5 }}>
            {tenant?.address && <div>{tenant.address}</div>}
            {(tenant?.city || tenant?.country) && (
              <div>{[tenant?.city, tenant?.country].filter(Boolean).join(', ')}</div>
            )}
            {tenant?.phone && <div>Tel: {tenant.phone}</div>}
            {tenant?.email && <div>Email: {tenant.email}</div>}
            {(tenant?.tin_number || tenant?.bin_number || tenant?.vat_number) && (
              <div style={{ marginTop: 2 }}>
                {tenant?.tin_number && <span>TIN: {tenant.tin_number}</span>}
                {tenant?.bin_number && <span> &nbsp;·&nbsp; BIN: {tenant.bin_number}</span>}
                {tenant?.vat_number && <span> &nbsp;·&nbsp; VAT: {tenant.vat_number}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Document meta card */}
        <div style={{ textAlign: 'right', minWidth: '62mm' }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              color: C.ink,
              lineHeight: 1.05,
              marginBottom: 8,
            }}
          >
            Tax Invoice
          </div>
          <table style={{ fontSize: 10, marginLeft: 'auto', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ color: C.muted, paddingRight: 12, textAlign: 'right' }}>Invoice No</td>
                <td style={{ fontWeight: 700, textAlign: 'right' }}>{invoiceNo}</td>
              </tr>
              {order?.order_number && order.order_number !== invoiceNo && (
                <tr>
                  <td style={{ color: C.muted, paddingRight: 12, textAlign: 'right' }}>Order No</td>
                  <td style={{ textAlign: 'right' }}>{order.order_number}</td>
                </tr>
              )}
              <tr>
                <td style={{ color: C.muted, paddingRight: 12, textAlign: 'right' }}>Order Date</td>
                <td style={{ textAlign: 'right' }}>{fmtDate(orderDate)}</td>
              </tr>
              {dueDate && (
                <tr>
                  <td style={{ color: C.muted, paddingRight: 12, textAlign: 'right' }}>Due Date</td>
                  <td style={{ textAlign: 'right' }}>{fmtDate(dueDate)}</td>
                </tr>
              )}
              <tr>
                <td style={{ color: C.muted, paddingRight: 12, textAlign: 'right' }}>Status</td>
                <td style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      background: '#1a1a2e',
                      color: '#fff',
                      padding: '1px 8px',
                      borderRadius: 999,
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {order?.status ?? '-'}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ color: C.muted, paddingRight: 12, textAlign: 'right' }}>Payment</td>
                <td style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      background:
                        order?.payment_status === 'paid'
                          ? '#059669'
                          : order?.payment_status === 'partial'
                            ? '#f59e0b'
                            : '#dc2626',
                      color: '#fff',
                      padding: '1px 8px',
                      borderRadius: 999,
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {order?.payment_status ?? 'pending'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PARTIES  (Bill To / Sold By) ──────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: 10 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: C.muted,
              borderBottom: `1px solid ${C.border}`,
              paddingBottom: 4,
              marginBottom: 6,
            }}
          >
            Bill To
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>
            {customer?.name ?? '-'}
          </div>
          <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4, lineHeight: 1.6 }}>
            {customer?.phone && <div>Tel: {customer.phone}</div>}
            {customer?.email && <div>Email: {customer.email}</div>}
            {customer?.address && <div>{customer.address}</div>}
          </div>
        </div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: 10 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: C.muted,
              borderBottom: `1px solid ${C.border}`,
              paddingBottom: 4,
              marginBottom: 6,
            }}
          >
            Sold By / Branch
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>
            {tenant?.business_name ?? order?.warehouse?.name ?? 'Main Branch'}
          </div>
          <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4, lineHeight: 1.6 }}>
            {order?.warehouse?.name && <div>Warehouse: {order.warehouse.name}</div>}
            {tenant?.address && <div>{tenant.address}</div>}
            {tenant?.phone && <div>Tel: {tenant.phone}</div>}
          </div>
        </div>
      </div>

      {/* ── ITEMS TABLE  (7-col with dotted leaders) ──────────────── */}
      <div
        style={{
          marginBottom: 12,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'auto 1fr auto auto auto auto auto',
            columnGap: '4mm',
            alignItems: 'center',
            padding: '6px 10px',
            background: '#1a1a2e',
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            minHeight: '4mm',
          }}
        >
          <span style={{ width: '14px' }}>#</span>
          <span>Item</span>
          <span style={{ textAlign: 'center', minWidth: '10mm' }}>Qty</span>
          <span style={{ textAlign: 'right', minWidth: '16mm' }}>Price</span>
          <span style={{ textAlign: 'right', minWidth: '14mm' }}>Disc</span>
          <span style={{ textAlign: 'right', minWidth: '10mm' }}>Tax%</span>
          <span style={{ textAlign: 'right', minWidth: '18mm' }}>Total</span>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.muted, padding: 12, fontSize: 11 }}>
            No items found
          </div>
        ) : (
          items.map((it: any, idx: number) => {
            const qty = Math.abs(
              Number(it.quantity ?? it.quantity_ordered ?? 0)
            );
            const price = Number(it.unit_price ?? it.unit_cost ?? 0);
            const disc = Number(it.discount ?? it.discount_amount ?? 0);
            const taxRate = Number(it.tax_rate ?? 0);
            const lineTot = Number(it.line_total ?? qty * price - disc);
            return (
              <div
                key={it.id ?? idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'auto 1fr auto auto auto auto auto',
                  columnGap: '4mm',
                  alignItems: 'center',
                  padding: '5px 10px',
                  fontSize: 10,
                  background: idx % 2 === 1 ? C.rowAlt : '#fff',
                  borderBottom:
                    idx === items.length - 1
                      ? 'none'
                      : `1px dotted ${C.border}`,
                }}
              >
                <span
                  style={{
                    color: C.muted,
                    fontWeight: 600,
                    fontSize: 10,
                    width: '14px',
                  }}
                >
                  {idx + 1}
                </span>

                <span style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 500,
                      color: C.ink,
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                    }}
                  >
                    {it.product?.name ?? it.item_name ?? it.name ?? '-'}
                  </div>
                  {it.variation?.name && (
                    <div
                      style={{
                        color: C.muted,
                        fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                        fontSize: 9,
                        marginTop: 1,
                      }}
                    >
                      {it.variation.name}
                    </div>
                  )}
                </span>

                <span
                  style={{
                    textAlign: 'center',
                    padding: '0 1mm',
                    fontVariantNumeric: 'tabular-nums',
                    color: '#4b5563',
                    borderBottom: '1px dotted #9ca3af',
                    minWidth: '10mm',
                  }}
                >
                  {qty}
                </span>

                <span
                  style={{
                    textAlign: 'right',
                    padding: '0 1mm',
                    fontVariantNumeric: 'tabular-nums',
                    color: '#4b5563',
                    borderBottom: '1px dotted #9ca3af',
                    minWidth: '16mm',
                  }}
                >
                  {fmt(price)}
                </span>

                <span
                  style={{
                    textAlign: 'right',
                    padding: '0 1mm',
                    fontVariantNumeric: 'tabular-nums',
                    color: '#4b5563',
                    borderBottom: '1px dotted #9ca3af',
                    minWidth: '14mm',
                  }}
                >
                  {disc > 0 ? fmt(disc) : '—'}
                </span>

                <span
                  style={{
                    textAlign: 'right',
                    padding: '0 1mm',
                    fontVariantNumeric: 'tabular-nums',
                    color: '#4b5563',
                    borderBottom: '1px dotted #9ca3af',
                    minWidth: '10mm',
                  }}
                >
                  {taxRate > 0 ? `${taxRate}%` : '—'}
                </span>

                <span
                  style={{
                    textAlign: 'right',
                    padding: '0 1mm',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: '#111827',
                    fontSize: 10,
                    whiteSpace: 'nowrap',
                    minWidth: '18mm',
                  }}
                >
                  {fmt(lineTot)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* ── SUMMARY GRID  (Terms left, Totals right) ───────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 14,
          marginBottom: 14,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.6 }}>
          {order?.notes && (
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontWeight: 700,
                  color: C.ink,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontSize: 9,
                  marginBottom: 2,
                }}
              >
                Notes
              </div>
              <div>{order.notes}</div>
            </div>
          )}
          <div>
            <div
              style={{
                fontWeight: 700,
                color: C.ink,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontSize: 9,
                marginBottom: 2,
              }}
            >
              Terms &amp; Conditions
            </div>
            <div style={{ color: C.muted }}>
              Goods once sold are not returnable without a valid receipt.
              <br />
              Warranty terms apply as per the manufacturer.
              <br />
              Payments are non-refundable once processed.
            </div>
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            padding: 12,
          }}
        >
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ ...tdCell({ color: C.muted }) }}>Subtotal</td>
                <td style={{ ...tdCell({ textAlign: 'right', fontFamily: 'ui-monospace, monospace' }) }}>
                  {fmt(subTotal)}
                </td>
              </tr>
              {discAmt > 0 && (
                <tr>
                  <td style={{ ...tdCell({ color: C.muted }) }}>
                    Discount
                    {discType === 'percentage' && discValue > 0
                      ? ` (${discValue}%)`
                      : ''}
                  </td>
                  <td
                    style={{
                      ...tdCell({ textAlign: 'right', fontFamily: 'ui-monospace, monospace', color: '#d97706' }),
                    }}
                  >
                    − {fmt(discAmt)}
                  </td>
                </tr>
              )}
              {(taxAmt + shippingAmt) > 0 && (
                <tr>
                  <td style={{ ...tdCell({ color: C.muted }) }}>Tax + Shipping</td>
                  <td style={{ ...tdCell({ textAlign: 'right', fontFamily: 'ui-monospace, monospace' }) }}>
                    + {fmt(taxAmt + shippingAmt)}
                  </td>
                </tr>
              )}
              {rounding !== 0 && (
                <tr>
                  <td style={{ ...tdCell({ color: C.muted }) }}>Rounding</td>
                  <td style={{ ...tdCell({ textAlign: 'right', fontFamily: 'ui-monospace, monospace' }) }}>
                    {rounding > 0 ? '+' : ''}
                    {fmt(rounding)}
                  </td>
                </tr>
              )}
              <tr>
                <td
                  style={{
                    ...tdCell({
                      borderTop: '2px solid #1a1a2e',
                      borderBottom: '2px solid #1a1a2e',
                      fontWeight: 900,
                      color: C.ink,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '6px 8px',
                    }),
                  }}
                >
                  Grand Total
                </td>
                <td
                  style={{
                    ...tdCell({
                      borderTop: '2px solid #1a1a2e',
                      borderBottom: '2px solid #1a1a2e',
                      textAlign: 'right',
                      fontWeight: 900,
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: 13,
                      padding: '6px 8px',
                    }),
                  }}
                >
                  {fmt(grandTotal)}
                </td>
              </tr>
              {returnedAmount > 0 && (
                <>
                  <tr>
                    <td
                      style={{
                        ...tdCell({ color: '#ea580c', fontWeight: 600 }),
                      }}
                    >
                      Returns ({returns.length})
                    </td>
                    <td
                      style={{
                        ...tdCell({
                          textAlign: 'right',
                          fontFamily: 'ui-monospace, monospace',
                          color: '#ea580c',
                        }),
                      }}
                    >
                      − {fmt(returnedAmount)}
                    </td>
                  </tr>
                  <tr style={{ background: '#eef2ff' }}>
                    <td
                      style={{
                        ...tdCell({
                          color: '#4338ca',
                          fontWeight: 600,
                          fontSize: 10,
                        }),
                      }}
                    >
                      Net Total
                    </td>
                    <td
                      style={{
                        ...tdCell({
                          textAlign: 'right',
                          fontFamily: 'ui-monospace, monospace',
                          fontWeight: 700,
                          color: '#3730a3',
                        }),
                      }}
                    >
                      {fmt(net)}
                    </td>
                  </tr>
                </>
              )}
              <tr>
                <td
                  style={{
                    ...tdCell({ color: '#059669', fontWeight: 600 }),
                  }}
                >
                  Paid
                </td>
                <td
                  style={{
                    ...tdCell({
                      textAlign: 'right',
                      fontFamily: 'ui-monospace, monospace',
                      fontWeight: 700,
                      color: '#047857',
                    }),
                  }}
                >
                  {fmt(paidAmount)}
                </td>
              </tr>
              <tr
                style={{
                  background:
                    dueAmount > 0
                      ? '#fef2f2'
                      : dueAmount < 0
                        ? '#ecfdf5'
                        : '#f3f4f6',
                }}
              >
                <td
                  style={{
                    ...tdCell({
                      fontWeight: 800,
                      color: '#374151',
                      padding: '6px 8px',
                    }),
                  }}
                >
                  Balance Due
                </td>
                <td
                  style={{
                    ...tdCell({
                      textAlign: 'right',
                      fontFamily: 'ui-monospace, monospace',
                      fontWeight: 800,
                      fontSize: 12,
                      color:
                        dueAmount > 0
                          ? '#dc2626'
                          : dueAmount < 0
                            ? '#059669'
                            : '#6b7280',
                      padding: '6px 8px',
                    }),
                  }}
                >
                  <span style={{ marginRight: 6 }}>{fmt(Math.abs(dueAmount))}</span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {balanceText}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PAYMENT HISTORY  (full) ─────────────────────────────── */}
      {payments.length > 0 && (
        <div
          style={{
            marginBottom: 14,
            border: '1px solid #d1fae5',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: '#ecfdf5',
              padding: '6px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#047857',
                margin: 0,
              }}
            >
              Payment History ({payments.length})
            </p>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#065f46',
                margin: 0,
              }}
            >
              Total Received: ৳{fmt(
                payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
              )}
            </p>
          </div>
          <table
            style={{
              width: '100%',
              fontSize: 10,
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr style={{ background: '#d1fae5' }}>
                <th style={thCell({ width: 18, textAlign: 'center' })}>#</th>
                <th style={thCell()}>Receipt #</th>
                <th style={thCell()}>Date</th>
                <th style={thCell()}>Method</th>
                <th style={thCell({ textAlign: 'right' })}>Amount</th>
                <th style={thCell()}>Status</th>
                <th style={thCell()}>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any, pi: number) => (
                <tr key={p.id ?? pi} style={{ background: '#fff' }}>
                  <td style={{ ...tdCell({ color: C.muted, textAlign: 'center' }) }}>{pi + 1}</td>
                  <td
                    style={{
                      ...tdCell({
                        fontFamily: 'ui-monospace, monospace',
                        fontWeight: 700,
                        color: '#047857',
                      }),
                    }}
                  >
                    {p.receipt_number ?? '-'}
                  </td>
                  <td style={{ ...tdCell({ color: '#4b5563' }) }}>
                    {p.payment_date
                      ? new Date(p.payment_date).toLocaleDateString()
                      : '-'}
                  </td>
                  <td
                    style={{
                      ...tdCell({
                        color: '#374151',
                        textTransform: 'capitalize',
                      }),
                    }}
                  >
                    {String(p.payment_method ?? '-').replace(/_/g, ' ')}
                  </td>
                  <td
                    style={{
                      ...tdCell({
                        textAlign: 'right',
                        fontFamily: 'ui-monospace, monospace',
                        fontWeight: 700,
                        color: '#065f46',
                      }),
                    }}
                  >
                    ৳{fmt(p.amount)}
                  </td>
                  <td style={{ ...tdCell() }}>
                    <span
                      style={{
                        display: 'inline-block',
                        background:
                          p.status === 'completed'
                            ? '#d1fae5'
                            : p.status === 'pending'
                              ? '#fef3c7'
                              : p.status === 'failed'
                                ? '#fee2e2'
                                : '#f3f4f6',
                        color:
                          p.status === 'completed'
                            ? '#065f46'
                            : p.status === 'pending'
                              ? '#92400e'
                              : p.status === 'failed'
                                ? '#991b1b'
                                : '#374151',
                        padding: '1px 8px',
                        borderRadius: 999,
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {p.status ?? '-'}
                    </span>
                  </td>
                  <td style={{ ...tdCell({ color: '#4b5563' }) }}>
                    {p.creator?.name ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── FOOTER  (policy left, QR centre, signature right) ─────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderTop: `1px solid ${C.border}`,
          paddingTop: 10,
          marginTop: 6,
          gap: 12,
        }}
      >
        <div style={{ fontSize: 10, color: C.muted, maxWidth: '95mm', lineHeight: 1.6 }}>
          <div
            style={{
              fontWeight: 700,
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontSize: 9,
              marginBottom: 2,
            }}
          >
            Return Policy
          </div>
          Returns accepted within 7 days with original receipt.
          <br />
          No refund on discounted or already-opened items.
          <br />
          Items once sold cannot be exchanged without a valid receipt.
          {(tenant?.phone || tenant?.email) && (
            <div style={{ marginTop: 4 }}>
              {tenant?.phone && (
                <span>
                  <strong>Helpline:</strong> {tenant.phone}
                </span>
              )}
              {tenant?.phone && tenant?.email && <span> &nbsp;·&nbsp; </span>}
              {tenant?.email && (
                <span>
                  <strong>Email:</strong> {tenant.email}
                </span>
              )}
            </div>
          )}
          <div style={{ marginTop: 4, fontSize: 9 }}>
            Powered by Inventory POS · v1.0 · Printed: {printedAt}
          </div>
        </div>

        {qrSrc && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              margin: '0 8px',
            }}
          >
            <img
              src={qrSrc}
              alt={`QR for ${invoiceNo}`}
              width={72}
              height={72}
              crossOrigin="anonymous"
            />
            <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>
              Scan to verify · {invoiceNo}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              width: '44mm',
              borderBottom: `1.5px solid ${C.ink}`,
              height: 16,
              marginBottom: 2,
            }}
          />
          <div style={{ fontSize: 10, color: C.muted }}>Authorised Signature</div>
          {tenant?.business_name && (
            <div style={{ fontSize: 9, color: '#9ca3af' }}>{tenant.business_name}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SalesOrderInvoiceA4;
