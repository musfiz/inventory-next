import { formatDate } from '@/lib/utils/date';

interface PurchaseOrderInvoiceProps {
  po: {
    id: number;
    po_number: string;
    order_date: string;
    expected_delivery_date?: string;
    status: string;
    payment_status: string;
    sub_total: number;
    discount_amount?: number;
    discount_percentage?: number;
    vat?: number;
    shipping_charge?: number;
    total_amount: number;
    paid_amount?: number;
    notes?: string;
    supplier?: {
      id: number;
      name: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    warehouse?: {
      id: number;
      name: string;
      address?: string;
    };
    items?: Array<{
      id: number;
      product_id: number;
      variation_id?: number;
      product?: { name: string; sku?: string };
      variation?: { name: string };
      quantity_ordered: number;
      quantity_received: number;
      unit_cost: number;
    }>;
  };
}

export default function PurchaseOrderInvoice({ po }: PurchaseOrderInvoiceProps) {
  const calculateVatAmount = () => {
    const taxableAmount = (po.sub_total ?? 0) - (po.discount_amount ?? 0);
    return taxableAmount * ((po.vat ?? 0) / 100);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      ordered: 'bg-blue-100 text-blue-800',
      partial: 'bg-orange-100 text-orange-800',
      received: 'bg-teal-100 text-teal-800',
      completed: 'bg-green-200 text-green-900',
      cancelled: 'bg-red-100 text-red-800',
    };
    const cls = map[status] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="invoice-content bg-white p-10">
      {/* Invoice Header */}
      <div className="border-b-4 border-blue-600 pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">PURCHASE ORDER</h1>
            <p className="text-sm text-gray-600">
              Order Number: <span className="font-semibold text-gray-800">{po.po_number}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600 mb-2">Your Company</div>
            <p className="text-sm text-gray-600">
              123 Business Street
              <br />
              City, State 12345
              <br />
              Phone: (123) 456-7890
              <br />
              Email: info@company.com
            </p>
          </div>
        </div>
      </div>

      {/* Order Details & Supplier Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Supplier Info */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Supplier</h3>
          <div className="text-sm">
            <p className="font-bold text-gray-800 text-lg mb-2">{po.supplier?.name || 'N/A'}</p>
            {po.supplier?.address && <p className="text-gray-600 mb-1">{po.supplier.address}</p>}
            {po.supplier?.phone && <p className="text-gray-600 mb-1">Phone: {po.supplier.phone}</p>}
            {po.supplier?.email && <p className="text-gray-600">Email: {po.supplier.email}</p>}
          </div>
        </div>

        {/* Order Details */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Order Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Date:</span>
              <span className="font-medium text-gray-800">{formatDate(po.order_date, 'DD/MM/YYYY')}</span>
            </div>
            {po.expected_delivery_date && (
              <div className="flex justify-between">
                <span className="text-gray-600">Expected Delivery:</span>
                <span className="font-medium text-gray-800">
                  {formatDate(po.expected_delivery_date, 'DD/MM/YYYY')}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span>{getStatusBadge(po.status)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Status:</span>
              <span className="font-medium capitalize text-gray-800">{po.payment_status || 'Pending'}</span>
            </div>
            {po.warehouse && (
              <div className="flex justify-between">
                <span className="text-gray-600">Warehouse:</span>
                <span className="font-medium text-gray-800">{po.warehouse.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-y-2 border-gray-300">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">#</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Product</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Variation</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Qty Ordered</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Unit Cost</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {po.items && po.items.length > 0 ? (
              po.items.map((item, idx) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="py-3 px-4 text-sm text-gray-700">{idx + 1}</td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    <div className="font-medium">{item.product?.name || 'N/A'}</div>
                    {item.product?.sku && <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">{item.variation?.name || '-'}</td>
                  <td className="py-3 px-4 text-sm text-gray-700 text-right">
                    {Math.abs(item.quantity_ordered)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 text-right">
                    {Number(item.unit_cost ?? 0).toFixed(4)}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-800 text-right">
                    {(Math.abs(item.quantity_ordered) * Number(item.unit_cost ?? 0)).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mb-8">
        <div className="w-80 border border-gray-200 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-800">{Number(po.sub_total ?? 0).toFixed(2)}</span>
            </div>

            {po.discount_amount && po.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Discount {po.discount_percentage ? `(${po.discount_percentage}%)` : ''}:</span>
                <span className="font-medium">-{Number(po.discount_amount).toFixed(2)}</span>
              </div>
            )}

            {po.vat && po.vat > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT ({po.vat}%):</span>
                <span className="font-medium text-gray-800">{calculateVatAmount().toFixed(2)}</span>
              </div>
            )}

            {po.shipping_charge && po.shipping_charge > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping:</span>
                <span className="font-medium text-gray-800">{Number(po.shipping_charge).toFixed(2)}</span>
              </div>
            )}

            <div className="border-t-2 border-gray-300 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-base font-bold text-gray-800">Grand Total:</span>
                <span className="text-lg font-bold text-blue-600">{Number(po.total_amount ?? 0).toFixed(2)}</span>
              </div>
            </div>

            {po.paid_amount !== undefined && po.paid_amount > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Paid Amount:</span>
                  <span className="font-medium text-green-600">{Number(po.paid_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                  <span className="text-gray-600">Balance Due:</span>
                  <span className="font-bold text-red-600">
                    {(Number(po.total_amount ?? 0) - Number(po.paid_amount)).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {po.notes && (
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes:</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{po.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 pt-6 text-center">
        <p className="text-xs text-gray-500">Thank you for your business!</p>
        <p className="text-xs text-gray-400 mt-2">This is a computer-generated document. No signature is required.</p>
      </div>
    </div>
  );
}
