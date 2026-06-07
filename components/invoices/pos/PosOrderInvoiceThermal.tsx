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
 * POS Sales Receipt — Thermal (58mm / 80mm).
 *
 * Industrial-standard design. Single source of truth, prints from the
 * POS page via `PosOrderPrintMenu`.
 *
 * Sections:
 *  • A) Copy stamp
 *  • B) Store header (logo / name / address / TIN-BIN-VAT)
 *  • C) Document title + transaction meta
 *  • D) Items table (Qty center, Price / Total right, with dotted leaders)
 *  • E) Totals (subtotal, discounts, tax, service, rounding, grand)
 *  • F) Payment block (method, paid, tendered, change, due) + status badge
 *  • G) QR + barcode verification
 *  • H) Customer signature line
 *  • I) Footer (thank-you, return policy, helpline, brand)
 */
export function PosOrderInvoiceThermal({
  order,
  width = '80mm',
  copyLabel,
}: PosOrderInvoiceThermalProps) {
  const is58 = width === '58mm';
  const qrSize = is58 ? 72 : 88;

  const tenant = order.tenant as any;
  const customer = order.customer;
  const items = order.items ?? [];
  const hasItems = items.length > 0;

  const customerName = customer?.name ?? order.customer_name ?? 'Walk-in Customer';
  const customerPhone = customer?.phone ?? order.customer_phone;
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

  const qrSrc = buildQrUrl(invoiceNo, order.grand_total);

  // ── Sub-components ────────────────────────────────────────────────────────

  const RuleDashed = () => (
    <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
  );
  const RuleDotted = () => (
    <div style={{ borderTop: '1px dotted #000', margin: '2mm 0' }} />
  );
  const RuleDouble = () => (
    <div
      style={{
        borderTop: '3px double #000',
        margin: '2mm 0',
      }}
    />
  );

  return (
    <div
      className="pos-invoice-content bg-white text-black mx-auto"
      style={{
        width,
        maxWidth: width,
        minWidth: width,
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: is58 ? '11px' : '12px',
        lineHeight: 1.42,
        padding: is58 ? '3mm' : '4mm 5mm',
        color: '#000',
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
          B) STORE HEADER
          ═══════════════════════════════════════════════ */}
      <header
        style={{ textAlign: 'center', margin: '0 0 2mm' }}
        aria-label="Store information"
      >
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

        <div
          style={{
            fontSize: '0.88em',
            lineHeight: 1.4,
          }}
        >
          {tenant?.address && <div>{tenant.address}</div>}
          {tenant?.phone && <div>Tel: {tenant.phone}</div>}
          {tenant?.email && <div>Email: {tenant.email}</div>}
          {tenant?.website && <div>Web: {tenant.website}</div>}
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
          C) DOCUMENT TITLE + TRANSACTION META
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
        Tax Invoice / Receipt
      </div>
      <RuleDashed />

      <section
        style={{ margin: '2mm 0', display: 'flex', flexDirection: 'column', gap: '0.5mm' }}
        aria-label="Transaction information"
      >
        <Row label="Receipt #" value={invoiceNo} bold />
        {order.id && <Row label="Order #" value={`POS-${order.id}`} />}
        <Row label="Date" value={fmtDateTime(order.order_date ?? order.created_at)} />
        {(order as any).cashier_name && <Row label="Cashier" value={(order as any).cashier_name} />}
        {order.register?.name && <Row label="Terminal" value={order.register.name} />}
        {order.session?.session_number && (
          <Row label="Session" value={order.session.session_number} />
        )}
        <Row label="Customer" value={customerName} />
        {customerPhone && <Row label="Phone" value={customerPhone} />}
      </section>

      <RuleDashed />

      {/* ═══════════════════════════════════════════════
          D) ITEMS TABLE
          Row × column structure. The Item column has a fixed-ish
          width (capped) so the numeric columns get enough room to
          draw a clear dotted leader between header and value.
          ═══════════════════════════════════════════════ */}
      <section style={{ margin: '2mm 0' }} aria-label="Items purchased">
        {/* Column headers — same grid template + minWidths + same
            font-size as the row below, with alignSelf: 'center' so
            the small "QTY" / "PRICE" labels sit in the vertical
            middle of the row's content (not pinned to the top). */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: is58
              ? 'minmax(0, 1fr) auto'
              : 'minmax(0, 1fr) auto auto auto',
            columnGap: '2mm',
            fontWeight: 700,
            textTransform: 'uppercase',
            borderBottom: '1px dashed #000',
            paddingBottom: '0.5mm',
            marginBottom: '0.8mm',
            fontSize: '0.7em',
            letterSpacing: '0.04em',
            color: '#4a4a4a',
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

        {items.map((item) => {
          const lineTot = Number(item.line_total ?? 0);
          const discAmt = Number((item as any).discount ?? 0);
          const sku =
            (item as any).variation?.sku ?? (item as any).product?.code;

          return (
            <div
              key={item.id}
              style={{
                borderBottom: '1px dotted #d4d4d4',
                padding: '0.6mm 0',
              }}
            >
              {/* Row — same column widths as the header so the
                  numeric values line up directly under their column
                  labels. Dotted leaders are drawn on the Qty / Price
                  cells so the value is visibly connected back to the
                  previous column edge. */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: is58
                    ? 'minmax(0, 1fr) auto'
                    : 'minmax(0, 1fr) auto auto auto',
                  columnGap: '2mm',
                  alignItems: 'baseline',
                  fontSize: '0.7em',
                  lineHeight: 1.2,
                }}
              >
                {/* Item name + SKU (left column) */}
                <span
                  style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    minWidth: 0, // allow grid track to shrink properly
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: '1em',
                      fontWeight: 500,
                    }}
                  >
                    {item.item_name}
                  </span>
                  {sku && (
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.78em',
                        color: '#6b6b6b',
                        marginTop: '0.2mm',
                        letterSpacing: '0.02em',
                      }}
                    >
                      SKU: {sku}
                    </span>
                  )}
                </span>

                {/* Qty — center-aligned, dotted leader across the cell */}
                <span
                  style={{
                    textAlign: 'center',
                    padding: '0 0.5mm',
                    fontVariantNumeric: 'tabular-nums',
                    borderBottom: '1px dotted #000',
                    minWidth: '10mm',
                    alignSelf: 'center',
                  }}
                >
                  {item.quantity}
                </span>

                {/* Price (80mm only) — right-aligned, dotted leader across the cell */}
                {!is58 && (
                  <span
                    style={{
                      textAlign: 'right',
                      padding: '0 0.5mm',
                      fontVariantNumeric: 'tabular-nums',
                      borderBottom: '1px dotted #000',
                      minWidth: '14mm',
                      alignSelf: 'center',
                    }}
                  >
                    {fmt(item.unit_price)}
                  </span>
                )}

                {/* Total — bold, right-aligned, no leader (right edge) */}
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

              {/* Optional disc sub-line under the total */}
              {discAmt > 0 && (
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '0.62em',
                    color: '#6b6b6b',
                    fontVariantNumeric: 'tabular-nums',
                    marginTop: '0.2mm',
                    letterSpacing: '0.02em',
                  }}
                >
                  disc: −{fmt(discAmt)}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty-state — visible only if the order came back with no items */}
        {!hasItems && (
          <div
            style={{
              textAlign: 'center',
              fontSize: '0.84em',
              color: '#6b6b6b',
              padding: '1mm 0',
              fontStyle: 'italic',
            }}
          >
            (no line items)
          </div>
        )}
      </section>

      <RuleDashed />

      {/* ═══════════════════════════════════════════════
          E) TOTALS
          ═══════════════════════════════════════════════ */}
      <section
        style={{ margin: '2mm 0', display: 'flex', flexDirection: 'column', gap: '0.3mm' }}
        aria-label="Totals summary"
      >
        <Row label="Subtotal" value={fmt(order.sub_total)} />
        {itemDiscountSum > 0 && (
          <Row label="Item Discounts" value={`−${fmt(itemDiscountSum)}`} />
        )}
        {hasDisc && (
          <Row
            label={`Order Discount${
              order.discount_type === 'percent' && order.discount_value
                ? ` (${order.discount_value}%)`
                : ''
            }`}
            value={`−${fmt(order.discount_amount)}`}
          />
        )}
        {totalSaved > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#1b7f3a',
            }}
          >
            <span>You Saved</span>
            <span
              style={{
                textAlign: 'right',
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              −{fmt(totalSaved)}
            </span>
          </div>
        )}
        {hasTax && (
          <Row
            label={`VAT${order.tax_rate ? ` (${order.tax_rate}%)` : ''}`}
            value={`+${fmt(order.tax_amount)}`}
          />
        )}
        {hasService && (
          <Row
            label="Service Charge"
            value={`+${fmt((order as any).service_charge)}`}
          />
        )}
        {rounding !== 0 && (
          <Row
            label="Rounding"
            value={`${rounding > 0 ? '+' : ''}${fmt(rounding)}`}
          />
        )}

        {/* Grand total — double-bordered, uppercase */}
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
            {fmt(order.grand_total)}
          </span>
        </div>
      </section>

      <RuleDashed />

      {/* ═══════════════════════════════════════════════
          F) PAYMENT BLOCK
          ═══════════════════════════════════════════════ */}
      <section style={{ margin: '2mm 0' }} aria-label="Payment">
        <div
          style={{
            border: '1px solid #000',
            padding: '1.5mm 2.2mm',
            borderRadius: '2px',
          }}
        >
          <div
            style={{
              fontSize: '0.82em',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              textAlign: 'center',
              borderBottom: '1px dashed #000',
              paddingBottom: '0.8mm',
              marginBottom: '1mm',
            }}
          >
            Payment
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3mm' }}>
            <Row
              label="Method"
              value={(order.payment_method ?? '—').toString().replace(/_/g, ' ')}
              bold
              upper
            />
            <Row label="Amount Paid" value={fmt(paidAmount)} />
            {tendered > 0 && <Row label="Cash Tendered" value={fmt(tendered)} />}
            {change > 0 && <Row label="Change Returned" value={fmt(change)} />}
            {dueAmount > 0 ? (
              <Row label="Balance Due" value={fmt(dueAmount)} bold />
            ) : (
              paidAmount > 0 && <Row label="Balance Due" value="0.00" bold />
            )}
          </div>
        </div>

        {/* Status badge */}
        <div style={{ textAlign: 'center', marginTop: '1.5mm' }}>
          {(() => {
            const status = order.payment_status;
            const isPaid = status === 'paid';
            const isPartial = status === 'partial';
            const label = isPaid
              ? 'Paid ✓'
              : isPartial
                ? 'Partial Payment'
                : (status ?? 'Pending').toString().toUpperCase();
            return (
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.6mm 2mm',
                  border: isPaid
                    ? '1.5px solid #000'
                    : isPartial
                      ? '1.5px solid #000'
                      : '1.5px dashed #000',
                  borderRadius: '2px',
                  fontSize: '0.82em',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  background: isPaid ? '#000' : '#fff',
                  color: isPaid ? '#fff' : '#000',
                }}
              >
                {label}
              </span>
            );
          })()}
        </div>
      </section>

      <RuleDouble />

      {/* ═══════════════════════════════════════════════
          G) VERIFICATION CODES
          ═══════════════════════════════════════════════ */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2mm',
          margin: '2mm auto',
        }}
        aria-label="Verification codes"
      >
        {qrSrc && (
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
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
        )}

        {/* Barcode placeholder — replace with real Code-128 generator */}
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <div
            aria-hidden="true"
            style={{
              width: is58 ? '34mm' : '42mm',
              height: '11mm',
              backgroundImage:
                'repeating-linear-gradient(90deg, #000 0 1px, transparent 1px 3px), repeating-linear-gradient(0deg, #000 0 1px, transparent 1px 3px)',
              backgroundColor: '#fff',
              border: '1px solid #000',
            }}
          />
          <div
            style={{
              fontSize: '0.78em',
              letterSpacing: '0.15em',
              marginTop: '0.4mm',
            }}
          >
            {invoiceNo}
          </div>
        </div>
      </section>

      <RuleDashed />

      {/* ═══════════════════════════════════════════════
          H) SIGNATURE  (only on merchant / duplicate copies)
          ═══════════════════════════════════════════════ */}
      {copyLabel && copyLabel !== 'customer' && (
        <section
          style={{ margin: '2mm 0', textAlign: 'center' }}
          aria-label="Signature"
        >
          <div
            style={{
              borderBottom: '1px solid #000',
              width: is58 ? '32mm' : '38mm',
              height: '6mm',
              margin: '0 auto 0.5mm',
            }}
          />
          <div
            style={{
              fontSize: '0.74em',
              color: '#4a4a4a',
            }}
          >
            Authorised Signature
          </div>
        </section>
      )}
      {(!copyLabel || copyLabel === 'customer') && (
        <section
          style={{ margin: '2mm 0', textAlign: 'center' }}
          aria-label="Signature"
        >
          <div
            style={{
              borderBottom: '1px solid #000',
              width: is58 ? '32mm' : '38mm',
              height: '6mm',
              margin: '0 auto 0.5mm',
            }}
          />
          <div
            style={{
              fontSize: '0.74em',
              color: '#4a4a4a',
            }}
          >
            Customer Signature
          </div>
        </section>
      )}

      <RuleDashed />

      {/* ═══════════════════════════════════════════════
          I) FOOTER
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
          <br />
          Items once sold cannot be exchanged without a valid receipt.
        </div>
        {(tenant?.phone || tenant?.email) && (
          <div style={{ color: '#4a4a4a', marginTop: '1.5mm' }}>
            {tenant?.phone && <span><strong>Helpline:</strong> {tenant.phone}</span>}
            {tenant?.phone && tenant?.email && <span> &nbsp;·&nbsp; </span>}
            {tenant?.email && <span><strong>Email:</strong> {tenant.email}</span>}
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

// ── Row helper ────────────────────────────────────────────────────────────────

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
