'use client';

import { useState } from 'react';
import { notify } from '@/lib/notifications';
import { PrintMenu } from './PrintMenu';
import { PayReceiptA4 } from './invoices/PayReceiptA4';
import { PayReceiptThermal } from './invoices/PayReceiptThermal';
import type { Payment, ReceiptOrderItem } from '@/types/api.types';
import type { PrintOrderItem } from './invoices/shared';
import { paymentService } from '@/services';
import posService from '@/services/posService';
import salesOrderService from '@/services/salesOrderService';

interface PayReceiptPrintMenuProps {
  /** Payment row from the list (may be a lightweight object). */
  payment: Payment;
}

/**
 * Payment Receipt print action bar.
 *
 * Loads the full payment + linked order line items on first print click,
 * then presents the unified PrintMenu with a copy-type/width modal for
 * thermal prints.
 */
export function PayReceiptPrintMenu({ payment }: PayReceiptPrintMenuProps) {
  const [full, setFull] = useState<Payment | null>(null);
  const [orderItems, setOrderItems] = useState<PrintOrderItem[] | null>(null);
  const [orderSummary, setOrderSummary] = useState<{
    sub_total?: number | null;
    discount_amount?: number | null;
    discount_type?: string | null;
    discount_value?: number | null;
    tax_amount?: number | null;
    grand_total?: number | null;
  } | null>(null);

  const data = full ?? payment;

  // ── Data loading ────────────────────────────────────────────────────────

  const mapItem = (it: ReceiptOrderItem): PrintOrderItem => {
    const qty   = Number(it.quantity   ?? 0);
    const price = Number(it.unit_price ?? 0);
    const disc  = Number(it.discount_amount ?? it.discount ?? 0);
    const tax   = (qty * price * Number(it.tax_rate ?? 0)) / 100;
    return {
      id: it.id,
      name: it.item_name ?? (it as any).product?.name ?? 'Item',
      variant: (it as any).variation?.name ?? null,
      sku: (it as any).variation?.sku ?? (it as any).product?.code ?? (it as any).product?.sku ?? null,
      quantity: qty,
      unit_price: price,
      discount: disc,
      tax_rate: Number(it.tax_rate ?? 0),
      line_total: qty * price - disc + tax,
    };
  };

  const applyOrder = (order: any, items: ReceiptOrderItem[]) => {
    setOrderItems(items.map(mapItem));
    setOrderSummary({
      sub_total:       order.sub_total,
      discount_amount: order.discount_amount,
      discount_type:   order.discount_type,
      discount_value:  order.discount_value,
      tax_amount:      order.tax_amount,
      grand_total:     order.grand_total,
    });
  };

  const ensureData = async (): Promise<boolean> => {
    if (full) return true;
    try {
      const referenceType: string | undefined =
        payment.reference_type ??
        (payment.pos_order_id   ? 'pos'   :
         payment.sales_order_id ? 'sales' : undefined);

      const f = payment.uuid
        ? await paymentService.receiptByUuid(payment.uuid, referenceType)
        : await paymentService.receipt(payment.id, referenceType);
      setFull(f);

      const linkedOrder = f.salesOrder ?? f.posOrder ?? null;

      if (linkedOrder?.items && linkedOrder.items.length > 0) {
        applyOrder(linkedOrder, linkedOrder.items as ReceiptOrderItem[]);
      } else if (f.pos_order_id) {
        try {
          const ord: any = (linkedOrder as any)?.uuid
            ? await posService.getPosOrder(String((linkedOrder as any).uuid))
            : await posService.getPosOrder(String(f.pos_order_id));
          applyOrder({ ...(linkedOrder ?? {}), ...ord }, (ord.items ?? []) as ReceiptOrderItem[]);
        } catch {
          setOrderItems([]);
        }
      } else if (f.sales_order_id) {
        try {
          const ord: any = await salesOrderService.getSalesOrder(String(f.sales_order_id));
          const rawItems = ord.items ?? await salesOrderService.getSalesOrderItems(String(f.sales_order_id));
          applyOrder({ ...(linkedOrder ?? {}), ...ord }, (rawItems ?? []) as ReceiptOrderItem[]);
        } catch {
          setOrderItems([]);
        }
      } else {
        setOrderItems([]);
      }

      return true;
    } catch (err) {
      notify.error('Failed to load payment details for printing');
      return false;
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <PrintMenu
      documentTitle="Pay Receipt"
      withCopyModal
      ensureData={ensureData}
      renderA4={() => (
        <PayReceiptA4
          payment={data}
          copyLabel={null}
          orderItems={orderItems}
          orderSummary={orderSummary}
        />
      )}
      renderThermal={(w, cl) => (
        <PayReceiptThermal
          payment={data}
          width={w}
          copyLabel={cl}
          orderItems={orderItems}
          orderSummary={orderSummary}
        />
      )}
    />
  );
}
