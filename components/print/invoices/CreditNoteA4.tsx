import type { SalesReturn } from '@/types/api.types';
import { buildQrUrl } from './shared';

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n?: number | string | null): string {
  if (n === null || n === undefined || n === '') return '0.00';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d?: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });
}

function fmtDateTime(d?: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Inline-style palette (mirrors SalesOrderInvoiceA4) ─────────────────────────
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

// ── Component ──────────────────────────────────────────────────────────────────

export type CreditNoteCopyLabel = 'customer' | 'merchant' | 'duplicate';

export interface CreditNoteA4Props {
  returnDoc: SalesReturn;
  copyLabel?: CreditNoteCopyLabel | null;
}

export function CreditNoteA4({ returnDoc, copyLabel }: CreditNoteA4Props) {
  const items = returnDoc.items ?? [];
  const so: any = returnDoc.sales_order ?? {};
  const tenant = so.tenant ?? null;
  const customer = (returnDoc as any).customer ?? so.customer ?? null;

  const returnNo = returnDoc.return_number;
  const invoiceNo = so.invoice_number ?? '-';

  const refundAmt = Number(returnDoc.refund_amount ?? 0);

  const printedAt = fmtDateTime(new Date().toISOString());
  const qrSrc = buildQrUrl(returnNo, refundAmt);

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

      {/* ── HEADER (brand left, doc-type right) ─────────────────────── */}
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
            Credit Note
          </div>
          <table style={{ fontSize: 10, marginLeft: 'auto', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ color: C.muted, paddingRight: 12, textAlign: 'right' }}>Return No</td>
                <td style={{ fontWeight: 700, textAlign: 'right' }}>{returnNo}</td>
              </tr>
              <tr>
                <td style={{ color: C.muted, paddingRight: 12, textAlign: 'right' }}>Invoice No</td>
                <td style={{ fontWeight: 700, textAlign: 'right' }}>{invoiceNo}</td>
              </tr>
              <tr>
                <td style={{ color: C.muted, paddingRight: 12, textAlign: 'right' }}>Return Date</td>
                <td style={{ textAlign: 'right' }}>{fmtDate(returnDoc.return_date)}</td>
              </tr>
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
                    {returnDoc.status ?? '-'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── REFERENCE INFO ──────────────────────────────────────────────── */}
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
            Customer
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>
            {customer?.name ?? '-'}
          </div>
          <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4, lineHeight: 1.6 }}>
            {customer?.phone && <div>Tel: {customer.phone}</div>}
            {customer?.email && <div>Email: {customer.email}</div>}
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
            Return Info
          </div>
          <div style={{ fontSize: 10, color: '#4b5563', lineHeight: 1.6 }}>
            <div><strong>Reason:</strong> {String(returnDoc.reason ?? '-').replace(/_/g, ' ')}</div>
            <div><strong>Method:</strong> {String(returnDoc.refund_method ?? '-').replace(/_/g, ' ')}</div>
            {returnDoc.notes && <div style={{ marginTop: 2 }}><strong>Notes:</strong> {returnDoc.notes}</div>}
          </div>
        </div>
      </div>

      {/* ── ITEMS TABLE ──────────────────────────────────────────────── */}
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
            gridTemplateColumns: 'auto 1fr auto auto auto',
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
          <span style={{ textAlign: 'center', minWidth: '14mm' }}>Condition</span>
          <span style={{ textAlign: 'right', minWidth: '18mm' }}>Total</span>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.muted, padding: 12, fontSize: 11 }}>
            No items found
          </div>
        ) : (
          items.map((it: any, idx: number) => {
            const qty = Number(it.quantity_returned ?? it.quantity ?? 0);
            const price = Number(it.unit_price ?? 0);
            const lineTot = Number(it.line_total ?? qty * price);
            return (
              <div
                key={it.id ?? idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto auto auto',
                  columnGap: '4mm',
                  alignItems: 'center',
                  padding: '5px 10px',
                  fontSize: 10,
                  background: idx % 2 === 1 ? C.rowAlt : '#fff',
                  borderBottom: idx === items.length - 1 ? 'none' : `1px dotted ${C.border}`,
                }}
              >
                <span style={{ color: C.muted, fontWeight: 600, fontSize: 10, width: '14px' }}>
                  {idx + 1}
                </span>
                <span style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: C.ink, lineHeight: 1.3, wordBreak: 'break-word' }}>
                    {it.product?.name ?? it.item_name ?? '-'}
                  </div>
                  {it.variation?.name && (
                    <div style={{ color: C.muted, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 9, marginTop: 1 }}>
                      {it.variation.name}
                    </div>
                  )}
                </span>
                <span style={{ textAlign: 'center', padding: '0 1mm', fontVariantNumeric: 'tabular-nums', color: '#4b5563', borderBottom: '1px dotted #9ca3af', minWidth: '10mm' }}>
                  {qty}
                </span>
                <span style={{ textAlign: 'center', padding: '0 1mm', fontVariantNumeric: 'tabular-nums', color: '#4b5563', borderBottom: '1px dotted #9ca3af', minWidth: '14mm' }}>
                  {String(it.condition ?? '-').replace(/_/g, ' ')}
                </span>
                <span style={{ textAlign: 'right', padding: '0 1mm', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#111827', fontSize: 10, whiteSpace: 'nowrap', minWidth: '18mm' }}>
                  {fmt(lineTot)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* ── SUMMARY ──────────────────────────────────────────────── */}
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
          {/* Approver info */}
          {returnDoc.approver && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: C.ink, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 9, marginBottom: 2 }}>
                Approved By
              </div>
              <div>{returnDoc.approver.name}</div>
              {(returnDoc as any).approved_at && (
                <div style={{ color: C.muted, fontSize: 10 }}>{fmtDate((returnDoc as any).approved_at)}</div>
              )}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, color: C.ink, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 9, marginBottom: 2 }}>
              Terms &amp; Conditions
            </div>
            <div style={{ color: C.muted }}>
              This credit note is valid upon authorized approval.
              <br />
              Returns accepted within 7 days with original receipt.
              <br />
              No refund on discounted or already-opened items.
            </div>
          </div>
        </div>

        <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: 12 }}>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ ...tdCell({ color: C.muted }) }}>Subtotal</td>
                <td style={{ ...tdCell({ textAlign: 'right', fontFamily: 'ui-monospace, monospace' }) }}>
                  {fmt(returnDoc.total_amount)}
                </td>
              </tr>
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
                  Refund Total
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
                      color: '#dc2626',
                    }),
                  }}
                >
                  {fmt(refundAmt)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
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
          <div style={{ fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 9, marginBottom: 2 }}>
            Return Policy
          </div>
          Returns accepted within 7 days with original receipt.
          <br />
          No refund on discounted or already-opened items.
          <br />
          Items once sold cannot be exchanged without a valid receipt.
          {(tenant?.phone || tenant?.email) && (
            <div style={{ marginTop: 4 }}>
              {tenant?.phone && <span><strong>Helpline:</strong> {tenant.phone}</span>}
              {tenant?.phone && tenant?.email && <span> &nbsp;·&nbsp; </span>}
              {tenant?.email && <span><strong>Email:</strong> {tenant.email}</span>}
            </div>
          )}
          <div style={{ marginTop: 4, fontSize: 9 }}>
            Powered by Inventory POS · v1.0 · Printed: {printedAt}
          </div>
        </div>

        {qrSrc && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 8px' }}>
            <img src={qrSrc} alt={`QR for ${returnNo}`} width={72} height={72} crossOrigin="anonymous" />
            <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>Scan to verify · {returnNo}</div>
          </div>
        )}

        <div style={{ textAlign: 'right' }}>
          <div style={{ width: '44mm', borderBottom: `1.5px solid ${C.ink}`, height: 16, marginBottom: 2 }} />
          <div style={{ fontSize: 10, color: C.muted }}>Authorised Signature</div>
          {tenant?.business_name && <div style={{ fontSize: 9, color: '#9ca3af' }}>{tenant.business_name}</div>}
        </div>
      </div>
    </div>
  );
}

export default CreditNoteA4;
