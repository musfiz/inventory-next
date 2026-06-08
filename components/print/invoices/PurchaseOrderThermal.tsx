import { formatDate } from '@/lib/utils/date';

interface PurchaseOrderThermalProps {
  po: {
    po_number: string;
    order_date: string;
    expected_delivery_date?: string;
    total_amount: number;
    sub_total: number;
    discount_amount?: number;
    vat?: number;
    shipping_charge?: number;
    paid_amount?: number;
    supplier?: {
      name: string;
      phone?: string;
    };
    warehouse?: {
      name: string;
    };
    items?: Array<{
      id: number;
      product?: { name: string; sku?: string };
      variation?: { name: string };
      quantity_ordered: number;
      unit_cost: number;
    }>;
  };
}

export default function PurchaseOrderThermal({ po }: PurchaseOrderThermalProps) {
  const vatAmount = ((po.sub_total ?? 0) - (po.discount_amount ?? 0)) * ((po.vat ?? 0) / 100);

  return (
    <div className="pos-invoice-content bg-white text-black p-4 mx-auto font-mono text-xs leading-5">
      <div className="text-center border-b border-dashed border-black pb-3 mb-3">
        <div className="text-base font-bold tracking-wide">PURCHASE ORDER</div>
        <div>POS PRINT FORMAT</div>
      </div>

      <div className="space-y-1 border-b border-dashed border-black pb-3 mb-3">
        <div className="flex justify-between gap-3">
          <span>PO No</span>
          <span className="text-right">{po.po_number}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Date</span>
          <span className="text-right">{formatDate(po.order_date, 'DD/MM/YYYY')}</span>
        </div>
        {po.expected_delivery_date && (
          <div className="flex justify-between gap-3">
            <span>Expected</span>
            <span className="text-right">{formatDate(po.expected_delivery_date, 'DD/MM/YYYY')}</span>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <span>Supplier</span>
          <span className="text-right">{po.supplier?.name || '-'}</span>
        </div>
        {po.supplier?.phone && (
          <div className="flex justify-between gap-3">
            <span>Phone</span>
            <span className="text-right">{po.supplier.phone}</span>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <span>Warehouse</span>
          <span className="text-right">{po.warehouse?.name || '-'}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-black pb-2 mb-2">
        <div className="grid grid-cols-[1fr_auto] gap-2 font-bold mb-1">
          <span>Item</span>
          <span>Amt</span>
        </div>
        {po.items && po.items.length > 0 ? (
          po.items.map(item => {
            const title = item.variation?.name
              ? `${item.product?.name || 'Item'} (${item.variation.name})`
              : item.product?.name || 'Item';

            return (
              <div key={item.id} className="mb-2">
                <div className="flex justify-between gap-2">
                  <span className="pr-2">{title}</span>
                  <span>{(Math.abs(item.quantity_ordered) * Number(item.unit_cost ?? 0)).toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-gray-700">
                  {Math.abs(item.quantity_ordered)} x {Number(item.unit_cost ?? 0).toFixed(4)}
                  {item.product?.sku ? ` | SKU: ${item.product.sku}` : ''}
                </div>
              </div>
            );
          })
        ) : (
          <div>No items found</div>
        )}
      </div>

      <div className="space-y-1 border-b border-dashed border-black pb-3 mb-3">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{Number(po.sub_total ?? 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount</span>
          <span>-{Number(po.discount_amount ?? 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>VAT</span>
          <span>{vatAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span>{Number(po.shipping_charge ?? 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm pt-1">
          <span>Total</span>
          <span>{Number(po.total_amount ?? 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid</span>
          <span>{Number(po.paid_amount ?? 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Due</span>
          <span>{(Number(po.total_amount ?? 0) - Number(po.paid_amount ?? 0)).toFixed(2)}</span>
        </div>
      </div>

      <div className="text-center text-[11px] pt-1">
        <div>Printed on {formatDate(new Date().toISOString(), 'DD/MM/YYYY')}</div>
        <div>Thank you</div>
      </div>
    </div>
  );
}