import type { SalesReturn } from '@/types/api.types';
import type { PosRefund } from '@/services/posRefundService';

// ── Shared helpers ────────────────────────────────────────────────────────────

function fmt(n?: number | string | null) {
  if (n === null || n === undefined || n === '') return '0.00';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d?: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Sales Return Credit Note ──────────────────────────────────────────────────

interface SalesReturnCreditNoteProps {
  returnDoc: SalesReturn;
}

export function SalesReturnCreditNote({ returnDoc }: SalesReturnCreditNoteProps) {
  const items = returnDoc.items ?? [];

  return (
    <div className="credit-note bg-white text-gray-900 p-8 max-w-2xl mx-auto font-sans text-sm print:p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">CREDIT NOTE</h1>
          <p className="text-xs text-gray-500 mt-0.5">Sales Return Receipt</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg font-mono">{returnDoc.return_number}</p>
          <p className="text-xs text-gray-500">Date: {fmtDate(returnDoc.return_date)}</p>
        </div>
      </div>

      {/* Reference */}
      <div className="bg-gray-50 rounded p-3 mb-5 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Original Invoice:</span>{' '}
          <span className="font-semibold">{returnDoc.sales_order?.invoice_number ?? '-'}</span>
        </div>
        <div>
          <span className="text-gray-500">Customer:</span>{' '}
          <span className="font-semibold">{returnDoc.customer?.name ?? '-'}</span>
        </div>
        <div>
          <span className="text-gray-500">Return Reason:</span>{' '}
          <span className="capitalize">{returnDoc.reason?.replace(/_/g, ' ') ?? '-'}</span>
        </div>
        <div>
          <span className="text-gray-500">Refund Method:</span>{' '}
          <span className="capitalize">{returnDoc.refund_method?.replace(/_/g, ' ') ?? '-'}</span>
        </div>
        {returnDoc.notes && (
          <div className="col-span-2">
            <span className="text-gray-500">Notes:</span>{' '}
            <span>{returnDoc.notes}</span>
          </div>
        )}
      </div>

      {/* Items table */}
      <table className="w-full border-collapse text-xs mb-5">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left border border-gray-200 px-2 py-1.5 font-semibold">#</th>
            <th className="text-left border border-gray-200 px-2 py-1.5 font-semibold">Item</th>
            <th className="text-left border border-gray-200 px-2 py-1.5 font-semibold">SKU</th>
            <th className="text-center border border-gray-200 px-2 py-1.5 font-semibold">Condition</th>
            <th className="text-right border border-gray-200 px-2 py-1.5 font-semibold">Qty</th>
            <th className="text-right border border-gray-200 px-2 py-1.5 font-semibold">Unit Price</th>
            <th className="text-right border border-gray-200 px-2 py-1.5 font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} className="even:bg-gray-50">
              <td className="border border-gray-200 px-2 py-1 text-center">{i + 1}</td>
              <td className="border border-gray-200 px-2 py-1">
                <span className="font-medium">{item.product?.name ?? '-'}</span>
                {item.variation?.name && (
                  <span className="text-gray-500"> / {item.variation.name}</span>
                )}
              </td>
              <td className="border border-gray-200 px-2 py-1 font-mono text-xs">{item.variation?.sku ?? '-'}</td>
              <td className="border border-gray-200 px-2 py-1 text-center capitalize">{item.condition ?? '-'}</td>
              <td className="border border-gray-200 px-2 py-1 text-right">{fmt(item.quantity_returned)}</td>
              <td className="border border-gray-200 px-2 py-1 text-right">{fmt(item.unit_price)}</td>
              <td className="border border-gray-200 px-2 py-1 text-right font-semibold">
                {fmt(Number(item.quantity_returned) * Number(item.unit_price))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="flex justify-end mb-6">
        <div className="w-56 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-mono">{fmt(returnDoc.total_amount)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-1 mt-1">
            <span>Refund Total</span>
            <span className="font-mono">{fmt(returnDoc.refund_amount)}</span>
          </div>
        </div>
      </div>

      {/* Status & approval */}
      <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-200 pt-3">
        <div>
          {returnDoc.approver && (
            <span>Approved by: <strong>{returnDoc.approver.name}</strong></span>
          )}
        </div>
        <div className="text-right">
          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold capitalize">
            {returnDoc.status}
          </span>
        </div>
      </div>

      <p className="text-center text-gray-400 text-xs mt-6">
        Thank you for your business. This credit note is valid upon authorized approval.
      </p>
    </div>
  );
}

// ── POS Refund Credit Note ────────────────────────────────────────────────────

interface PosRefundCreditNoteProps {
  refund: PosRefund;
  items?: Array<{
    item_name: string;
    item_code?: string;
    quantity: number;
    unit_price: number;
    variation?: { sku?: string; name?: string };
  }>;
}

export function PosRefundCreditNote({ refund, items = [] }: PosRefundCreditNoteProps) {
  return (
    <div className="credit-note bg-white text-gray-900 p-8 max-w-2xl mx-auto font-sans text-sm print:p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">CREDIT NOTE</h1>
          <p className="text-xs text-gray-500 mt-0.5">POS Refund Receipt</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg font-mono">{refund.refund_number}</p>
          <p className="text-xs text-gray-500">Date: {fmtDate(refund.refund_date)}</p>
        </div>
      </div>

      {/* Reference */}
      <div className="bg-gray-50 rounded p-3 mb-5 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Original Order:</span>{' '}
          <span className="font-semibold">{refund.pos_order?.order_number ?? `#${refund.pos_order_id}`}</span>
        </div>
        <div>
          <span className="text-gray-500">Refund Method:</span>{' '}
          <span className="capitalize">{refund.refund_method?.replace(/_/g, ' ') ?? '-'}</span>
        </div>
        <div>
          <span className="text-gray-500">Reason:</span>{' '}
          <span className="capitalize">{refund.refund_reason?.replace(/_/g, ' ') ?? '-'}</span>
        </div>
        {refund.reason_details && (
          <div className="col-span-2">
            <span className="text-gray-500">Details:</span>{' '}
            <span>{refund.reason_details}</span>
          </div>
        )}
      </div>

      {/* Items table */}
      {items.length > 0 && (
        <table className="w-full border-collapse text-xs mb-5">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left border border-gray-200 px-2 py-1.5 font-semibold">#</th>
              <th className="text-left border border-gray-200 px-2 py-1.5 font-semibold">Item</th>
              <th className="text-right border border-gray-200 px-2 py-1.5 font-semibold">Qty</th>
              <th className="text-right border border-gray-200 px-2 py-1.5 font-semibold">Unit Price</th>
              <th className="text-right border border-gray-200 px-2 py-1.5 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="even:bg-gray-50">
                <td className="border border-gray-200 px-2 py-1 text-center">{i + 1}</td>
                <td className="border border-gray-200 px-2 py-1">
                  <span className="font-medium">{item.item_name}</span>
                  {item.variation?.name && (
                    <span className="text-gray-500"> / {item.variation.name}</span>
                  )}
                </td>
                <td className="border border-gray-200 px-2 py-1 text-right">{fmt(item.quantity)}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">{fmt(item.unit_price)}</td>
                <td className="border border-gray-200 px-2 py-1 text-right font-semibold">
                  {fmt(item.quantity * item.unit_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Summary */}
      <div className="flex justify-end mb-6">
        <div className="w-56 text-xs space-y-1">
          <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-1">
            <span>Refund Total</span>
            <span className="font-mono">{fmt(refund.total_refund_amount)}</span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-200 pt-3">
        <div>
          {refund.approved_by_user && (
            <span>Approved by: <strong>{refund.approved_by_user.name}</strong></span>
          )}
        </div>
        <div className="text-right">
          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold capitalize">
            {refund.status}
          </span>
        </div>
      </div>

      <p className="text-center text-gray-400 text-xs mt-6">
        Thank you for your business. This credit note is valid upon authorized approval.
      </p>
    </div>
  );
}
