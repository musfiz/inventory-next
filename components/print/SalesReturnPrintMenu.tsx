'use client';

import { useRef, useState } from 'react';
import { notify } from '@/lib/notifications';
import { PrintMenu } from './PrintMenu';
import { CreditNoteA4 } from './invoices/CreditNoteA4';
import { CreditNoteThermal } from './invoices/CreditNoteThermal';
import salesReturnService from '@/services/salesReturnService';

interface SalesReturnPrintMenuProps {
  returnDoc: any;
}

export function SalesReturnPrintMenu({ returnDoc }: SalesReturnPrintMenuProps) {
  const [fullReturn, setFullReturn] = useState<any | null>(null);
  const cachedIdRef = useRef<number | null>(null);

  const currentReturn = fullReturn ?? returnDoc;

  const ensureData = async (): Promise<boolean> => {
    const id = returnDoc?.id;
    if (!id) {
      notify.error('Cannot print — sales return is missing its ID.');
      return false;
    }
    if (cachedIdRef.current === id && fullReturn) return true;
    try {
      const detail = await salesReturnService.show(id);
      cachedIdRef.current = id;
      setFullReturn(detail);
      return true;
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load return for printing.');
      return false;
    }
  };

  return (
    <PrintMenu
      documentTitle="Credit Note"
      ensureData={ensureData}
      renderA4={() => <CreditNoteA4 returnDoc={currentReturn} />}
      renderThermal={(w, cl) => <CreditNoteThermal returnDoc={currentReturn} width={w} copyLabel={cl} />}
    />
  );
}
