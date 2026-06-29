import type { PosOrderDetail } from '@/types/api.types';
import { buildQrUrl } from './shared';

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

// ── Component ─────────────────────────────────────────────────────────────────

export type PosInvoicePaperWidth = '58mm' | '80mm';
export type PosInvoiceCopyLabel = 'customer' | 'merchant' | 'duplicate';

export interface SalesOrderInvoiceThermalProps {
  /** Full sales order object from `salesOrderService.getSalesOrder(uuid)`. */
  order: any;
  /**
   * Paper width.
   *  '80mm' — standard retail POS slip (Epson TM-T88 / Star TSP). Default.
   *  '58mm' — compact slip (Bixolon SRP-350 / Star mPOP).
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

/**
 * Sales Order Tax Invoice — Thermal (80mm / 58mm POS slip).
 *
 * Industrial-standard design with full payment history in compact form.
 * Single source of truth, prints from the Sales Orders page via
 * `SalesOrderPrintMenu`.
 *
 * Sections:
 *  A) Copy stamp
 *  B) Tenant header
 *  C) Document title + meta (Invoice #, dates, status)
 *  D) Reference block (customer, warehouse)
 *  E) Items table (Qty center, Price/Total right, dotted leaders)
 *  F) Financial summary (subtotal, discount, tax, shipping, returns, net, paid, due)
 *  G) Payment history (one line per receipt, dotted leader)
 *  H) QR + footer
 */
export function SalesOrderInvoiceThermal({
  order,
  width = '80mm',
  copyLabel,
}: SalesOrderInvoiceThermalProps) {
  const is58 = width === '58mm';
  const qrSize = is58 ? 72 : 88;

  const tenant = (order?.tenant ?? order?.warehouse?.tenant ?? null) as any;
  const customer = order?.customer;
  const items = order?.items ?? [];
  const payments: any[] = order?.payments ?? [];
  const returns: any[] = order?.returns ?? [];

  const invoiceNo = order?.invoice_number ?? order?.order_number ?? `#${order?.id}`;
  const customerName = customer?.name ?? 'Walk-in Customer';
  const customerPhone = customer?.phone;

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

  const qrSrc = buildQrUrl(invoiceNo, grandTotal);

  const monoFont =
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace';

  // Rule helpers
  const RuleDashed = () => (
    <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
  );
  const RuleDotted = () => (
    <div style={{ borderTop: '1px dotted #000', margin: '2mm 0' }} />
  );
  const RuleDouble = () => (
    <div style={{ borderTop: '3px double #000', margin: '2mm 0' }} />
  );

  return (
    <div
      className="pos-invoice-content"
      style={{
        width,
        maxWidth: width,
        minWidth: width,
        background: '#fff',
        color: '#000',
        margin: '0 auto',
        padding: is58 ? '3mm' : '4mm 5mm',
        fontFamily: monoFont,
        fontSize: is58 ? '11px' : '12px',
        lineHeight: 1.42,
        WebkitFontSmoothing: 'antialiased',
        textRendering: 'geometricPrecision',
      }}
    >
      {/* ═══════════════════════════════════════════════
          A) COPY STAMP
          ═══════════════════════════════════════════════ */}
      {copyLabel && (
        <div style={{ textAlign: 'center', margin: '0 0 2mm' }}>
          <span
            style={{
              display: 'inline-block',
              border: '2px solid #000',
              padding: '0.6mm 3mm',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontSize: '0.82em',
              transform:
                copyLabel === 'merchant' ? 'rotate(-3deg)' : undefined,
            }}
          >
            {COPY_LABEL[copyLabel]}
          </span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          B) TENANT HEADER
          ═══════════════════════════════════════════════ */}
      <header style={{ textAlign: 'center', margin: '0 0 2mm' }}>
        {tenant?.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={tenant?.business_name ?? 'Logo'}
            className="object-contain"
            style={{
              display: 'block',
              margin: '0 auto 2mm',
              maxHeight: '14mm',
              maxWidth: '28mm',
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '0 auto 2mm',
              width: '22mm',
              height: '22mm',
              border: '1px dashed #000',
              fontSize: '9px',
              color: '#4a4a4a',
              letterSpacing: '0.18em',
            }}
          >
            LOGO
          </div>
        )}
        {tenant?.business_name && (
          <div
            style={{
              fontSize: '1.35em',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: 1.1,
              margin: '1mm 0 0.5mm',
            }}
          >
            {tenant.business_name}
          </div>
        )}
        {tenant?.tagline && (
          <div
            style={{
              fontSize: '0.82em',
              color: '#4a4a4a',
              fontStyle: 'italic',
              marginBottom: '1mm',
            }}
          >
            {tenant.tagline}
          </div>
        )}
        <div style={{ fontSize: '0.88em', lineHeight: 1.4 }}>
          {tenant?.address && <div>{tenant.address}</div>}
          {tenant?.phone && <div>Tel: {tenant.phone}</div>}
        </div>
        {(tenant?.tin_number || tenant?.bin_number || tenant?.vat_number) && (
          <div
            style={{
              fontSize: '0.78em',
              color: '#4a4a4a',
              marginTop: '0.8mm',
              letterSpacing: '0.02em',
            }}
          >
            {tenant?.tin_number && <span>TIN: {tenant.tin_number}</span>}
            {tenant?.bin_number && <span> &nbsp;·&nbsp; BIN: {tenant.bin_number}</span>}
            {tenant?.vat_number && <span> &nbsp;·&nbsp; VAT: {tenant.vat_number}</span>}
          </div>
        )}
      </header>

      <RuleDashed />

      {/* ═══════════════════════════════════════════════
          C) DOCUMENT TITLE + META
          ═══════════════════════════════════════════════ */}
      <div
        style={{
          textAlign: 'center',
          fontWeight: 800,
          fontSize: '1.1em',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          padding: '1mm 0',
        }}
      >
        Tax Invoice
      </div>
      <RuleDashed />

      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5mm',
          margin: '2mm 0',
        }}
        aria-label="Transaction information"
      >
        <Row label="Invoice #" value={invoiceNo} bold />
        {order?.order_number && order.order_number !== invoiceNo && (
          <Row label="Order #" value={order.order_number} />
        )}
        <Row
          label="Date"
          value={fmtDateTime(order?.order_date ?? order?.created_at)}
        />
        {order?.due_date && (
          <Row label="Due Date" value={fmtDateTime(order?.due_date)} />
        )}
        <Row label="Status" value={String(order?.status ?? '-')} upper />
        <Row
          label="Payment"
          value={String(order?.payment_status ?? 'pending')}
          upper
        />
        <Row label="Customer" value={customerName} />
        {customerPhone && <Row label="Phone" value={customerPhone} />}
        {order?.warehouse?.name && (
          <Row label="Warehouse" value={order.warehouse.name} />
        )}
      </section>

      <RuleDashed />

      {/* ═══════════════════════════════════════════════
          D) ITEMS TABLE
          ═══════════════════════════════════════════════ */}
      <section style={{ margin: '2mm 0' }} aria-label="Items">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: is58
              ? 'minmax(0, 1fr) auto auto'
              : 'minmax(0, 1fr) auto auto auto auto',
            fontWeight: 700,
            textTransform: 'uppercase',
            borderBottom: '1px dashed #000',
            paddingBottom: '0.5mm',
            marginBottom: '0.8mm',
            fontSize: '0.7em',
            letterSpacing: '0.04em',
            color: '#4a4a4a',
            columnGap: '2mm',
            alignItems: 'center',
            minHeight: '4mm',
          }}
        >
          <span style={{ alignSelf: 'center' }}>Item</span>
          <span style={{ textAlign: 'center', minWidth: '10mm', alignSelf: 'center' }}>Qty</span>
          {!is58 && (
            <span style={{ textAlign: 'right', minWidth: '14mm', alignSelf: 'center' }}>Price</span>
          )}
          <span style={{ textAlign: 'right', minWidth: '16mm', alignSelf: 'center' }}>Total</span>
        </div>

        {items.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              fontSize: '0.84em',
              color: '#6b6b6b',
              fontStyle: 'italic',
              padding: '1mm 0',
            }}
          >
            (no line items)
          </div>
        ) : (
          items.map((it: any, idx: number) => {
            const qty = Math.abs(Number(it.quantity ?? it.quantity_ordered ?? 0));
            const price = Number(it.unit_price ?? it.unit_cost ?? 0);
            const disc = Number(it.discount ?? it.discount_amount ?? 0);
            const tax = Number(it.tax_rate ?? 0);
            const lineTot = Number(it.line_total ?? qty * price - disc);
            return (
              <div
                key={it.id ?? idx}
                style={{
                  borderBottom: '1px dotted #d4d4d4',
                  padding: '0.6mm 0',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: is58
                      ? 'minmax(0, 1fr) auto auto'
                      : 'minmax(0, 1fr) auto auto auto auto',
                    columnGap: '2mm',
                    alignItems: 'baseline',
                    fontSize: '0.7em',
                    lineHeight: 1.2,
                  }}
                >
                  <span
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        fontSize: '1em',
                        fontWeight: 500,
                      }}
                    >
                      {it.product?.name ?? it.item_name ?? it.name ?? '-'}
                    </span>
                    {it.variation?.name && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.78em',
                          color: '#6b6b6b',
                          marginTop: '0.2mm',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {it.variation.name}
                      </span>
                    )}
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.72em',
                        color: '#6b6b6b',
                        marginTop: '0.2mm',
                        letterSpacing: '0.02em',
                      }}
                    >
                      @{fmt(price)}
                      {disc > 0 ? ` · −${fmt(disc)}` : ''}
                      {tax > 0 ? ` · VAT ${tax}%` : ''}
                    </span>
                  </span>

                  <span
                    style={{
                      textAlign: 'center',
                      padding: '0 0.5mm',
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: '10mm',
                      alignSelf: 'center',
                    }}
                  >
                    {qty}
                  </span>

                  {!is58 && (
                    <span
                      style={{
                        textAlign: 'right',
                        padding: '0 0.5mm',
                        fontVariantNumeric: 'tabular-nums',
                        minWidth: '14mm',
                        alignSelf: 'center',
                      }}
                    >
                      {fmt(price)}
                    </span>
                  )}

                  <span
                    style={{
                      textAlign: 'right',
                      padding: '0 0.5mm',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                      minWidth: '16mm',
                      alignSelf: 'center',
                    }}
                  >
                    {fmt(lineTot)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </section>

      <RuleDashed />

      {/* ═══════════════════════════════════════════════
          E) FINANCIAL SUMMARY
          ═══════════════════════════════════════════════ */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3mm',
          margin: '2mm 0',
        }}
        aria-label="Financial summary"
      >
        <Row label="Subtotal" value={fmt(subTotal)} />
        {discAmt > 0 && (
          <Row
            label={`Discount${discType === 'percentage' && discValue > 0 ? ` (${discValue}%)` : ''
              }`}
            value={`−${fmt(discAmt)}`}
          />
        )}
        {(taxAmt + shippingAmt) > 0 && (
          <Row label="Tax + Ship" value={`+${fmt(taxAmt + shippingAmt)}`} />
        )}
        {rounding !== 0 && (
          <Row
            label="Rounding"
            value={`${rounding > 0 ? '+' : ''}${fmt(rounding)}`}
          />
        )}
        {returnedAmount > 0 && (
          <Row label={`Returns (${returns.length})`} value={`−${fmt(returnedAmount)}`} />
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 900,
            fontSize: '1.18em',
            borderTop: '1px dashed #000',
            borderBottom: '1px dashed #000',
            padding: '1.2mm 0',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginTop: '1mm',
          }}
        >
          <span>Grand Total</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {fmt(grandTotal)}
          </span>
        </div>

        {paidAmount > 0 && (
          <Row label="Total Paid" value={fmt(paidAmount)} bold />
        )}
        <Row
          label={dueAmount > 0 ? 'Balance Due' : dueAmount < 0 ? 'Overpaid' : 'Settled'}
          value={fmt(Math.abs(dueAmount))}
          bold
        />
      </section>

      <RuleDouble />

      {/* ═══════════════════════════════════════════════
          F) PAYMENT HISTORY  (full)
          ═══════════════════════════════════════════════ */}
      {payments.length > 0 && (
        <>
          <div
            style={{
              textAlign: 'center',
              fontSize: '0.78em',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '1mm 0',
              borderTop: '1px dashed #000',
              borderBottom: '1px dashed #000',
              margin: '1mm 0',
            }}
          >
            Payment History ({payments.length}) · Received {fmt(
              payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
            )}
          </div>

          {payments.map((p: any, pi: number) => (
            <div
              key={p.id ?? pi}
              style={{
                padding: '0.6mm 0',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: is58
                    ? 'minmax(0, 1fr) auto'
                    : 'minmax(0, 1fr) auto',
                  columnGap: '2mm',
                  alignItems: 'baseline',
                  fontSize: '0.7em',
                  lineHeight: 1.2,
                }}
              >
                <span
                  style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: '1em',
                      fontWeight: 600,
                    }}
                  >
                    {p.receipt_number ?? `PMT-${pi + 1}`}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.78em',
                      color: '#6b6b6b',
                      marginTop: '0.2mm',
                    }}
                  >
                    {p.payment_date
                      ? new Date(p.payment_date).toLocaleDateString()
                      : '-'}
                    {' · '}
                    {String(p.payment_method ?? '-').replace(/_/g, ' ')}
                    {p.creator?.name ? ` · ${p.creator.name}` : ''}
                  </span>
                </span>

                <span
                  style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    minWidth: '16mm',
                    alignSelf: 'center',
                  }}
                >
                  {fmt(p.amount)}
                </span>
              </div>
              {p.status && p.status !== 'completed' && (
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '0.62em',
                    color: '#6b6b6b',
                    marginTop: '0.2mm',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  status: {p.status}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* <RuleDashed /> */}

      {/* ═══════════════════════════════════════════════
          G) QR CODE
          ═══════════════════════════════════════════════ */}
      {/* {qrSrc && (
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2mm',
            margin: '2mm auto',
          }}
          aria-label="Verification"
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <img
              src={qrSrc}
              alt={`QR for ${invoiceNo}`}
              width={qrSize}
              height={qrSize}
              style={{ width: qrSize, height: qrSize }}
              crossOrigin="anonymous"
            />
            <div
              style={{
                fontSize: '0.7em',
                color: '#4a4a4a',
                marginTop: '0.8mm',
                letterSpacing: '0.04em',
                textAlign: 'center',
              }}
            >
              Scan to verify · {invoiceNo}
            </div>
          </div>
        </section>
      )} */}

      <RuleDashed />

      {/* ═══════════════════════════════════════════════
          H) FOOTER
          ═══════════════════════════════════════════════ */}
      <footer
        style={{
          textAlign: 'center',
          margin: '2mm 0',
          fontSize: '0.84em',
          lineHeight: 1.45,
        }}
      >
        <div style={{ fontWeight: 700 }}>Thank you for your purchase!</div>
        <div style={{ color: '#4a4a4a', marginTop: '0.8mm' }}>
          Returns accepted within 7 days with this receipt.
          <br />
          No refund on discounted or opened items.
        </div>
        {tenant?.phone && (
          <div style={{ color: '#4a4a4a', marginTop: '1.5mm' }}>
            <strong>Helpline:</strong> {tenant.phone}
          </div>
        )}
        <div
          style={{
            color: '#6b6b6b',
            fontSize: '0.74em',
            letterSpacing: '0.04em',
            marginTop: '1.5mm',
          }}
        >
          Powered by Inventory POS · v1.0
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  bold,
  upper,
}: {
  label: string;
  value: string;
  bold?: boolean;
  upper?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span
        style={{
          textAlign: 'right',
          fontWeight: bold ? 700 : undefined,
          textTransform: upper ? 'uppercase' : undefined,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default SalesOrderInvoiceThermal;
