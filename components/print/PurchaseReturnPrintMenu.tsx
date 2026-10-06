'use client';

import { useRef, useState } from 'react';
import purchaseReturnService from '@/services/purchaseReturnService';
import { notify } from '@/lib/notifications';
import { PrintMenu } from './PrintMenu';
import { DebitNoteA4 } from './invoices/DebitNoteA4';
import { DebitNoteThermal } from './invoices/DebitNoteThermal';

interface PurchaseReturnPrintMenuProps {
  returnDoc: any;
}

/**
 * Print trigger for a purchase return — the debit note sent to the vendor.
 *
 * The list endpoint returns returns without their items, so the full document
 * is fetched lazily on the first print and cached per id. Mirrors
 * SalesReturnPrintMenu.
 */
export function PurchaseReturnPrintMenu({ returnDoc }: PurchaseReturnPrintMenuProps) {
  const [fullReturn, setFullReturn] = useState<any | null>(null);
  const cachedIdRef = useRef<string | null>(null);

  const currentReturn = fullReturn ?? returnDoc;

  const ensureData = async (): Promise<boolean> => {
    const id = returnDoc?.id;
    if (!id) {
      notify.error('Cannot print — purchase return is missing its ID.');
      return false;
    }
    if (cachedIdRef.current === id && fullReturn) return true;
    try {
      const detail = await purchaseReturnService.show(id);
      cachedIdRef.current = id;
      setFullReturn(detail);
      return true;
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load purchase return for printing.');
      return false;
    }
  };

  return (
    <PrintMenu
      documentTitle="Debit Note"
      ensureData={ensureData}
      renderA4={() => <DebitNoteA4 returnDoc={currentReturn} />}
      renderThermal={(w, cl) => (
        // The copy labels differ from a credit note: the first copy is the
        // vendor's, not a customer's.
        <DebitNoteThermal
          returnDoc={currentReturn}
          width={w}
          copyLabel={cl === 'customer' ? 'vendor' : cl}
        />
      )}
    />
  );
}

export default PurchaseReturnPrintMenu;
