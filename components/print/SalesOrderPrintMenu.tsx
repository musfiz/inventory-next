'use client';

import { useRef, useState } from 'react';
import { notify } from '@/lib/notifications';
import { PrintMenu } from './PrintMenu';
import { SalesOrderInvoiceA4 } from './invoices/SalesOrderInvoiceA4';
import { SalesOrderInvoiceThermal } from './invoices/SalesOrderInvoiceThermal';
import salesOrderService from '@/services/salesOrderService';

interface SalesOrderPrintMenuProps {
  /** Sales order row (lightweight list item or full detail). */
  order: any;
  /** Pre-resolved thermal paper size from the parent (optional). */
  paperSize?: '80mm' | '58mm';
}

/**
 * Sales Order print action bar.
 * Lazy-loads the full SO detail (with items + payments) on first print.
 * Uses the unified PrintMenu for buttons, refs, and openPrint mechanics.
 */
export function SalesOrderPrintMenu({ order, paperSize }: SalesOrderPrintMenuProps) {
  const [fullOrder, setFullOrder] = useState<any | null>(null);
  const cachedUuidRef = useRef<string | null>(null);

  const currentOrder = fullOrder ?? order;

  const ensureData = async (): Promise<boolean> => {
    const uuid = order?.uuid;
    if (!uuid) {
      notify.error('Cannot print — sales order is missing its UUID.');
      return false;
    }
    if (cachedUuidRef.current === uuid && fullOrder) return true;
    try {
      const detail = await salesOrderService.getSalesOrderForPrint(uuid);
      cachedUuidRef.current = uuid;
      setFullOrder(detail);
      return true;
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load sales order for printing.');
      return false;
    }
  };

  return (
    <PrintMenu
      documentTitle="Sales Order Invoice"
      paperSizeOverride={paperSize}
      ensureData={ensureData}
      renderA4={() => <SalesOrderInvoiceA4 order={currentOrder} />}
      renderThermal={(w, cl) => (
        <SalesOrderInvoiceThermal order={currentOrder} width={w} copyLabel={cl} />
      )}
    />
  );
}
