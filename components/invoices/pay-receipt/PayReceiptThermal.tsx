import type { Payment } from '@/types/api.types';
import { COPY_LABEL_TEXT, buildQrUrl, fmt, fmtDateTime, type PayReceiptCommonProps } from './shared';

// ── Thermal PayReceipt (80mm or 58mm POS slip) ──────────────────────────────

interface PayReceiptThermalProps extends PayReceiptCommonProps {
  payment: Payment;
  /**
   * Paper width.
   *  - '80mm' — standard retail POS slip (Epson TM-T88, Star TSP). Default.
   *  - '58mm' — compact slip for small shops.
   * Width is set on the wrapper so the print dialog matches the paper.
   */
  width?: '80mm' | '58mm';
}

/**
 * Print-friendly thermal-printer payment receipt. Centered layout,
 * dashed separators, monospaced amounts — matches the project's
 * existing `pos-invoice-content` design idiom (see
 * `components/invoices/pos/PurchaseOrderPosInvoice.tsx`) so the
 * thermal receipt feels native.
 *
 * Optional `copyLabel` stamps "CUSTOMER COPY" / "MERCHANT COPY" /
 * "DUPLICATE" at the top and adds a customer signature line at
 * the bottom.
 */
export function PayReceiptThermal({ payment, copyLabel, width = '80mm' }: PayReceiptThermalProps) {
  const tenant     = payment.tenant;
  const salesOrder = payment.salesOrder;
  const posOrder   = payment.posOrder;
  const customer   = (salesOrder as any)?.customer;

  const isWide = width === '80mm';
  const qrSize = isWide ? 96 : 72;

  const referenceValue = salesOrder?.invoice_number
    ?? posOrder?.invoice_number
    ?? posOrder?.order_number
    ?? (payment.sales_order_id ? `#${payment.sales_order_id}` : null)
    ?? (payment.pos_order_id   ? `#${payment.pos_order_id}`   : null)
    ?? '-';

  const customerName = customer?.name ?? posOrder?.customer_name ?? 'Walk-in Customer';

  const qrSrc = buildQrUrl(payment.receipt_number, payment.total_amount);

  return (
    <div
      className="pos-invoice-content bg-white text-black mx-auto font-mono text-xs leading-5 p-4"
      style={{ width, maxWidth: width, minWidth: width }}
    >
      {/* Copy stamp */}
      {copyLabel && (
        <div className="text-center mb-2">
          <span
            className="inline-block px-2 py-0.5 border-2 border-black font-bold tracking-widest text-[10px] uppercase"
            style={{ borderWidth: '2px' }}
          >
            {COPY_LABEL_TEXT[copyLabel]}
          </span>
        </div>
      )}

      {/* Header — tenant business name + meta, centered, dashed bottom */}
      <div className="text-center border-b border-dashed border-black pb-3 mb-3">
        {tenant?.business_name && (
          <div className="text-base font-bold tracking-wide uppercase">
            {tenant.business_name}
          </div>
        )}
        {tenant?.address && <div>{tenant.address}</div>}
        {(tenant?.city || tenant?.country) && (
          <div>{[tenant?.city, tenant?.country].filter(Boolean).join(', ')}</div>
        )}
        {tenant?.phone && <div>Tel: {tenant.phone}</div>}
        {tenant?.tin_number && <div>TIN: {tenant.tin_number}</div>}
      </div>

      {/* Receipt title — centered, uppercase, with dashed divider */}
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <div className="text-sm font-bold tracking-wider">PAYMENT RECEIPT</div>
        <div className="mt-1 font-bold">{payment.receipt_number}</div>
        <div className="text-[11px]">{fmtDateTime(payment.payment_date)}</div>
      </div>

      {/* Reference block — flex justify-between rows */}
      <div className="space-y-1 border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between gap-3">
          <span>Ref</span>
          <span className="text-right">{referenceValue}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Customer</span>
          <span className="text-right">{customerName}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Method</span>
          <span className="text-right capitalize">
            {(payment.payment_method ?? '-').replace(/_/g, ' ')}
          </span>
        </div>
        {payment.transaction_id && (
          <div className="flex justify-between gap-3">
            <span>Txn ID</span>
            <span className="text-right">{payment.transaction_id}</span>
          </div>
        )}
        {payment.bank_name && (
          <div className="flex justify-between gap-3">
            <span>Bank</span>
            <span className="text-right">{payment.bank_name}</span>
          </div>
        )}
        {payment.card_last_four && (
          <div className="flex justify-between gap-3">
            <span>Card</span>
            <span className="text-right">**** {payment.card_last_four}</span>
          </div>
        )}
        {payment.check_number && (
          <div className="flex justify-between gap-3">
            <span>Cheque</span>
            <span className="text-right">{payment.check_number}</span>
          </div>
        )}
        {payment.mobile_number && (
          <div className="flex justify-between gap-3">
            <span>Mobile</span>
            <span className="text-right">{payment.mobile_number}</span>
          </div>
        )}
      </div>

      {/* Amounts block */}
      <div className="space-y-1 border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between">
          <span>Payment</span>
          <span>{fmt(payment.amount)}</span>
        </div>
        {Number(payment.tax_amount) > 0 && (
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{fmt(payment.tax_amount)}</span>
          </div>
        )}
        {Number(payment.processing_fee) > 0 && (
          <div className="flex justify-between">
            <span>Fee</span>
            <span>{fmt(payment.processing_fee)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm pt-1">
          <span>TOTAL PAID</span>
          <span>{fmt(payment.total_amount)}</span>
        </div>
      </div>

      {/* Tendered / change (cash) */}
      {(Number(payment.tendered_amount) > 0 || Number(payment.change_amount) > 0) && (
        <div className="space-y-1 border-b border-dashed border-black pb-2 mb-2">
          {Number(payment.tendered_amount) > 0 && (
            <div className="flex justify-between">
              <span>Tendered</span>
              <span>{fmt(payment.tendered_amount)}</span>
            </div>
          )}
          {Number(payment.change_amount) > 0 && (
            <div className="flex justify-between">
              <span>Change</span>
              <span>{fmt(payment.change_amount)}</span>
            </div>
          )}
        </div>
      )}

      {/* Status line */}
      <div className="text-center text-[10px] uppercase font-bold py-1">
        STATUS: {payment.status}
      </div>

      {/* Notes */}
      {payment.notes && (
        <div className="border-b border-dashed border-black py-2 mb-2 text-[11px]">
          <div>Notes: {payment.notes}</div>
        </div>
      )}

      {/* QR — centered, above footer for receipt verification */}
      {qrSrc && (
        <div className="flex flex-col items-center py-2">
          <img
            src={qrSrc}
            alt={`QR for ${payment.receipt_number}`}
            width={qrSize}
            height={qrSize}
            style={{ width: qrSize, height: qrSize }}
            crossOrigin="anonymous"
          />
          <div className="text-[9px] text-center mt-1">Scan to verify</div>
        </div>
      )}

      {/* Signature line — only when copyLabel is set */}
      {copyLabel && (
        <div className="border-t border-black pt-2 mt-2">
          <div className="border-b border-black pb-1 mb-6">
            <div className="text-[10px]">Customer Signature</div>
          </div>
          <div className="border-b border-black pb-1">
            <div className="text-[10px]">Authorized By</div>
          </div>
        </div>
      )}

      {/* Footer — centered, small */}
      <div className="text-center text-[10px] mt-3 border-t border-dashed border-black pt-2">
        {payment.creator && <div>Recorded by: {payment.creator.name}</div>}
        {payment.approver && <div>Approved by: {payment.approver.name}</div>}
        <div className="mt-1">Thank you for your payment!</div>
        <div className="mt-1">Printed: {new Date().toLocaleString()}</div>
      </div>
    </div>
  );
}
