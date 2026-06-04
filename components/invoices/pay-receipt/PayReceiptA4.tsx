import type { Payment } from '@/types/api.types';
import { COPY_LABEL_TEXT, fmt, fmtDateTime, type PayReceiptCommonProps } from './shared';

// ── A4 PayReceipt — centered, POS-styled, professional ──────────────────────

interface PayReceiptA4Props extends PayReceiptCommonProps {
  payment: Payment;
}

/**
 * Print-friendly A4 payment receipt. Centered layout that mirrors the
 * project's POS-style design idiom (see `PurchaseOrderPosInvoice.tsx`)
 * so the A4 version feels like a "full-size" version of the same
 * receipt — the cashier/admin gets a consistent visual identity
 * regardless of paper size.
 *
 * Optional `copyLabel` stamps "CUSTOMER COPY" / "MERCHANT COPY" /
 * "DUPLICATE" at the top and adds a customer signature line at
 * the bottom (used by `PrintMenu` for the thermal flow).
 */
export function PayReceiptA4({ payment, copyLabel }: PayReceiptA4Props) {
  const tenant     = payment.tenant;
  const salesOrder = payment.salesOrder;
  const posOrder   = payment.posOrder;
  const customer   = (salesOrder as any)?.customer;

  const referenceValue = salesOrder?.invoice_number
    ?? posOrder?.invoice_number
    ?? posOrder?.order_number
    ?? (payment.sales_order_id ? `#${payment.sales_order_id}` : null)
    ?? (payment.pos_order_id   ? `#${payment.pos_order_id}`   : null)
    ?? '-';

  const customerName = customer?.name ?? posOrder?.customer_name ?? 'Walk-in Customer';

  return (
    <div className="invoice-content bg-white text-gray-900 mx-auto p-6 font-mono text-sm leading-5">
      {/* Copy stamp — only when copyLabel is set */}
      {copyLabel && (
        <div className="text-center mb-3">
          <span className="inline-block px-3 py-1 border-2 border-gray-900 text-gray-900 font-bold tracking-widest text-xs uppercase">
            {COPY_LABEL_TEXT[copyLabel]}
          </span>
        </div>
      )}

      {/* Header — tenant + receipt title, centered, dashed border */}
      <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
        {tenant?.logo_url && (
          <img
            src={tenant.logo_url}
            alt={tenant?.business_name ?? 'logo'}
            className="h-14 mx-auto mb-2 object-contain"
          />
        )}
        {tenant?.business_name && (
          <div className="text-2xl font-bold tracking-wide uppercase text-gray-900">
            {tenant.business_name}
          </div>
        )}
        {tenant?.address && <div className="text-xs text-gray-700">{tenant.address}</div>}
        {(tenant?.city || tenant?.country) && (
          <div className="text-xs text-gray-700">
            {[tenant?.city, tenant?.country].filter(Boolean).join(', ')}
          </div>
        )}
        {tenant?.phone && <div className="text-xs text-gray-700">Tel: {tenant.phone}</div>}
        {tenant?.email && <div className="text-xs text-gray-700">Email: {tenant.email}</div>}
        {(tenant?.tin_number || tenant?.bin_number || tenant?.vat_number) && (
          <div className="text-[10px] text-gray-600 mt-1">
            {tenant?.tin_number && <span>TIN: {tenant.tin_number}</span>}
            {tenant?.bin_number && <span> · BIN: {tenant.bin_number}</span>}
            {tenant?.vat_number && <span> · VAT: {tenant.vat_number}</span>}
          </div>
        )}

        <div className="text-lg font-bold tracking-widest mt-3">PAYMENT RECEIPT</div>
      </div>

      {/* Receipt meta + status — centered */}
      <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
        <div className="text-base font-bold">{payment.receipt_number}</div>
        <div className="text-xs text-gray-700">{fmtDateTime(payment.payment_date)}</div>
        <div className="mt-1">
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              payment.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : payment.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : payment.status === 'failed' || payment.status === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : payment.status === 'refunded'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-700'
            }`}
          >
            {payment.status}
          </span>
        </div>
      </div>

      {/* Reference block — flex justify-between rows */}
      <div className="space-y-1 border-b border-dashed border-gray-400 pb-3 mb-3 max-w-md mx-auto">
        <div className="flex justify-between gap-3">
          <span className="text-gray-600">Reference</span>
          <span className="text-right font-bold">{referenceValue}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-600">Customer</span>
          <span className="text-right font-bold">{customerName}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-600">Method</span>
          <span className="text-right font-bold capitalize">
            {(payment.payment_method ?? '-').replace(/_/g, ' ')}
          </span>
        </div>
        {payment.transaction_id && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-600">Txn ID</span>
            <span className="text-right">{payment.transaction_id}</span>
          </div>
        )}
        {payment.bank_name && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-600">Bank</span>
            <span className="text-right font-bold">{payment.bank_name}</span>
          </div>
        )}
        {payment.card_last_four && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-600">Card</span>
            <span className="text-right font-mono">**** {payment.card_last_four}</span>
          </div>
        )}
        {payment.check_number && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-600">Cheque #</span>
            <span className="text-right font-mono">{payment.check_number}</span>
          </div>
        )}
        {payment.mobile_number && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-600">Mobile</span>
            <span className="text-right font-mono">{payment.mobile_number}</span>
          </div>
        )}
      </div>

      {/* Amounts — centered, max-w-md for readability */}
      <div className="space-y-1 border-b border-dashed border-gray-400 pb-3 mb-3 max-w-md mx-auto">
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
            <span>Processing Fee</span>
            <span>{fmt(payment.processing_fee)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-300 mt-1">
          <span>TOTAL PAID</span>
          <span>{fmt(payment.total_amount)}</span>
        </div>
      </div>

      {/* Tendered / change (cash) */}
      {(Number(payment.tendered_amount) > 0 || Number(payment.change_amount) > 0) && (
        <div className="space-y-1 border-b border-dashed border-gray-400 pb-3 mb-3 max-w-md mx-auto">
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

      {/* Notes */}
      {payment.notes && (
        <div className="border-b border-dashed border-gray-400 py-2 mb-3 text-xs max-w-md mx-auto">
          <div className="text-gray-600 mb-1">Notes:</div>
          <div>{payment.notes}</div>
        </div>
      )}

      {/* Signature line — only when copyLabel is set */}
      {copyLabel && (
        <div className="border-t border-gray-400 pt-3 mt-3 max-w-md mx-auto">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-gray-400 pb-1 mb-1">&nbsp;</div>
              <div className="text-[10px] text-gray-600 text-center">Customer Signature</div>
            </div>
            <div>
              <div className="border-b border-gray-400 pb-1 mb-1">&nbsp;</div>
              <div className="text-[10px] text-gray-600 text-center">Authorized By</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer — centered */}
      <div className="text-center text-[10px] text-gray-500 mt-4 border-t-2 border-dashed border-gray-400 pt-3">
        {payment.creator && <div>Recorded by: {payment.creator.name}</div>}
        {payment.approver && <div>Approved by: {payment.approver.name}</div>}
        <div className="mt-1 font-bold">Thank you for your payment!</div>
        <div className="mt-1">Please retain this receipt for your records.</div>
        <div className="mt-1">Printed: {new Date().toLocaleString()}</div>
      </div>
    </div>
  );
}
