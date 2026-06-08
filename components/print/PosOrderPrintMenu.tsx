'use client';

import { useRef, useState } from 'react';
import { notify } from '@/lib/notifications';
import { PrintMenu } from './PrintMenu';
import { PosOrderInvoiceA4 } from './invoices/PosOrderInvoiceA4';
import { PosOrderInvoiceThermal } from './invoices/PosOrderInvoiceThermal';
import posService from '@/services/posService';

interface PosOrderPrintMenuProps {
  /** POS order row (lightweight list item or full detail). */
  order: any;
  /**
   * When true the component treats `order` as the full detail and
   * auto-triggers a thermal print on mount (post-sale flow).
   */
  autoPrint?: boolean;
  /** Pre-resolved thermal paper size (from post-sale payment response). */
  paperSize?: '80mm' | '58mm';
}

/**
 * POS Order print action bar.
 *
 * Supports two modes:
 *  1. **List mode** — lightweight row; lazy-loads full detail on first print.
 *  2. **Post-sale auto-print** — `autoPrint=true`; fires thermal immediately.
 *
 * Uses the unified PrintMenu for all print mechanics + store-driven defaults.
 */
export function PosOrderPrintMenu({ order, autoPrint = false, paperSize }: PosOrderPrintMenuProps) {
  const [fullOrder, setFullOrder] = useState<any | null>(null);
  const cachedUuidRef = useRef<string | null>(null);

  const currentOrder = fullOrder ?? order;

  const ensureData = async (): Promise<boolean> => {
    // In auto-print mode the caller already provides the full detail.
    if (autoPrint) return true;
    const uuid = order?.uuid;
    if (!uuid) {
      notify.error('Cannot print — POS order is missing its UUID.');
      return false;
    }
    if (cachedUuidRef.current === uuid && fullOrder) return true;
    try {
      const detail = await posService.getPosOrder(uuid);
      cachedUuidRef.current = uuid;
      setFullOrder(detail);
      return true;
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load POS order for printing.');
      return false;
    }
  };

  return (
    <PrintMenu
      documentTitle="POS Invoice"
      autoThermal={autoPrint}
      paperSizeOverride={paperSize}
      ensureData={ensureData}
      renderA4={() => <PosOrderInvoiceA4 order={currentOrder} />}
      renderThermal={(w, cl) => (
        <PosOrderInvoiceThermal order={currentOrder} width={w} copyLabel={cl} />
      )}
    />
  );
}
