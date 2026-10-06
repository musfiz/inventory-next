import type { PurchaseReturn } from '@/types/api.types';
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

function label(v?: string | null): string {
  if (!v) return '-';
  return String(v).replace(/_/g, ' ');
}

// ── Component ─────────────────────────────────────────────────────────────────

export type DebitNoteThermalPaperWidth = '58mm' | '80mm';
export type DebitNoteCopyLabel = 'vendor' | 'merchant' | 'duplicate';

export interface DebitNoteThermalProps {
  returnDoc: PurchaseReturn;
  width?: DebitNoteThermalPaperWidth;
  copyLabel?: DebitNoteCopyLabel | null;
}

const COPY_LABEL: Record<DebitNoteCopyLabel, string> = {
  vendor: 'Vendor Copy',
  merchant: 'Merchant Copy',
  duplicate: 'Duplicate',
};

/**
 * Debit note, thermal roll.
 *
 * Same content as DebitNoteA4, laid out for an 80mm or 58mm roll. The reason
 * code column is dropped at 58mm because the line no longer fits — the vendor
 * reads reasons off the A4 copy.
 */
export function DebitNoteThermal({
  returnDoc,
  width = '80mm',
  copyLabel,
}: DebitNoteThermalProps) {
  const is58 = width === '58mm';
  const qrSize = is58 ? 72 : 88;

  const items = returnDoc.items ?? [];
  const po: any = returnDoc.purchase_order ?? {};
  const tenant = (returnDoc as any).tenant ?? null;
  const supplier = returnDoc.supplier ?? null;

  const returnNo = returnDoc.return_number;
  const docNo = returnDoc.debit_note_number || returnNo;

  const subTotal = Number(returnDoc.sub_total ?? 0);
  const discount = Number(returnDoc.discount_amount ?? 0);
  const tax = Number(returnDoc.tax_amount ?? 0);
  const total = Number(returnDoc.total_amount ?? 0);
  const net = Number(returnDoc.net_amount ?? subTotal - discount);
  const settled = Number(returnDoc.settled_amount ?? 0);
  const outstanding = Number(returnDoc.outstanding_amount ?? total - settled);

  const qrSrc = buildQrUrl(docNo, total);

  const monoFont =
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace';

  const RuleDashed = () => <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />;
  const RuleDotted = () => <div style={{ borderTop: '1px dotted #000', margin: '2mm 0' }} />;
  const RuleDouble = () => <div style={{ borderTop: '3px double #000', margin: '2mm 0' }} />;

  const Row = ({
    label: l,
    value,
    bold,
  }: {
    label: string;
    value: string;
    bold?: boolean;
  }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2mm', fontWeight: bold ? 700 : 400 }}>
      <span>{l}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{value}</span>
    </div>
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
            style={{ display: 'block', margin: '0 auto 2mm', maxHeight: '14mm', maxWidth: '28mm' }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '0 auto 2mm',
              width: '22mm',
              height: '16mm',
              border: '1px dashed #999',
              fontSize: '0.7em',
              color: '#777',
            }}
          >
            LOGO
          </div>
        )}
        {tenant?.business_name && (
          <div style={{ fontWeight: 900, fontSize: '1.22em', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {tenant.business_name}
          </div>
        )}
        {tenant?.address && <div style={{ fontSize: '0.76em', marginTop: '0.6mm' }}>{tenant.address}</div>}
        {(tenant?.phone || tenant?.tin_number) && (
          <div style={{ fontSize: '0.74em', color: '#4a4a4a', marginTop: '0.4mm' }}>
            {[tenant?.phone ? `Tel: ${tenant.phone}` : null, tenant?.tin_number ? `TIN: ${tenant.tin_number}` : null]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}
      </header>

      <RuleDouble />

      {/* ── DOCUMENT TITLE + META ───────────────────────────────────── */}
      <section style={{ textAlign: 'center', margin: '1.5mm 0' }}>
        <div style={{ fontSize: '1.45em', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Debit Note
        </div>
        <div style={{ fontSize: '0.78em', color: '#4a4a4a', marginTop: '0.8mm' }}>
          {label(returnDoc.return_type)} · {label(returnDoc.status)}
        </div>
      </section>

      <RuleDashed />

      <section style={{ fontSize: '0.82em', display: 'flex', flexDirection: 'column', gap: '0.3mm' }}>
        <Row label="Debit Note" value={returnDoc.debit_note_number ?? 'Not issued'} bold />
        <Row label="Return No" value={returnNo} />
        <Row label="PO No" value={po.po_number ?? '-'} bold />
        <Row label="Chalan/Inv No" value={po.supplier_order_no ?? '-'} />
        <Row label="Date" value={returnDoc.return_date ? new Date(returnDoc.return_date).toLocaleDateString() : '-'} />
        <Row label="Warehouse" value={returnDoc.warehouse?.name ?? '-'} />
        <Row label="Settlement" value={label(returnDoc.resolution)} />
        {returnDoc.vendor_reference && <Row label="Vendor RMA Ref" value={returnDoc.vendor_reference} />}
      </section>

      <RuleDashed />

      {/* ── SUPPLIER ───────────────────────────────────────────────── */}
      <section style={{ fontSize: '0.82em', margin: '1mm 0' }}>
        <div style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.92em' }}>
          Vendor
        </div>
        <div style={{ fontWeight: 700, marginTop: '0.4mm' }}>
          {supplier?.company_name || supplier?.name || '-'}
        </div>
        {supplier?.name && supplier?.company_name && <div>{supplier.name}</div>}
        {supplier?.phone && <div>Tel: {supplier.phone}</div>}
      </section>

      <RuleDotted />

      {/* ── ITEMS ───────────────────────────────────────────────────── */}
      <section style={{ margin: '2mm 0' }} aria-label="Items">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: is58 ? 'minmax(0, 1fr) auto auto' : 'minmax(0, 1fr) auto auto auto',
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
          {!is58 && <span style={{ textAlign: 'center', minWidth: '15mm', alignSelf: 'center' }}>Reason</span>}
          <span style={{ textAlign: 'right', minWidth: '16mm', alignSelf: 'center' }}>Total</span>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: '0.84em', color: '#6b6b6b', fontStyle: 'italic', padding: '1mm 0' }}>
            (no line items)
          </div>
        ) : (
          items.map((it: any, idx: number) => {
            const qty = Number(it.quantity_returned ?? 0);
            const cost = Number(it.unit_cost ?? 0);
            const lineTot = Number(it.line_total ?? qty * cost);
            return (
              <div key={it.id ?? idx} style={{ borderBottom: '1px dotted #d4d4d4', padding: '0.6mm 0' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: is58 ? 'minmax(0, 1fr) auto auto' : 'minmax(0, 1fr) auto auto auto',
                    columnGap: '2mm',
                    alignItems: 'baseline',
                    fontSize: '0.7em',
                    lineHeight: 1.2,
                  }}
                >
                  <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '1em', fontWeight: 500 }}>{it.product?.name ?? '-'}</span>
                    {it.variation?.name && (
                      <span style={{ display: 'block', fontSize: '0.78em', color: '#6b6b6b', marginTop: '0.2mm' }}>
                        {it.variation.name}
                      </span>
                    )}
                    {/* The unit cost and reason ride under the name at 80mm; at
                        58mm only the cost fits. */}
                    <span style={{ display: 'block', fontSize: '0.72em', color: '#6b6b6b', marginTop: '0.2mm' }}>
                      @{fmt(cost)}
                      {!is58 ? ` · ${label(it.reason_code)}` : ''}
                    </span>
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
                        borderBottom: '1px dotted #000',
                        minWidth: '15mm',
                        alignSelf: 'center',
                      }}
                    >
                      {label(it.reason_code)}
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
      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.3mm', margin: '2mm 0' }} aria-label="Financial summary">
        <Row label="Sub Total" value={fmt(subTotal)} />
        {discount > 0 && <Row label="Less: Discount" value={`(${fmt(discount)})`} />}
        <Row label="Net Value" value={fmt(net)} bold />
        {tax > 0 && <Row label="VAT" value={fmt(tax)} />}

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
          <span>Debit Total</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</span>
        </div>

        {settled > 0 && <Row label="Settled" value={`(${fmt(settled)})`} />}
        {settled > 0 && <Row label="Outstanding" value={fmt(outstanding)} bold />}
      </section>

      <RuleDouble />

      {/* ── APPROVAL / DISPATCH ───────────────────────────────────────── */}
      {(returnDoc.approver || returnDoc.completedBy) && (
        <section style={{ fontSize: '0.78em', margin: '2mm 0' }}>
          {returnDoc.approver && (
            <div style={{ textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.5mm 0' }}>
              Approved by: {returnDoc.approver.name}
            </div>
          )}
          {returnDoc.completedBy && (
            <div style={{ textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.5mm 0' }}>
              Dispatched by: {returnDoc.completedBy.name}
            </div>
          )}
        </section>
      )}

      {/* ── QR CODE ──────────────────────────────────────────────────────── */}
      {qrSrc && (
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2mm', margin: '2mm auto' }} aria-label="Verification">
          <img
            src={qrSrc}
            alt={`QR for ${docNo}`}
            width={qrSize}
            height={qrSize}
            style={{ width: qrSize, height: qrSize }}
            crossOrigin="anonymous"
          />
          <div style={{ fontSize: '0.7em', color: '#4a4a4a', marginTop: '0.8mm', letterSpacing: '0.04em', textAlign: 'center' }}>
            Scan to verify · {docNo}
          </div>
        </section>
      )}

      <RuleDashed />

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ textAlign: 'center', fontSize: '0.74em', color: '#4a4a4a' }}>
        <div style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.8mm' }}>
          Return Terms
        </div>
        <div>Goods must be unused and in original packaging.</div>
        <div>Please credit the above against invoice {po.supplier_order_no ?? po.po_number ?? '-'}.</div>
        <div style={{ marginTop: '1mm' }}>
          {returnDoc.notes ? `Notes: ${returnDoc.notes}` : ''}
        </div>
        <div style={{ marginTop: '1mm', fontSize: '0.9em', color: '#777' }}>
          Printed: {fmtDateTime(new Date().toISOString())}
        </div>
      </footer>
    </div>
  );
}

export default DebitNoteThermal;
