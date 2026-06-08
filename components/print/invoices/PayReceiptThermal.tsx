import type { Payment } from '@/types/api.types';
import {
  COPY_LABEL_TEXT,
  buildQrUrl,
  fmt,
  fmtDateTime,
  type PrintOrderItem,
} from './shared';

// ── Thermal PayReceipt (80mm or 58mm POS slip) ──────────────────────────────

interface PayReceiptThermalProps {
  payment: Payment;
  /** Optional "Customer Copy" / "Merchant Copy" / "Duplicate" stamp. */
  copyLabel?: 'customer' | 'merchant' | 'duplicate' | null;
  /**
   * Paper width.
   *  - '80mm' — standard retail POS slip (Epson TM-T88, Star TSP). Default.
   *  - '58mm' — compact slip for small shops.
   */
  width?: '80mm' | '58mm';
  /** Full order line items fetched from the server (POS or Sales order). */
  orderItems?: PrintOrderItem[] | null;
  /** Summary totals from the linked order. */
  orderSummary?: {
    sub_total?: number | null;
    discount_amount?: number | null;
    discount_type?: string | null;
    discount_value?: number | null;
    tax_amount?: number | null;
    grand_total?: number | null;
  } | null;
}

/**
 * Print-friendly thermal-printer payment receipt — industrial design.
 *
 * Uses 100% inline styles so the receipt renders correctly inside the
 * `window.open()` print window (no Tailwind / external CSS dependency).
 *
 * Sections:
 *  A) Copy stamp
 *  B) Tenant header (logo / name / address / TIN-BIN-VAT)
 *  C) Document title + payment meta
 *  D) Reference block (sales/POS order invoice, customer, method, txn ids)
 *  E) Amounts (payment, tax, fee, total paid)
 *  F) Tendered / change (cash)
 *  G) Status badge
 *  H) Notes
 *  I) QR + barcode verification
 *  J) Signature lines (only when copyLabel is set)
 *  K) Footer (recorded by, approved by, thank-you, print timestamp)
 */
export function PayReceiptThermal({
  payment,
  copyLabel,
  width = '80mm',
  orderItems,
  orderSummary,
}: PayReceiptThermalProps) {
  const tenant = payment.tenant as any;
  const salesOrder = payment.salesOrder as any;
  const posOrder = payment.posOrder as any;
  const order = salesOrder ?? posOrder;
  const customer = salesOrder?.customer;

  // Line items (use what PrintMenu loaded, else an empty list)
  const items: PrintOrderItem[] = orderItems ?? [];
  const hasItems = items.length > 0;

  // Summary — prefer orderSummary (loaded by PrintMenu), fall back to
  // the linked order, then to the payment's own totals so the receipt
  // is never blank.
  const subTotal = Number(
    orderSummary?.sub_total ?? order?.sub_total ?? 0,
  );
  const discAmt = Number(
    orderSummary?.discount_amount ?? order?.discount_amount ?? 0,
  );
  const discType = orderSummary?.discount_type ?? order?.discount_type ?? null;
  const discValue = Number(
    orderSummary?.discount_value ?? order?.discount_value ?? 0,
  );
  const taxAmt = Number(
    orderSummary?.tax_amount ?? order?.tax_amount ?? payment.tax_amount ?? 0,
  );
  const grandTotal = Number(
    orderSummary?.grand_total ?? order?.grand_total ?? payment.total_amount,
  );

  const is58 = width === '58mm';
  const qrSize = is58 ? 72 : 88;

  const referenceValue =
    salesOrder?.invoice_number ??
    posOrder?.invoice_number ??
    posOrder?.order_number ??
    (payment.sales_order_id ? `#${payment.sales_order_id}` : null) ??
    (payment.pos_order_id ? `#${payment.pos_order_id}` : null) ??
    '-';

  const customerName =
    customer?.name ?? posOrder?.customer_name ?? 'Walk-in Customer';

  const qrSrc = buildQrUrl(payment.receipt_number, payment.total_amount);

  const monoFont =
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace';

  // Rule helpers (re-used like the new POS thermal component)
  const RuleDashed = () => (
    <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
  );
  const RuleDotted = () => (
    <div style={{ borderTop: '1px dotted #000', margin: '2mm 0' }} />
  );
  const RuleDouble = () => (
    <div style={{ borderTop: '3px double #000', margin: '2mm 0' }} />
  );

  // Status badge
  const status = (payment.status ?? 'pending').toString().toLowerCase();
  const isPaid = status === 'paid' || status === 'completed';
  const isPartial = status === 'partial';
  const statusLabel = isPaid
    ? 'Paid ✓'
    : isPartial
      ? 'Partial'
      : status.toUpperCase();

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
            {COPY_LABEL_TEXT[copyLabel]}
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
          {tenant?.email && <div>Email: {tenant.email}</div>}
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
          C) DOCUMENT TITLE + PAYMENT META
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
        Payment Receipt
      </div>
      <div
        style={{
          textAlign: 'center',
          fontWeight: 800,
          fontSize: '1.05em',
          padding: '0 0 1mm',
          letterSpacing: '0.04em',
        }}
      >
        {payment.receipt_number}
      </div>
      <div
        style={{
          textAlign: 'center',
          fontSize: '0.88em',
          color: '#4a4a4a',
          padding: '0 0 1mm',
        }}
      >
        {fmtDateTime(payment.payment_date)}
      </div>
      <RuleDashed />

      {/* ═══════════════════════════════════════════════
          D) REFERENCE BLOCK
          ═══════════════════════════════════════════════ */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5mm',
          margin: '2mm 0',
        }}
        aria-label="Reference"
      >
        <Row label="Receipt #" value={payment.receipt_number} />
        <Row label="Reference" value={String(referenceValue)} />
        <Row label="Customer" value={customerName} />
        {salesOrder?.customer?.phone && (
          <Row label="Phone" value={salesOrder.customer.phone} />
        )}
        <Row
          label="Method"
          value={(payment.payment_method ?? '-').toString().replace(/_/g, ' ')}
          upper
        />
        {payment.transaction_id && (
          <Row label="Txn ID" value={payment.transaction_id} />
        )}
        {payment.bank_name && <Row label="Bank" value={payment.bank_name} />}
        {payment.card_last_four && (
          <Row label="Card" value={`**** ${payment.card_last_four}`} />
        )}
        {payment.check_number && (
          <Row label="Cheque" value={payment.check_number} />
        )}
        {payment.mobile_number && (
          <Row label="Mobile" value={payment.mobile_number} />
        )}
      </section>

      {/* ═══════════════════════════════════════════════
          D-1) ITEMS TABLE  (only when items are available)
          ═══════════════════════════════════════════════ */}
      {hasItems && (
        <>
          <RuleDashed />
          <section style={{ margin: '2mm 0' }} aria-label="Items purchased">
            {/* Column headers — 80mm has 4 columns, 58mm has 2 columns */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: is58
                  ? 'minmax(0, 1fr) auto'
                  : 'minmax(0, 1fr) auto auto auto',
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
              <span style={{ textAlign: 'center', minWidth: '6mm', alignSelf: 'center' }}>Qty</span>
              {!is58 && (
                <span style={{ textAlign: 'right', minWidth: '10mm', alignSelf: 'center' }}>Price</span>
              )}
              <span style={{ textAlign: 'right', minWidth: '12mm', alignSelf: 'center' }}>Total</span>
            </div>

            {items.map((it) => {
              const qty = Number(it.quantity);
              const price = Number(it.unit_price);
              const disc = Number(it.discount ?? 0);
              const lineTot = Number(
                it.line_total ?? qty * price - disc,
              );
              return (
                <div
                  key={it.id ?? `${it.name}-${it.sku ?? ''}`}
                  style={{
                    borderBottom: '1px dotted #d4d4d4',
                    padding: '0.6mm 0',
                  }}
                >
                  {/* Item row — column-aligned. Each numeric cell has a
                      dotted leader on the left edge that grows from the
                      cell's content toward the previous cell, creating
                      the classic POS "Item .... Qty .... Total" look. */}
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
                    {/* Item name (with optional SKU as 2nd line) */}
                    <span
                      style={{
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        minWidth: 150,
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          fontWeight: 500,
                          fontSize: '1em',
                        }}
                      >
                        {it.name}
                      </span>
                      {it.sku && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: '0.78em',
                            color: '#6b6b6b',
                            marginTop: '0.2mm',
                            letterSpacing: '0.02em',
                          }}
                        >
                          SKU: {it.sku}
                        </span>
                      )}
                    </span>

                    {/* Qty — dotted-leader cell (bottom border of the
                        value draws the leader line from cell edge to value) */}
                    <span
                      style={{
                        textAlign: 'center',
                        padding: '0 0.5mm',
                        fontVariantNumeric: 'tabular-nums',
                        // borderBottom: '1px dotted #000',
                        minWidth: '6mm',
                        alignSelf: 'center',
                      }}
                    >
                      {qty}
                    </span>

                    {/* Price (80mm only) */}
                    {!is58 && (
                      <span
                        style={{
                          textAlign: 'right',
                          padding: '0 0.5mm',
                          fontVariantNumeric: 'tabular-nums',
                          // borderBottom: '1px dotted #000',
                          minWidth: '10mm',
                          alignSelf: 'center',
                        }}
                      >
                        {fmt(price)}
                      </span>
                    )}

                    {/* Total — bold, no dotted leader (it's the right edge) */}
                    <span
                      style={{
                        textAlign: 'right',
                        padding: '0 0.5mm',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        minWidth: '12mm',
                        alignSelf: 'center',
                      }}
                    >
                      {fmt(lineTot)}
                    </span>
                  </div>

                  {/* Optional disc sub-line under the total */}
                  {disc > 0 && (
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
                      disc: −{fmt(disc)}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </>
      )}

      <RuleDashed />

      {/* ═══════════════════════════════════════════════
          E) AMOUNTS
          ═══════════════════════════════════════════════ */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3mm',
          margin: '2mm 0',
        }}
        aria-label="Amounts"
      >
        {/* Subtotal — only when we have items + summary from the linked order */}
        {hasItems && subTotal > 0 && (
          <Row label="Subtotal" value={fmt(subTotal)} />
        )}
        {hasItems && discAmt > 0 && (
          <Row
            label={`Order Discount${
              discType === 'percent' && discValue > 0 ? ` (${discValue}%)` : ''
            }`}
            value={`−${fmt(discAmt)}`}
          />
        )}
        {hasItems && taxAmt > 0 && (
          <Row label="Tax" value={fmt(taxAmt)} />
        )}

        <Row label="Payment" value={fmt(payment.amount)} />
        {Number(payment.processing_fee) > 0 && (
          <Row label="Processing Fee" value={fmt(payment.processing_fee)} />
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
          <span>Total Paid</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {fmt(payment.total_amount)}
          </span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          F) TENDERED / CHANGE
          ═══════════════════════════════════════════════ */}
      {(Number(payment.tendered_amount) > 0 ||
        Number(payment.change_amount) > 0) && (
        <>
          <RuleDashed />
          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3mm',
              margin: '2mm 0',
            }}
            aria-label="Tendered / change"
          >
            {Number(payment.tendered_amount) > 0 && (
              <Row label="Tendered" value={fmt(payment.tendered_amount)} />
            )}
            {Number(payment.change_amount) > 0 && (
              <Row label="Change" value={fmt(payment.change_amount)} />
            )}
          </section>
        </>
      )}

      <RuleDashed />

      {/* ═══════════════════════════════════════════════
          G) STATUS BADGE
          ═══════════════════════════════════════════════ */}
      <div style={{ textAlign: 'center', margin: '2mm 0' }}>
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
          {statusLabel}
        </span>
      </div>

      {/* ═══════════════════════════════════════════════
          H) NOTES
          ═══════════════════════════════════════════════ */}
      {payment.notes && (
        <>
          <RuleDotted />
          <div
            style={{
              fontSize: '0.84em',
              color: '#4a4a4a',
              margin: '2mm 0',
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: '#000' }}>Notes:</strong> {payment.notes}
          </div>
        </>
      )}

      <RuleDouble />

      {/* ═══════════════════════════════════════════════
          I) QR + BARCODE
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
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <img
              src={qrSrc}
              alt={`QR for ${payment.receipt_number}`}
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
              Scan to verify · {payment.receipt_number}
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
            {payment.receipt_number}
          </div>
        </div>
      </section>

      <RuleDashed />

      {/* ═══════════════════════════════════════════════
          J) SIGNATURE LINES
          ═══════════════════════════════════════════════ */}
      {copyLabel && (
        <section
          style={{
            margin: '2mm 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4mm',
          }}
          aria-label="Signatures"
        >
          <SignatureLine label="Customer Signature" width={is58 ? '32mm' : '38mm'} />
          <SignatureLine label="Authorised By" width={is58 ? '32mm' : '38mm'} />
        </section>
      )}

      <RuleDashed />

      {/* ═══════════════════════════════════════════════
          K) FOOTER
          ═══════════════════════════════════════════════ */}
      <footer
        style={{
          textAlign: 'center',
          margin: '2mm 0',
          fontSize: '0.84em',
          lineHeight: 1.45,
        }}
      >
        {(payment as any).creator?.name && (
          <div style={{ color: '#4a4a4a' }}>
            Recorded by: <strong>{(payment as any).creator.name}</strong>
          </div>
        )}
        {(payment as any).approver?.name && (
          <div style={{ color: '#4a4a4a' }}>
            Approved by: <strong>{(payment as any).approver.name}</strong>
          </div>
        )}
        <div style={{ fontWeight: 700, marginTop: '1mm' }}>
          Thank you for your payment!
        </div>
        <div
          style={{
            color: '#6b6b6b',
            fontSize: '0.74em',
            letterSpacing: '0.04em',
            marginTop: '1mm',
          }}
        >
          Printed: {new Date().toLocaleString()}
        </div>
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
  upper,
}: {
  label: string;
  value: string;
  upper?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span
        style={{
          textAlign: 'right',
          textTransform: upper ? 'uppercase' : undefined,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SignatureLine({ label, width }: { label: string; width: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          borderBottom: '1px solid #000',
          width,
          height: '6mm',
          margin: '0 auto 0.5mm',
        }}
      />
      <div style={{ fontSize: '0.74em', color: '#4a4a4a' }}>{label}</div>
    </div>
  );
}
