'use client';

import { useRef, useState } from 'react';
import { notify } from '@/lib/notifications';
import { PrintMenu } from './PrintMenu';
import { CreditNoteA4 } from './invoices/CreditNoteA4';
import { CreditNoteThermal } from './invoices/CreditNoteThermal';
import { posRefundService } from '@/services';
import type { PosRefund } from '@/services/posRefundService';

interface PosRefundPrintMenuProps {
  refundDoc: PosRefund;
}

function mapToSalesReturnShape(refund: PosRefund): any {
  const po = (refund as any).pos_order ?? {};
  return {
    return_number: refund.refund_number,
    return_date: refund.refund_date,
    status: refund.status,
    reason: refund.refund_reason,
    refund_method: refund.refund_method,
    notes: refund.reason_details,
    total_amount: refund.total_refund_amount,
    refund_amount: refund.total_refund_amount,
    items: (refund.items ?? []).map((item: any) => ({
      id: item.id,
      product: item.product,
      item_name: (item.product as any)?.name ?? `Product #${item.product_id}`,
      quantity_returned: Number(item.quantity_returned),
      unit_price: Number(item.unit_price),
      variation: item.variation,
      condition: item.condition,
      line_total: Number(item.quantity_returned) * Number(item.unit_price),
    })),
    sales_order: {
      invoice_number: po.invoice_number ?? po.order_number,
      tenant: po.tenant ?? null,
      customer: po.customer ?? null,
    },
    approver: (refund as any).approved_by_user ?? null,
    approved_at: (refund as any).approved_at ?? null,
  };
}

export function PosRefundPrintMenu({ refundDoc }: PosRefundPrintMenuProps) {
  const [fullRefund, setFullRefund] = useState<PosRefund | null>(null);
  const cachedIdRef = useRef<number | null>(null);

  const current = fullRefund ?? refundDoc;
  const mapped = mapToSalesReturnShape(current);

  const ensureData = async (): Promise<boolean> => {
    const id = refundDoc?.id;
    if (!id) {
      notify.error('Cannot print — refund is missing its ID.');
      return false;
    }
    if (cachedIdRef.current === id && fullRefund) return true;
    try {
      const detail = await posRefundService.show(id);
      if (!detail) {
        notify.error('Failed to load refund details.');
        return false;
      }
      cachedIdRef.current = id;
      setFullRefund(detail);
      return true;
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load refund for printing.');
      return false;
    }
  };

  return (
    <PrintMenu
      documentTitle="Credit Note"
      ensureData={ensureData}
      renderA4={() => <CreditNoteA4 returnDoc={mapped} />}
      renderThermal={(w, cl) => <CreditNoteThermal returnDoc={mapped} width={w} copyLabel={cl} />}
    />
  );
}
