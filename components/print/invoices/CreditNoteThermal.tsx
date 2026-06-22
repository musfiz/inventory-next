import type { SalesReturn } from '@/types/api.types';
import { buildQrUrl } from './shared';

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n?: number | string | null): string {
  if (n === null || n === undefined || n === '') return '0.00';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDateTime(d?: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export type CreditNoteThermalPaperWidth = '58mm' | '80mm';
export type CreditNoteCopyLabel = 'customer' | 'merchant' | 'duplicate';

export interface CreditNoteThermalProps {
  returnDoc: SalesReturn;
  width?: CreditNoteThermalPaperWidth;
  copyLabel?: CreditNoteCopyLabel | null;
}

const COPY_LABEL: Record<CreditNoteCopyLabel, string> = {
  customer: 'Customer Copy',
  merchant: 'Merchant Copy',
  duplicate: 'Duplicate',
};

export function CreditNoteThermal({
  returnDoc,
  width = '80mm',
  copyLabel,
}: CreditNoteThermalProps) {
  const is58 = width === '58mm';
  const qrSize = is58 ? 72 : 88;

  const items = returnDoc.items ?? [];
  const so: any = returnDoc.sales_order ?? {};
  const tenant = so.tenant ?? null;
  const customer = (returnDoc as any).customer ?? so.customer ?? null;

  const returnNo = returnDoc.return_number;
  const invoiceNo = so.invoice_number ?? '-';
  const customerName = customer?.name ?? '-';
  const customerPhone = customer?.phone;

  const refundAmt = Number(returnDoc.refund_amount ?? 0);

  const qrSrc = buildQrUrl(returnNo, refundAmt);

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
      {/* ── COPY STAMP ──────────────────────────────────────────────── */}
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
              transform: copyLabel === 'merchant' ? 'rotate(-3deg)' : undefined,
            }}
          >
            {COPY_LABEL[copyLabel]}
          </span>
        </div>
      )}

      {/* ── TENANT HEADER ──────────────────────────────────────────── */}
      <header style={{ textAlign: 'center', margin: '0 0 2mm' }}>
        {tenant?.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={tenant?.business_name ?? 'Logo'}
            style={{
              display: 'block',
              margin: '0 auto 2mm',
              maxHeight: '14mm',
              maxWidth: '28mm',
            }}
          />
        ) : (
          <div
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

      {/* ── DOCUMENT TITLE + META ──────────────────────────────────────── */}
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
        Credit Note
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
        <Row label="Return #" value={returnNo} bold />
        <Row label="Invoice #" value={invoiceNo} />
        <Row label="Date" value={fmtDateTime(returnDoc.return_date)} />
        <Row label="Status" value={String(returnDoc.status ?? '-')} upper />
        <Row label="Customer" value={customerName} />
        {customerPhone && <Row label="Phone" value={customerPhone} />}
      </section>

      <RuleDashed />

      {/* ── REFERENCE INFO ──────────────────────────────────────────── */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3mm',
          fontSize: '0.78em',
          margin: '2mm 0',
        }}
      >
        <Row label="Reason" value={String(returnDoc.reason ?? '-').replace(/_/g, ' ')} />
        <Row label="Method" value={String(returnDoc.refund_method ?? '-').replace(/_/g, ' ')} />
        {returnDoc.notes && <Row label="Notes" value={returnDoc.notes} />}
      </section>

      <RuleDashed />

      {/* ── ITEMS TABLE ──────────────────────────────────────────────── */}
      <section style={{ margin: '2mm 0' }} aria-label="Items">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: is58
              ? 'minmax(0, 1fr) auto auto'
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
          <span style={{ textAlign: 'center', minWidth: '10mm', alignSelf: 'center' }}>Qty</span>
          {!is58 && (
            <span style={{ textAlign: 'center', minWidth: '14mm', alignSelf: 'center' }}>Cond</span>
          )}
          <span style={{ textAlign: 'right', minWidth: '16mm', alignSelf: 'center' }}>Total</span>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: '0.84em', color: '#6b6b6b', fontStyle: 'italic', padding: '1mm 0' }}>
            (no line items)
          </div>
        ) : (
          items.map((it: any, idx: number) => {
            const qty = Number(it.quantity_returned ?? it.quantity ?? 0);
            const price = Number(it.unit_price ?? 0);
            const lineTot = Number(it.line_total ?? qty * price);
            return (
              <div
                key={it.id ?? idx}
                style={{ borderBottom: '1px dotted #d4d4d4', padding: '0.6mm 0' }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: is58
                      ? 'minmax(0, 1fr) auto auto'
                      : 'minmax(0, 1fr) auto auto auto',
                    columnGap: '2mm',
                    alignItems: 'baseline',
                    fontSize: '0.7em',
                    lineHeight: 1.2,
                  }}
                >
                  <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '1em', fontWeight: 500 }}>
                      {it.product?.name ?? it.item_name ?? '-'}
                    </span>
                    {it.variation?.name && (
                      <span style={{ display: 'block', fontSize: '0.78em', color: '#6b6b6b', marginTop: '0.2mm' }}>
                        {it.variation.name}
                      </span>
                    )}
                    {!is58 && (
                      <span style={{ display: 'block', fontSize: '0.72em', color: '#6b6b6b', marginTop: '0.2mm' }}>
                        @{fmt(price)} · {String(it.condition ?? '-').replace(/_/g, ' ')}
                      </span>
                    )}
                  </span>

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
                    {qty}
                  </span>

                  {!is58 && (
                    <span
                      style={{
                        textAlign: 'center',
                        padding: '0 0.5mm',
                        fontVariantNumeric: 'tabular-nums',
                        borderBottom: '1px dotted #000',
                        minWidth: '14mm',
                        alignSelf: 'center',
                      }}
                    >
                      {String(it.condition ?? '-').replace(/_/g, ' ')}
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

      {/* ── FINANCIAL SUMMARY ──────────────────────────────────────────── */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3mm',
          margin: '2mm 0',
        }}
        aria-label="Financial summary"
      >
        <Row label="Subtotal" value={fmt(returnDoc.total_amount)} />

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
          <span>Refund Total</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {fmt(refundAmt)}
          </span>
        </div>
      </section>

      <RuleDouble />

      {/* ── APPROVER ──────────────────────────────────────────────────── */}
      {returnDoc.approver && (
        <section style={{ fontSize: '0.78em', margin: '2mm 0' }}>
          <div style={{ textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '1mm 0' }}>
            Approved by: {returnDoc.approver.name}
          </div>
        </section>
      )}

      {/* ── QR CODE ──────────────────────────────────────────────────────── */}
      {qrSrc && (
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img
              src={qrSrc}
              alt={`QR for ${returnNo}`}
              width={qrSize}
              height={qrSize}
              style={{ width: qrSize, height: qrSize }}
              crossOrigin="anonymous"
            />
            <div style={{ fontSize: '0.7em', color: '#4a4a4a', marginTop: '0.8mm', letterSpacing: '0.04em', textAlign: 'center' }}>
              Scan to verify · {returnNo}
            </div>
          </div>
        </section>
      )}

      <RuleDashed />

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer
        style={{
          textAlign: 'center',
          margin: '2mm 0',
          fontSize: '0.84em',
          lineHeight: 1.45,
        }}
      >
        <div style={{ fontWeight: 700 }}>Thank you for your business!</div>
        <div style={{ color: '#4a4a4a', marginTop: '0.8mm' }}>
          This credit note is valid upon authorized approval.
          <br />
          Returns accepted within 7 days with this receipt.
        </div>
        {tenant?.phone && (
          <div style={{ color: '#4a4a4a', marginTop: '1.5mm' }}>
            <strong>Helpline:</strong> {tenant.phone}
          </div>
        )}
        <div style={{ color: '#6b6b6b', fontSize: '0.74em', letterSpacing: '0.04em', marginTop: '1.5mm' }}>
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

export default CreditNoteThermal;
